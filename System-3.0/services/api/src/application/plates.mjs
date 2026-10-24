import { fail, text, requirePlate } from "../domain/model.mjs";
import {
  stmt,
  now,
  uuid,
  getSub,
  getQuote,
  quoteView,
  subView,
  checkVersion,
} from "../infrastructure/database.mjs";

export function requireRegisteredVehicle(record) {
  if (!record?.plate || !record.plate_verified_at)
    fail(
      409,
      "Confira o veículo pessoalmente e cadastre a placa no painel antes de iniciar o atendimento ou ativar/utilizar o Care.",
    );
  return record.plate;
}
function registration(body, record) {
  const plate = requirePlate(body.plate),
    reason = text(body.reason, 300);
  if (body.confirm !== true)
    fail(400, "Confirme que você conferiu esta placa pessoalmente no veículo.");
  if (record.plate_verified_at && record.plate !== plate && reason.length < 5)
    fail(400, "Informe o motivo da correção da placa já cadastrada.");
  return {
    plate,
    reason: reason || "Cadastro após conferência presencial do veículo.",
  };
}
export async function registerQuotePlate(env, id, body) {
  const q = await getQuote(env, id);
  checkVersion(body, q);
  if (q.kind === "subscription_visit" || q.subscription_id)
    fail(
      400,
      "Este pedido usa o vínculo do Care. Gerencie o cadastro na assinatura e confira a placa em cada visita.",
    );
  if (["completed", "declined", "cancelled"].includes(q.status))
    fail(
      400,
      "O veículo deste pedido encerrado permanece no histórico. Prepare um novo pedido para outro atendimento.",
    );
  const { plate, reason } = registration(body, q),
    stamp = now(),
    op = uuid(),
    actor = env.ADMIN_SESSION?.id || "server";
  const selection = {
    ...JSON.parse(q.selection_json),
    plate,
    plateVerified: true,
  };
  const result = await env.DB.batch([
    stmt(
      env,
      `UPDATE quotes SET plate=?,plate_verified_at=?,plate_verified_by=?,selection_json=?,version=version+1,last_op=?,updated_at=?
   WHERE id=? AND version=? AND subscription_id IS NULL AND kind!='subscription_visit' AND status NOT IN ('completed','declined','cancelled')`,
      plate,
      stamp,
      actor,
      JSON.stringify(selection),
      op,
      stamp,
      id,
      q.version,
    ),
    stmt(
      env,
      `INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id)
   SELECT ?,'quote',id,'vehicle_registered',?,?,? FROM quotes WHERE id=? AND last_op=?`,
      uuid(),
      JSON.stringify({ previousPlate: q.plate || null, plate, reason }),
      stamp,
      actor,
      id,
      op,
    ),
    stmt(
      env,
      `INSERT INTO quote_events(id,quote_id,status,message,created_at)
   SELECT ?,id,status,?,? FROM quotes WHERE id=? AND last_op=?`,
      uuid(),
      "Veículo conferido presencialmente. Placa cadastrada: " + plate + ".",
      stamp,
      id,
      op,
    ),
  ]);
  if (result[0].meta.changes !== 1)
    fail(409, "O pedido mudou. Recarregue antes de cadastrar a placa.");
  return quoteView(await getQuote(env, id), true);
}
export async function changePlate(env, id, body) {
  const s = await getSub(env, id);
  checkVersion(body, s);
  if (s.status === "cancelled")
    fail(
      400,
      "A placa de uma assinatura cancelada faz parte do histórico. Cadastre um novo Care.",
    );
  const { plate, reason } = registration(body, s);
  const initial = !s.plate_verified_at && (!s.plate || plate === s.plate);
  const stamp = now(),
    op = uuid(),
    actor = env.ADMIN_SESSION?.id || "server";
  // Initial physical confirmation can preserve open legacy appointments. A later
  // correction waits until outstanding requests and reservations are resolved.
  const guard = initial
    ? ""
    : `AND NOT EXISTS(SELECT 1 FROM quotes WHERE subscription_id=subscriptions.id AND kind='subscription_visit' AND status IN ('pending','accepted','in_progress','ready'))
   AND NOT EXISTS(SELECT 1 FROM visits v JOIN cycles c ON c.id=v.cycle_id WHERE c.subscription_id=subscriptions.id AND v.status IN ('scheduled','in_progress'))`;
  const batch = [
    stmt(
      env,
      `UPDATE subscriptions SET plate=?,plate_verified_at=?,plate_verified_by=?,version=version+1,last_op=?,updated_at=?
   WHERE id=? AND version=? AND status!='cancelled' ${guard}`,
      plate,
      stamp,
      actor,
      op,
      stamp,
      id,
      s.version,
    ),
    stmt(
      env,
      `INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id)
   SELECT ?,'subscription',id,'plate_changed',?,?,? FROM subscriptions WHERE id=? AND last_op=?`,
      uuid(),
      JSON.stringify({
        previousPlate: s.plate || null,
        plate,
        reason,
        physicalConfirmation: true,
      }),
      stamp,
      actor,
      id,
      op,
    ),
  ];
  if (initial) {
    batch.push(
      stmt(
        env,
        `UPDATE quotes SET plate=?,plate_verified_at=?,plate_verified_by=?,selection_json=json_set(selection_json,'$.plate',?,'$.plateVerified',json('true')),version=version+1,updated_at=?
   WHERE subscription_id=? AND kind='subscription_visit' AND status IN ('pending','accepted','in_progress','ready') AND plate_verified_at IS NULL AND (plate IS NULL OR plate=?)
   AND EXISTS(SELECT 1 FROM subscriptions WHERE id=? AND last_op=?)`,
        plate,
        stamp,
        actor,
        plate,
        stamp,
        id,
        plate,
        id,
        op,
      ),
    );
    batch.push(
      stmt(
        env,
        `UPDATE visits SET plate=?,version=version+1,updated_at=? WHERE cycle_id IN(SELECT id FROM cycles WHERE subscription_id=?)
   AND status IN ('scheduled','in_progress') AND plate IS NULL AND EXISTS(SELECT 1 FROM subscriptions WHERE id=? AND last_op=?)`,
        plate,
        stamp,
        id,
        id,
        op,
      ),
    );
  }
  let result;
  try {
    result = await env.DB.batch(batch);
  } catch (error) {
    if (/UNIQUE/.test(error.message || ""))
      fail(
        409,
        "Esta placa já está vinculada a outra assinatura ativa ou pausada. Confira os cadastros antes de ativar outro Care.",
      );
    throw error;
  }
  if (result[0].meta.changes !== 1)
    fail(
      409,
      "A assinatura mudou ou tem solicitações/visitas em aberto. Resolva esses atendimentos antes de corrigir a placa.",
    );
  return subView(env, await getSub(env, id), true);
}
