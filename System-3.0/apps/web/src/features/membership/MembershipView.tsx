"use client";
import { useMembershipViewModel } from "./useMembershipViewModel";
import {
  Budget,
  Check,
  Field,
  Select,
  TextArea,
  ErrorMessage,
  Loading,
  Status,
  PrivateFrame,
} from "../../components/ui/primitives";
import { Addons } from "../../components/catalog/Addons";
import { dateLabel, visitLabels } from "../../models/config";
import { findPlan, money, todaySP, timesFor } from "@domain/catalog.mjs";
import { registeredPlateLabel, plateLabel } from "@domain/plates.mjs";
import { creditKinds } from "@domain/membership-state.mjs";
import { trackingUrl, copyText } from "../../services/browser.mjs";
import { useApp } from "../../components/layout/AppProvider";
const previousDay = (s: string) =>
  new Date(new Date(s + "T12:00:00Z").getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
export function MembershipView() {
  const vm = useMembershipViewModel(),
    { toast, contact } = useApp();
  const s = vm.subscription,
    d = vm.draft,
    c = s?.cycle;
  return (
    <PrivateFrame
      title="Seu Fine Form Care."
      eyebrow="SEU PLANO / FINE FORM"
      live={s ? vm.live : undefined}
    >
      {!vm.ready || (vm.loading && !s) ? (
        <Loading />
      ) : !s ? (
        <section className="system-card">
          <h2>Abra seu link privado do Care.</h2>
          <p>Mateus envia esse link quando o plano é ativado.</p>
          <ErrorMessage message={vm.error} />
          <button className="button orange" onClick={() => contact()}>
            Falar com Mateus ↗
          </button>
        </section>
      ) : (
        <>
          <ErrorMessage message={vm.error} />
          <section className="system-card">
            <Status value={s.status} />
            <h2 className="mt-5">{findPlan(s.planId)?.name}</h2>
            <p>
              Olá, {s.name}. Este Care acompanha {s.model}.
            </p>
            <div className="plate-lock">
              <span>VEÍCULO VINCULADO AO CARE</span>
              <strong>{registeredPlateLabel(s)}</strong>
              <p>As lavagens são exclusivas deste veículo.</p>
            </div>
            {c && (
              <div className="system-note">
                Ciclo: {dateLabel(c.starts_on)} até{" "}
                {dateLabel(previousDay(c.ends_on))}.<br />
                {money(c.price_cents / 100)} ·{" "}
                {c.paid ? "Pagamento confirmado" : "Pagamento pendente"}
                {c.expired && (
                  <p>Seu ciclo terminou. Fale com Mateus para renovar.</p>
                )}
              </div>
            )}
            <div className="credit-grid">
              {creditKinds(s).map(([kind, v]) => (
                <div className="credit-box" key={kind}>
                  <h3>{visitLabels[kind]}</h3>
                  <strong>{v.available}</strong>
                  <span> de {v.quota} disponíveis</span>
                  <p>
                    {v.done} concluída(s) · {v.reserved} reservada(s)
                  </p>
                </div>
              ))}
            </div>
            <p className="system-muted">
              Saldo do ciclo, sem acúmulo. Renovação e pagamento combinados com
              Mateus.
            </p>
            <div className="system-actions">
              <button
                className="button outline"
                onClick={() => void vm.reload()}
              >
                Atualizar saldo
              </button>
              <button
                className="button outline"
                onClick={() =>
                  copyText(trackingUrl(s.id, vm.token, "assinatura"))
                    .then(() => toast("Link copiado."))
                    .catch((e: Error) => toast(e.message))
                }
              >
                Copiar meu link
              </button>
            </div>
          </section>
          <section className="system-card">
            <h2>Seu próximo cuidado.</h2>
            {vm.receipt ? (
              <div className="system-success">
                <strong>
                  Visita solicitada · {vm.receipt.quote.reference}
                </strong>
                <p>Seu saldo será reservado quando Mateus aceitar.</p>
                <a
                  className="button orange"
                  href={trackingUrl(vm.receipt.quote.id, vm.receipt.token)}
                >
                  Acompanhar visita ↗
                </a>
                <button className="button outline" onClick={vm.another}>
                  Solicitar outra lavagem
                </button>
              </div>
            ) : (
              <>
                <p className="system-note" role="status">
                  {vm.availability.reason}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void vm.submit();
                  }}
                  noValidate
                >
                  <fieldset
                    className="fieldset-clean"
                    disabled={vm.busy || !vm.availability.allowed}
                  >
                    <Select
                      label="Lavagem incluída no Care"
                      value={vm.kind}
                      onChange={vm.setKind}
                      options={creditKinds(s).map(([k, v]) => [
                        k,
                        visitLabels[k] +
                          " · " +
                          v.available +
                          " disponível(is)",
                      ])}
                    />
                    <div className="system-grid">
                      <Field
                        label="Data de preferência"
                        type="date"
                        min={todaySP()}
                        max={c ? previousDay(c.ends_on) : undefined}
                        value={d.date}
                        onChange={(e) =>
                          vm.update({ date: e.target.value, time: "" })
                        }
                      />
                      <Select
                        label="Horário"
                        value={d.time}
                        onChange={(time) => vm.update({ time })}
                        options={
                          [
                            ["", "A combinar"],
                            ...timesFor(d.date).map((t) => [t, t]),
                          ] as [string, string][]
                        }
                      />
                    </div>
                    <Addons selection={d} onToggle={vm.toggle} />
                    <Budget budget={vm.budget} />
                    <TextArea
                      label="Observações (opcional)"
                      value={d.notes}
                      onChange={(notes) => vm.update({ notes })}
                    />
                    <Check
                      label="Solicito esta visita e entendo que o saldo será reservado quando Mateus aceitar."
                      checked={d.ack}
                      onChange={(ack) => vm.update({ ack })}
                      required
                    />
                    <Check
                      label="Guardar o link desta visita neste aparelho por até 90 dias (opcional)."
                      checked={Boolean(d.rememberLink)}
                      onChange={(rememberLink) => vm.update({ rememberLink })}
                    />
                    <p className="privacy-inline">
                      <a href="/privacidade/">Privacidade</a> ·{" "}
                      <a href="/termos/">Termos</a>
                    </p>
                    <button
                      className="button orange"
                      type="submit"
                      disabled={vm.busy || !vm.availability.allowed}
                    >
                      {vm.busy ? "Enviando…" : "Solicitar esta visita ↗"}
                    </button>
                  </fieldset>
                </form>
              </>
            )}
          </section>
          <div className="system-grid">
            <section className="system-card">
              <h2>Visitas deste ciclo.</h2>
              {s.visits?.length ? (
                s.visits.map((v) => (
                  <div className="system-row" key={v.id}>
                    <span>
                      <strong>{visitLabels[v.kind]}</strong>
                      <small>
                        {dateLabel(v.date)} · {v.time || "A combinar"} ·{" "}
                        {plateLabel(v.plate)}
                      </small>
                    </span>
                    <Status value={v.status} />
                  </div>
                ))
              ) : (
                <p>Sua primeira visita deste ciclo ainda será combinada.</p>
              )}
            </section>
            <section className="system-card">
              <h2>Seus ciclos.</h2>
              {s.history?.map((h) => (
                <div className="system-row" key={h.id}>
                  <span>
                    <strong>
                      {dateLabel(h.start)} — {dateLabel(previousDay(h.end))}
                    </strong>
                    <small>
                      {money(h.price)} · {h.paid ? "Pago" : "Pendente"}
                    </small>
                  </span>
                  <span>{h.id === c?.id ? "Em consulta" : "Histórico"}</span>
                </div>
              ))}
            </section>
          </div>
          {s.visitHistory?.length > 0 && (
            <section className="system-card">
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
            </section>
          )}
        </>
      )}
    </PrivateFrame>
  );
}
