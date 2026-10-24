"use client";
import { useRef } from "react";
import { admin } from "../../services/api";
import { useResource } from "../../hooks/useResource";
import { useApp } from "../../components/layout/AppProvider";
import {
  Budget,
  Field,
  Loading,
  ErrorMessage,
  Location,
  Status,
} from "../../components/ui/primitives";
import {
  values,
  checked,
  FormArea,
  FormCheck,
  FormSelect,
  PaidCheck,
  useAdminAction,
} from "./admin.forms";
import {
  dateLabel,
  statusLabels,
  transitions,
  visitLabels,
} from "../../models/config";
import { plans, findPlan, money, todaySP } from "@domain/catalog.mjs";
import { registeredPlateLabel, plateLabel } from "@domain/plates.mjs";
import { locationMessage } from "@domain/business-profile.mjs";
import { copyText } from "../../services/browser.mjs";
import type { Detail } from "./AdminView";
import type {
  Subscription,
  Quote,
  QuoteDetail,
  BusinessProfile,
} from "../../models/entities";
type Shared = {
  changed: () => void;
  created: (id: string, token: string, path: string) => void;
};
export function QuoteEditor({
  id,
  changed,
  open,
  created,
}: { id: string; open: (d: Detail) => void } & Shared) {
  const r = useResource(
      async () => {
        const [quote, profile] = await Promise.all([
          admin.quote(id),
          admin.profile(),
        ]);
        return { ...quote, ...profile };
      },
      true,
      id,
    ),
    a = useAdminAction(),
    { toast } = useApp();
  const q = r.data?.quote,
    p = r.data?.profile;
  const after = async () => {
    await r.reload();
    changed();
  };
  if (!q || !p)
    return (
      <>
        <Loading />
        <ErrorMessage message={r.error} />
      </>
    );
  return (
    <>
      <ErrorMessage message={a.error || r.error} />
      <div className="system-actions">
        <strong>{q.reference}</strong>
        <Status value={q.status} />
      </div>
      <h3>{q.name}</h3>
      <p>
        {q.model} · <strong>{registeredPlateLabel(q)}</strong> ·{" "}
        <a
          href={"https://wa.me/" + q.phone}
          target="_blank"
          rel="noopener noreferrer"
        >
          {q.phone} ↗
        </a>
      </p>
      {q.notes && (
        <p className="system-note">Observação do cliente: {q.notes}</p>
      )}
      <Budget budget={q.budget} confirmedTotal={q.confirmedTotal} />
      <p>
        Preferência: {dateLabel(q.preferredDate)} ·{" "}
        {q.preferredTime || "A combinar"}
      </p>
      {q.kind !== "subscription_visit" && !q.subscriptionId && (
        <section className="system-card">
          <h3>
            {q.plateVerified
              ? "Cadastro do veículo."
              : "Conferir e cadastrar veículo."}
          </h3>
          <p>
            Confira a placa pessoalmente. Ela aparecerá no mesmo link do
            cliente.
          </p>
          <form
            key={"plate" + q.version}
            onSubmit={(e) =>
              a.form(e, async (f) => {
                await admin.mutate(
                  "quotes/" + id + "/plate",
                  {
                    ...values(f),
                    version: q.version,
                    confirm: checked(f, "confirm"),
                  },
                  "PATCH",
                );
                await after();
                toast("Veículo cadastrado.");
              })
            }
          >
            <fieldset disabled={a.busy} className="fieldset-clean">
              <Field
                label="Placa que conferi no veículo"
                name="plate"
                defaultValue={q.plate || ""}
                maxLength={9}
                required
                autoComplete="off"
              />
              <FormArea
                name="reason"
                label="Motivo do cadastro ou da correção"
                maxLength={300}
              />
              <FormCheck
                name="confirm"
                label="Conferi esta placa pessoalmente no veículo."
                required
              />
              <button className="button orange" type="submit">
                Salvar placa
              </button>
            </fieldset>
          </form>
        </section>
      )}
      <section className="system-card">
        <h3>Endereço para este cliente.</h3>
        <Location value={q.location} />
        <details>
          <summary>Conferir local cadastrado no painel</summary>
          <Location
            value={
              p.visitAddress
                ? {
                    address: p.visitAddress,
                    mapsUrl: p.mapsUrl,
                    arrivalNote: p.arrivalNote,
                  }
                : null
            }
          />
        </details>
        <p className="system-muted">
          Liberar o endereço não confirma serviço nem agenda. Confira o contato
          antes de enviar.
        </p>
        <div className="system-actions">
          {p.visitAddress && !["declined", "cancelled"].includes(q.status) && (
            <button
              className="button orange"
              disabled={a.busy}
              onClick={() =>
                void a.run(
                  () =>
                    admin.mutate(
                      "quotes/" + id + "/location",
                      {
                        version: q.version,
                        profileVersion: p.version,
                        action: "share",
                      },
                      "PUT",
                    ),
                  after,
                )
              }
            >
              {q.location
                ? "Atualizar local liberado"
                : "Liberar endereço neste pedido"}
            </button>
          )}
          {q.location && (
            <>
              <button
                className="button outline"
                disabled={a.busy}
                onClick={() =>
                  void a.run(
                    () =>
                      admin.mutate(
                        "quotes/" + id + "/location",
                        { version: q.version, action: "revoke" },
                        "PUT",
                      ),
                    after,
                  )
                }
              >
                Retirar endereço deste pedido
              </button>
              <button
                className="button outline"
                onClick={() =>
                  void a.run(
                    () => copyText(locationMessage(q)),
                    () => toast("Mensagem copiada."),
                  )
                }
              >
                Copiar mensagem com endereço
              </button>
              <a
                className="button outline"
                href={
                  "https://wa.me/" +
                  q.phone +
                  "?text=" +
                  encodeURIComponent(locationMessage(q))
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Preparar WhatsApp com endereço ↗
              </a>
            </>
          )}
        </div>
      </section>
      <h3>Atualizar atendimento.</h3>
      <form
        key={"edit" + q.version}
        onSubmit={(e) =>
          a.form(e, async (f) => {
            const v = values(f);
            await admin.mutate(
              "quotes/" + id,
              {
                ...v,
                version: q.version,
                confirmedTotal:
                  v.confirmedTotal === "" ? null : Number(v.confirmedTotal),
              },
              "PATCH",
            );
            await after();
            toast("Pedido atualizado.");
          })
        }
      >
        <fieldset disabled={a.busy} className="fieldset-clean">
          <FormSelect
            label="Status"
            name="status"
            value={q.status}
            options={[q.status, ...transitions[q.status]].map((s) => [
              s,
              statusLabels[s],
            ])}
          />
          <div className="system-grid">
            <Field
              label="Data confirmada"
              type="date"
              name="scheduledDate"
              defaultValue={q.scheduledDate || q.preferredDate || ""}
            />
            <Field
              label="Horário confirmado"
              type="time"
              name="scheduledTime"
              defaultValue={q.scheduledTime || q.preferredTime || ""}
            />
          </div>
          <Field
            label="Valor confirmado (R$)"
            type="number"
            min={0}
            step="0.01"
            name="confirmedTotal"
            defaultValue={q.confirmedTotal ?? ""}
          />
          {q.kind === "subscription_visit" && (
            <Field
              label="Placa conferida no veículo (para iniciar ou concluir)"
              name="checkedPlate"
              maxLength={9}
            />
          )}
          <FormArea
            name="message"
            label="Mensagem para o cliente"
            value={q.message || ""}
          />
          <FormArea
            name="internalNote"
            label="Anotação interna · apenas no painel"
            value={q.internalNote || ""}
          />
          <button className="button orange" type="submit">
            Salvar atualização ↗
          </button>
        </fieldset>
      </form>
      {q.kind === "plan" &&
        q.status === "accepted" &&
        q.plateVerified &&
        !q.subscriptionId && (
          <section className="system-card">
            <h3>Ativar este Care.</h3>
            <p>Assinatura exclusiva da placa {q.plate}.</p>
            <form
              onSubmit={(e) =>
                a.form(e, async (f) => {
                  const result = await admin.mutate<{
                    subscription: Subscription;
                    portalToken: string;
                  }>("subscriptions", {
                    quoteId: id,
                    startsOn: values(f).startsOn,
                    paidConfirmed: checked(f, "paidConfirmed"),
                  });
                  await after();
                  created(
                    result.subscription.id,
                    result.portalToken,
                    "assinatura",
                  );
                  toast("Care ativado. Guarde o link do cliente.");
                })
              }
            >
              <fieldset disabled={a.busy} className="fieldset-clean">
                <Field
                  label="Início do ciclo"
                  type="date"
                  name="startsOn"
                  defaultValue={todaySP()}
                  required
                />
                <PaidCheck />
                <button className="button orange" type="submit">
                  Ativar após pagamento
                </button>
              </fieldset>
            </form>
          </section>
        )}
      <div className="system-actions">
        {q.subscriptionId && (
          <button
            className="button outline"
            onClick={() =>
              open({ type: "subscription", id: q.subscriptionId! })
            }
          >
            Gerenciar assinatura ↗
          </button>
        )}
        <button
          className="button outline"
          disabled={a.busy}
          onClick={() => {
            if (
              !confirm("Reemitir o link? O link anterior deixará de funcionar.")
            )
              return;
            void a.run(
              () =>
                admin.mutate<{ trackingToken: string }>(
                  "quotes/" + id + "/link",
                  {},
                ),
              async (result) => {
                await after();
                created(id, result.trackingToken, "acompanhar");
              },
            );
          }}
        >
          Reemitir link privado
        </button>
        <button
          className="button outline"
          disabled={a.busy}
          onClick={() => void r.reload()}
        >
          Recarregar registro
        </button>
        <button
          className="button outline system-danger"
          disabled={a.busy}
          onClick={() => {
            if (
              !confirm(
                "Excluir definitivamente o pedido " +
                  q.reference +
                  " de " +
                  q.name +
                  " e seu histórico? O link deixará de funcionar. A assinatura, quando existente, permanece.",
              )
            )
              return;
            void a.run(
              () =>
                admin.mutate(
                  "quotes/" + id,
                  { version: q.version, confirm: true },
                  "DELETE",
                ),
              () => {
                changed();
                open(null);
                toast("Pedido excluído.");
              },
            );
          }}
        >
          Excluir pedido
        </button>
      </div>
      <h3>Histórico.</h3>
      <ol className="system-timeline">
        {r.data?.events.map((e, i) => (
          <li key={e.created_at + i}>
            <strong>{statusLabels[e.status]}</strong>
            <p>{e.message}</p>
            <time>
              {new Date(e.created_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </time>
          </li>
        ))}
      </ol>
    </>
  );
}
export function SubscriptionEditor({
  id,
  changed,
  close,
  created,
}: { id: string; close: () => void } & Shared) {
  const r = useResource(() => admin.subscription(id), true, id),
    a = useAdminAction(),
    { toast } = useApp();
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  const s = r.data?.subscription,
    c = s?.cycle;
  const after = async () => {
    await r.reload();
    changed();
  };
  if (!s)
    return (
      <>
        <Loading />
        <ErrorMessage message={r.error} />
      </>
    );
  const nextStart =
    s.history?.[0]?.end > todaySP() ? s.history[0].end : todaySP();
  return (
    <>
      <ErrorMessage message={a.error || r.error} />
      <h3>
        {findPlan(s.planId)?.name} · {s.name}
      </h3>
      <Status value={s.status} />
      <p>
        {s.model} · <strong>{registeredPlateLabel(s)}</strong> · {s.phone}
      </p>
      {c && (
        <div className="system-note">
          {dateLabel(c.starts_on)} → {dateLabel(c.ends_on)} (fim exclusivo)
          <br />
          {money(c.price_cents / 100)} · {c.paid ? "Pago" : "Pendente"}
          {c.expired ? " · Expirado" : c.notStarted ? " · Futuro" : ""}
        </div>
      )}
      <div className="credit-grid">
        {Object.entries(c?.credits || {})
          .filter(([, v]) => v.quota > 0)
          .map(([k, v]) => (
            <div className="credit-box" key={k}>
              <h3>{visitLabels[k]}</h3>
              <strong>{v.available}</strong>
              <span>/{v.quota} disponíveis</span>
              <p>
                {v.done} concluída(s) · {v.reserved} reservada(s)
              </p>
            </div>
          ))}
      </div>
      <p className="system-muted">
        Pausar não estende o ciclo. Saldo não acumula. Cada visita aceita
        reserva uma lavagem.
      </p>
      <h3>Visitas do ciclo.</h3>
      {s.visits?.map((v) => (
        <div className="system-row" key={v.id}>
          <span>
            <strong>{visitLabels[v.kind]}</strong>
            <small>
              {dateLabel(v.date)} · {v.time || "A combinar"} ·{" "}
              {plateLabel(v.plate)}
            </small>
            <Status value={v.status} />
          </span>
          <div className="flex flex-wrap gap-2">
            {["scheduled", "in_progress"].includes(v.status) && (
              <button
                className="button outline"
                disabled={a.busy}
                onClick={() => {
                  const checkedPlate = prompt(
                    "Digite a placa que você conferiu no veículo.",
                  );
                  if (!checkedPlate) return;
                  void a.run(
                    () =>
                      admin.mutate(
                        "visits/" + v.id,
                        {
                          version: v.version,
                          status: "completed",
                          checkedPlate,
                        },
                        "PATCH",
                      ),
                    after,
                  );
                }}
              >
                Concluir
              </button>
            )}
            {v.status !== "cancelled" && (
              <button
                className="button outline system-danger"
                disabled={a.busy}
                onClick={() => {
                  const reason = prompt(
                    "Motivo para desfazer este registro? O saldo será liberado.",
                  );
                  if (!reason) return;
                  void a.run(
                    () =>
                      admin.mutate(
                        "visits/" + v.id,
                        { version: v.version, status: "cancelled", reason },
                        "PATCH",
                      ),
                    after,
                  );
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        </div>
      ))}
      {s.status === "active" &&
        s.plateVerified &&
        c &&
        !c.expired &&
        !c.notStarted && (
          <section className="system-card">
            <h3>Registrar lavagem.</h3>
            <form
              key={"visit" + s.version + c.id + s.visits.length}
              onSubmit={(e) =>
                a.form(e, async (f) => {
                  const body = { ...values(f), cycleId: c.id };
                  const fingerprint = JSON.stringify(body);
                  if (operation.current?.fingerprint !== fingerprint)
                    operation.current = {
                      fingerprint,
                      id: crypto.randomUUID(),
                    };
                  await admin.mutate("subscriptions/" + id + "/visits", {
                    ...body,
                    operationId: operation.current.id,
                  });
                  operation.current = null;
                  await after();
                  f.reset();
                  toast("Lavagem registrada.");
                })
              }
            >
              <fieldset disabled={a.busy} className="fieldset-clean">
                <Field
                  label="Placa conferida (obrigatória para concluir)"
                  name="checkedPlate"
                  maxLength={9}
                />
                <FormSelect
                  label="Lavagem"
                  name="kind"
                  options={Object.entries(c.credits)
                    .filter(([, v]) => v.quota > 0)
                    .map(([k, v]) => [
                      k,
                      visitLabels[k] + " · " + v.available + " disponível(is)",
                    ])}
                />
                <FormSelect
                  label="Registro"
                  name="status"
                  value="completed"
                  options={[
                    ["completed", "Concluída"],
                    ["scheduled", "Agendada"],
                  ]}
                />
                <div className="system-grid">
                  <Field
                    label="Data"
                    type="date"
                    name="date"
                    defaultValue={todaySP()}
                    required
                  />
                  <Field label="Horário (opcional)" type="time" name="time" />
                </div>
                <FormArea
                  name="note"
                  label="Observação interna"
                  maxLength={300}
                />
                <button className="button orange" type="submit">
                  Registrar no ciclo
                </button>
              </fieldset>
            </form>
          </section>
        )}
      {s.status === "active" && s.plateVerified && (
        <section className="system-card">
          <h3>Renovar Care.</h3>
          <form
            key={"renew" + s.version}
            onSubmit={(e) =>
              a.form(e, async (f) => {
                await admin.mutate("subscriptions/" + id + "/renew", {
                  version: s.version,
                  startsOn: values(f).startsOn,
                  paidConfirmed: checked(f, "paidConfirmed"),
                });
                await after();
                toast("Novo ciclo pago registrado.");
              })
            }
          >
            <fieldset disabled={a.busy} className="fieldset-clean">
              <Field
                label="Início do próximo ciclo"
                type="date"
                name="startsOn"
                defaultValue={nextStart}
                required
              />
              <PaidCheck />
              <button className="button orange" type="submit">
                Confirmar pagamento e renovar
              </button>
            </fieldset>
          </form>
        </section>
      )}
      {s.status !== "cancelled" && (
        <section className="system-card">
          <h3>Placa da assinatura.</h3>
          <p>Correções precisam de motivo e ficam no histórico interno.</p>
          <form
            key={"plate" + s.version}
            onSubmit={(e) =>
              a.form(e, async (f) => {
                await admin.mutate(
                  "subscriptions/" + id + "/plate",
                  {
                    ...values(f),
                    version: s.version,
                    confirm: checked(f, "confirm"),
                  },
                  "PATCH",
                );
                await after();
                toast("Placa salva. Histórico preservado.");
              })
            }
          >
            <fieldset disabled={a.busy} className="fieldset-clean">
              <Field
                label="Placa que conferi pessoalmente"
                name="plate"
                defaultValue={s.plate || ""}
                maxLength={9}
                required
              />
              <FormArea
                name="reason"
                label="Motivo do cadastro ou da correção"
                maxLength={300}
              />
              <FormCheck
                name="confirm"
                label="Conferi a placa no veículo e autorizo este vínculo."
                required
              />
              <button className="button orange" type="submit">
                Salvar placa
              </button>
            </fieldset>
          </form>
        </section>
      )}
      <h3>Gestão do plano.</h3>
      <div className="system-actions">
        {s.status !== "cancelled" ? (
          <>
            <button
              className="button outline"
              disabled={a.busy}
              onClick={() =>
                void a.run(
                  () =>
                    admin.mutate(
                      "subscriptions/" + id,
                      {
                        version: s.version,
                        status: s.status === "active" ? "paused" : "active",
                      },
                      "PATCH",
                    ),
                  after,
                )
              }
            >
              {s.status === "active" ? "Pausar plano" : "Reativar plano"}
            </button>
            <button
              className="button outline system-danger"
              disabled={a.busy}
              onClick={() => {
                if (confirm("Cancelar este Care? O histórico permanece."))
                  void a.run(
                    () =>
                      admin.mutate(
                        "subscriptions/" + id,
                        { version: s.version, status: "cancelled" },
                        "PATCH",
                      ),
                    after,
                  );
              }}
            >
              Cancelar plano
            </button>
          </>
        ) : (
          <button
            className="button outline system-danger"
            disabled={a.busy}
            onClick={() => {
              if (
                confirm(
                  "Excluir definitivamente esta assinatura e suas visitas? Os pedidos e o cliente permanecem.",
                )
              )
                void a.run(
                  () =>
                    admin.mutate(
                      "subscriptions/" + id,
                      { version: s.version, confirm: true },
                      "DELETE",
                    ),
                  () => {
                    changed();
                    close();
                  },
                );
            }}
          >
            Excluir assinatura definitivamente
          </button>
        )}
        <button
          className="button outline"
          disabled={a.busy}
          onClick={() => {
            if (
              !confirm(
                "Reemitir o link do Care? O link anterior do portal deixará de funcionar.",
              )
            )
              return;
            void a.run(
              () =>
                admin.mutate<{ portalToken: string }>(
                  "subscriptions/" + id + "/portal",
                  {},
                ),
              async (result) => {
                await after();
                created(id, result.portalToken, "assinatura");
              },
            );
          }}
        >
          Reemitir link do cliente
        </button>
        <button
          className="button outline"
          disabled={a.busy}
          onClick={() => void r.reload()}
        >
          Recarregar
        </button>
      </div>
      <h3>Histórico de ciclos.</h3>
      {s.history?.map((h) => (
        <div className="system-row" key={h.id}>
          <span>
            {dateLabel(h.start)} → {dateLabel(h.end)}
            <small>Fim exclusivo · {h.paid ? "Pago" : "Pendente"}</small>
            {Object.entries(h.credits)
              .filter(([, v]) => v.quota > 0)
              .map(([k, v]) => (
                <small key={k}>
                  {visitLabels[k]}: {v.done}/{v.quota} realizada(s)
                </small>
              ))}
          </span>
          <strong>{money(h.price)}</strong>
        </div>
      ))}
      {s.visitHistory?.length > 0 && (
        <details>
          <summary>Lavagens de ciclos anteriores</summary>
          {s.visitHistory.map((v) => (
            <div className="system-row" key={v.id}>
              <span>
                {visitLabels[v.kind]} · {dateLabel(v.date)} ·{" "}
                {plateLabel(v.plate)}
              </span>
              <Status value={v.status} />
            </div>
          ))}
        </details>
      )}
    </>
  );
}
export function ManualSubscription({
  changed,
  open,
  created,
}: { open: (d: Detail) => void } & Shared) {
  const a = useAdminAction();
  return (
    <>
      <p>
        Confira pessoalmente o veículo e a placa. Ative somente depois de
        receber o pagamento.
      </p>
      <form
        onSubmit={(e) =>
          a.form(e, async (f) => {
            const result = await admin.mutate<{
              subscription: Subscription;
              portalToken: string;
            }>("subscriptions", {
              ...values(f),
              paidConfirmed: checked(f, "paidConfirmed"),
              confirmVehicle: checked(f, "confirmVehicle"),
            });
            changed();
            open({ type: "subscription", id: result.subscription.id });
            created(result.subscription.id, result.portalToken, "assinatura");
          })
        }
      >
        <fieldset disabled={a.busy} className="fieldset-clean">
          <Field name="name" label="Cliente" maxLength={80} required />
          <Field
            name="phone"
            label="WhatsApp com DDD"
            type="tel"
            maxLength={20}
            required
          />
          <Field
            name="model"
            label="Marca e modelo do veículo"
            maxLength={80}
            required
          />
          <Field
            name="plate"
            label="Placa que conferi no veículo"
            maxLength={9}
            required
          />
          <FormCheck
            name="confirmVehicle"
            label="Conferi esta placa pessoalmente no veículo."
            required
          />
          <FormSelect
            name="planId"
            label="Plano"
            value={plans[0].id}
            options={plans.map((p) => [
              p.id,
              p.name + " · " + money(p.price) + "/mês",
            ])}
          />
          <Field
            label="Início do ciclo"
            name="startsOn"
            type="date"
            defaultValue={todaySP()}
            required
          />
          <PaidCheck />
          <ErrorMessage message={a.error} />
          <button className="button orange" type="submit">
            Ativar assinatura ↗
          </button>
        </fieldset>
      </form>
    </>
  );
}
export function CustomerEditor({
  id,
  changed,
  close,
}: {
  id: string;
  changed: () => void;
  close: () => void;
}) {
  const r = useResource(() => admin.deletion(id), true, id),
    a = useAdminAction();
  const d = r.data;
  return !d ? (
    <>
      <Loading />
      <ErrorMessage message={r.error} />
    </>
  ) : (
    <>
      <h3>{d.customer.name}</h3>
      <p>{d.customer.phone}</p>
      <p>
        A exclusão é definitiva. Também serão apagados os registros vinculados:
      </p>
      <ul>
        {Object.entries(d.counts).map(([k, n]) => (
          <li key={k}>
            {n}{" "}
            {(
              {
                quotes: "pedido(s) e históricos",
                subscriptions: "assinatura(s)",
                cycles: "ciclo(s)",
                visits: "lavagem(ns)",
              } as Record<string, string>
            )[k] || k}
          </li>
        ))}
      </ul>
      <p>Os links destes pedidos e assinaturas deixarão de funcionar.</p>
      <ErrorMessage message={a.error} />
      <div className="system-actions">
        <button className="button outline" onClick={close}>
          Manter cliente
        </button>
        <button
          className="button outline system-danger"
          disabled={a.busy}
          onClick={() => {
            if (
              confirm(
                "Excluir definitivamente " +
                  d.customer.name +
                  " e todos os registros listados?",
              )
            )
              void a.run(
                async () => {
                  try {
                    return await admin.mutate(
                      "customers/" + id,
                      { confirm: true, snapshot: d.snapshot },
                      "DELETE",
                    );
                  } catch (error) {
                    if (
                      error &&
                      typeof error === "object" &&
                      "status" in error &&
                      error.status === 409
                    )
                      await r.reload();
                    throw error;
                  }
                },
                () => {
                  changed();
                  close();
                },
              );
          }}
        >
          Excluir cliente e registros
        </button>
      </div>
    </>
  );
}
