import { fail, text } from "../domain/model.mjs";
import {
  first,
  stmt,
  now,
  uuid,
  getQuote,
  quoteView,
  checkVersion,
} from "../infrastructure/database.mjs";
import { safeMapUrl } from "../../../../packages/domain/business-profile.mjs";

const defaults = {
  legalName: "",
  cnpj: "",
  registeredAddress: "",
  visitAddress: "",
  mapsUrl: "",
  arrivalNote: "",
  publishIdentity: false,
  publishVisitAddress: false,
};
const lengths = {
  legalName: 160,
  cnpj: 24,
  registeredAddress: 500,
  visitAddress: 500,
  mapsUrl: 1200,
  arrivalNote: 500,
};

export async function businessProfile(env) {
  const row = await first(env, "SELECT * FROM business_profile WHERE id=1");
  if (!row) fail(503, "O cadastro do local precisa ser atualizado.");
  return {
    ...defaults,
    ...JSON.parse(row.data_json),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

export async function publicBusiness(env) {
  const p = await businessProfile(env);
  // Explicit projection: never spread a private profile into a public response.
  return {
    supplier: p.publishIdentity
      ? { legalName: p.legalName, cnpj: p.cnpj }
      : null,
    location: null,
  };
}

export async function saveBusinessProfile(env, body) {
  const previous = await businessProfile(env);
  checkVersion(body, previous);
  const p = {};
  for (const [key, max] of Object.entries(lengths)) {
    if (typeof body[key] !== "string" || body[key].length > max)
      fail(400, "Confira o campo " + key + " e seu limite de tamanho.");
    p[key] = text(body[key], max);
  }
  for (const key of ["publishIdentity", "publishVisitAddress"]) {
    if (typeof body[key] !== "boolean")
      fail(400, "Confira as opções de publicação.");
    p[key] = body[key];
  }
  // Legacy publication flags must never expose a location. Share it per order.
  p.publishVisitAddress = false;
  p.cnpj = p.cnpj.toUpperCase();
  if (p.cnpj && !/^[A-Z0-9]{12}[0-9]{2}$/.test(p.cnpj.replace(/[.\/-]/g, "")))
    fail(400, "Copie o CNPJ completo do documento, com 14 posições.");
  if (p.mapsUrl) {
    const url = safeMapUrl(p.mapsUrl);
    if (!url)
      fail(
        400,
        "Use um link HTTPS de mapa do Google Maps, Waze ou Apple Maps.",
      );
    p.mapsUrl = url;
  }
  if (p.publishIdentity && (!p.legalName || !p.cnpj))
    fail(400, "Para publicar, preencha nome empresarial e CNPJ.");
  const op = uuid(),
    stamp = now();
  const result = await env.DB.batch([
    stmt(
      env,
      "UPDATE business_profile SET data_json=?,version=version+1,updated_at=?,last_op=? WHERE id=1 AND version=?",
      JSON.stringify(p),
      stamp,
      op,
      body.version,
    ),
    stmt(
      env,
      "INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) SELECT ?,'business','1','profile_updated',?,?,? FROM business_profile WHERE id=1 AND last_op=?",
      uuid(),
      JSON.stringify({
        publishIdentity: p.publishIdentity,
        publishVisitAddress: p.publishVisitAddress,
      }),
      stamp,
      env.ADMIN_SESSION?.id || "server",
      op,
    ),
  ]);
  if (result[0].meta.changes !== 1)
    fail(409, "O cadastro mudou. Atualize a página antes de salvar.");
  return businessProfile(env);
}

export async function shareQuoteLocation(env, id, body) {
  const q = await getQuote(env, id);
  checkVersion(body, q);
  if (!["share", "revoke"].includes(body.action))
    fail(400, "Escolha liberar ou retirar o endereço deste pedido.");
  let location = null;
  if (body.action === "share") {
    if (["cancelled", "declined"].includes(q.status))
      fail(
        409,
        "Este pedido está encerrado. Combine um novo atendimento antes de liberar o local.",
      );
    const p = await businessProfile(env);
    if (body.profileVersion !== p.version)
      fail(
        409,
        "O endereço cadastrado mudou. Reabra o pedido para conferir o local.",
      );
    if (!p.visitAddress)
      fail(400, "Cadastre o local de atendimento em Dados do painel.");
    location = {
      address: p.visitAddress,
      mapsUrl: p.mapsUrl,
      arrivalNote: p.arrivalNote,
      sharedAt: now(),
    };
  }
  const op = uuid(),
    stamp = now(),
    message = location
      ? "Local e orientações de chegada disponíveis no acompanhamento. Combine a agenda com Mateus antes de se deslocar."
      : "As orientações de chegada foram retiradas deste acompanhamento. Fale com Mateus para confirmar o local.";
  const result = await env.DB.batch([
    stmt(
      env,
      "UPDATE quotes SET location_json=?,version=version+1,updated_at=?,last_op=? WHERE id=? AND version=?",
      location ? JSON.stringify(location) : null,
      stamp,
      op,
      id,
      q.version,
    ),
    stmt(
      env,
      "INSERT INTO quote_events(id,quote_id,status,message,created_at) SELECT ?,id,status,?,? FROM quotes WHERE id=? AND last_op=?",
      uuid(),
      message,
      stamp,
      id,
      op,
    ),
    stmt(
      env,
      "INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) SELECT ?,'quote',id,?,'',?,? FROM quotes WHERE id=? AND last_op=?",
      uuid(),
      location ? "location_shared" : "location_revoked",
      stamp,
      env.ADMIN_SESSION?.id || "server",
      id,
      op,
    ),
  ]);
  if (result[0].meta.changes !== 1)
    fail(409, "Este pedido mudou. Atualize antes de liberar o local.");
  return quoteView(await getQuote(env, id), true);
}
