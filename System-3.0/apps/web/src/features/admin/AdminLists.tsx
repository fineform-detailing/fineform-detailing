"use client";
import { useState } from "react";
import { admin, request } from "../../services/api";
import { useResource } from "../../hooks/useResource";
import { usePushViewModel } from "../../hooks/usePushViewModel";
import {
  ErrorMessage,
  Field,
  Loading,
  Status,
} from "../../components/ui/primitives";
import {
  dateLabel,
  visitLabels,
  statusLabels,
  messageOf,
} from "../../models/config";
import { findPlan, money, todaySP } from "@domain/catalog.mjs";
import { registeredPlateLabel, plateLabel } from "@domain/plates.mjs";
import { useApp } from "../../components/layout/AppProvider";
import {
  FormArea,
  FormCheck,
  values,
  checked,
  useAdminAction,
} from "./admin.forms";
import type { Detail } from "./AdminView";
import type { Quote } from "../../models/entities";
type Props = { revision: number; open: (detail: Detail) => void };
export function AdminOverview({ revision, open }: Props) {
  const { data, error, loading } = useResource(
    (signal) => admin.dashboard(signal),
    true,
    revision,
  );
  return (
    <>
      <ErrorMessage message={error} />
      {loading && !data ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="dashboard-grid">
              {[
                ["Pedidos recebidos", data.quotes.pending || 0],
                ["Assinaturas ativas", data.activeSubscriptions],
                ["Atendimentos hoje", data.todayVisits],
              ].map(([label, count]) => (
                <section className="dashboard-stat system-card" key={label}>
                  <span>{label}</span>
                  <strong className="text-5xl">{count}</strong>
                </section>
              ))}
            </div>
            <section className="system-card">
              <h2>Próximas renovações.</h2>
              {data.expiring.length ? (
                data.expiring.map((s) => (
                  <button
                    className="system-row w-full text-left"
                    type="button"
                    key={s.id}
                    onClick={() => open({ type: "subscription", id: s.id })}
                  >
                    <strong>{s.name}</strong>
                    <span>Fim: {dateLabel(s.ends_on)} ↗</span>
                  </button>
                ))
              ) : (
                <p>Nenhum ciclo termina nos próximos sete dias.</p>
              )}
            </section>
            <p className="system-muted">
              Os pagamentos e a aceitação dos pedidos são confirmados
              manualmente por Mateus.
            </p>
          </>
        )
      )}
    </>
  );
}
function QuoteRows({ items, open }: { items: Quote[]; open: Props["open"] }) {
  return items.length ? (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>CLIENTE / VEÍCULO</th>
            <th>PEDIDO</th>
            <th>VALOR</th>
            <th>STATUS</th>
            <th>ABRIR</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.id}>
              <td>
                <strong>{q.name}</strong>
                <small>{q.model}</small>
                <small className="plate-text">{registeredPlateLabel(q)}</small>
              </td>
              <td>
                {q.reference}
                <small>
                  {dateLabel(q.preferredDate)} ·{" "}
                  {q.preferredTime || "A combinar"}
                </small>
              </td>
              <td>
                {q.confirmedTotal != null
                  ? money(q.confirmedTotal)
                  : q.budget.hasBase
                    ? money(q.budget.total)
                    : "A avaliar"}
              </td>
              <td>
                <Status value={q.status} />
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => open({ type: "quote", id: q.id })}
                >
                  Gerenciar ↗
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="system-empty">Nenhum pedido nesta consulta.</p>
  );
}
function useFilters() {
  const [page, setPage] = useState(0),
    [filter, setFilter] = useState({ q: "", status: "" });
  return {
    page,
    setPage,
    filter,
    apply: (form: HTMLFormElement) => {
      setFilter({ q: values(form).q || "", status: values(form).status || "" });
      setPage(0);
    },
    query: new URLSearchParams({ ...filter, page: String(page) }).toString(),
  };
}
function Filters({
  apply,
  kind,
}: {
  apply: (form: HTMLFormElement) => void;
  kind: "quotes" | "subscriptions";
}) {
  const labels =
    kind === "quotes"
      ? [
          "pending",
          "accepted",
          "in_progress",
          "ready",
          "completed",
          "declined",
          "cancelled",
        ]
      : ["active", "paused", "cancelled"];
  return (
    <form
      className="admin-toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <input
        className="system-input"
        name="q"
        placeholder="Início do nome, telefone ou placa"
        aria-label="Buscar registros"
        maxLength={60}
      />
      <select
        name="status"
        className="system-input"
        aria-label="Filtrar status"
      >
        <option value="">Todos os status</option>
        {labels.map((k) => (
          <option key={k} value={k}>
            {statusLabels[k]}
          </option>
        ))}
      </select>
      <button className="button outline" type="submit">
        Buscar
      </button>
    </form>
  );
}
function Pagination({
  page,
  setPage,
  hasMore,
}: {
  page: number;
  setPage: (value: number) => void;
  hasMore: boolean;
}) {
  return (
    <nav className="system-actions" aria-label="Paginação">
      <button
        className="button outline"
        type="button"
        disabled={!page}
        onClick={() => setPage(Math.max(0, page - 1))}
      >
        ← Anterior
      </button>
      <span>Página {page + 1}</span>
      <button
        className="button outline"
        type="button"
        disabled={!hasMore}
        onClick={() => setPage(page + 1)}
      >
        Próxima →
      </button>
    </nav>
  );
}
export function QuotesTable({ revision, open }: Props) {
  const f = useFilters();
  const r = useResource(
    (signal) => admin.quotes(f.query, signal),
    true,
    f.query + revision,
  );
  return (
    <>
      <Filters apply={f.apply} kind="quotes" />
      <ErrorMessage message={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <QuoteRows items={r.data.items} open={open} />
            <Pagination
              page={f.page}
              setPage={f.setPage}
              hasMore={r.data.hasMore}
            />
          </>
        )
      )}
    </>
  );
}
export function SubscriptionsTable({ revision, open }: Props) {
  const f = useFilters(),
    r = useResource(
      (signal) => admin.subscriptions(f.query, signal),
      true,
      f.query + revision,
    );
  return (
    <>
      <section className="system-card">
        <p>
          Confira pessoalmente o veículo e cadastre a placa. Cada Care é
          exclusivo de um veículo.
        </p>
        <button
          className="button orange"
          type="button"
          onClick={() => open({ type: "manual" })}
        >
          Cadastrar Care ↗
        </button>
      </section>
      <Filters apply={f.apply} kind="subscriptions" />
      <ErrorMessage message={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>CLIENTE / PLACA</th>
                    <th>PLANO</th>
                    <th>SALDO / CICLO</th>
                    <th>STATUS</th>
                    <th>ABRIR</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.items.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <small>{s.model}</small>
                        <small>{registeredPlateLabel(s)}</small>
                      </td>
                      <td>{findPlan(s.planId)?.name}</td>
                      <td>
                        {s.cycle
                          ? Object.entries(s.cycle.credits)
                              .filter(([, v]) => v.quota > 0)
                              .map(([k, v]) => (
                                <small key={k}>
                                  {visitLabels[k]}: {v.available}/{v.quota}
                                </small>
                              ))
                          : "Sem ciclo"}
                        <small>Fim: {dateLabel(s.cycle?.ends_on)}</small>
                      </td>
                      <td>
                        <Status value={s.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            open({ type: "subscription", id: s.id })
                          }
                        >
                          Gerenciar ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!r.data.items.length && <p>Nenhuma assinatura nesta consulta.</p>}
            <Pagination
              page={f.page}
              setPage={f.setPage}
              hasMore={r.data.hasMore}
            />
          </>
        )
      )}
    </>
  );
}
export function Agenda({ revision, open }: Props) {
  const [date, setDate] = useState(todaySP());
  const r = useResource(
    (signal) => admin.agenda(date, signal),
    true,
    date + revision,
  );
  const entries = [
    ...(r.data?.quotes || []).map((q) => ({
      id: q.id,
      name: q.name,
      model: q.model,
      plate: q.plate,
      time: q.time,
      label: q.reference,
      status: q.status,
      detail: { type: "quote" as const, id: q.id },
    })),
    ...(r.data?.visits || []).map((v) => ({
      id: v.id,
      name: v.name,
      model: v.model,
      plate: v.plate,
      time: v.time,
      label: "Care · " + visitLabels[v.kind],
      status: v.status,
      detail: { type: "subscription" as const, id: v.subscriptionId! },
    })),
  ].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  return (
    <>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setDate(values(e.currentTarget).date);
        }}
      >
        <input
          className="system-input"
          type="date"
          name="date"
          defaultValue={date}
          aria-label="Dia da agenda"
          required
        />
        <button className="button outline" type="submit">
          Consultar dia
        </button>
      </form>
      <ErrorMessage message={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : entries.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>HORÁRIO</th>
                <th>CLIENTE</th>
                <th>CUIDADO</th>
                <th>STATUS</th>
                <th>ABRIR</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((v) => (
                <tr key={v.id}>
                  <td>{v.time || "A combinar"}</td>
                  <td>
                    {v.name}
                    <small>
                      {v.model} · {plateLabel(v.plate)}
                    </small>
                  </td>
                  <td>{v.label}</td>
                  <td>
                    <Status value={v.status} />
                  </td>
                  <td>
                    <button onClick={() => open(v.detail)}>Abrir ↗</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="system-empty">
          Nenhum atendimento confirmado para este dia.
        </p>
      )}
      <p className="system-muted">
        Pedidos sem data confirmada ficam na aba Pedidos. Horários são
        combinados manualmente.
      </p>
    </>
  );
}
export function Customers({ revision, open }: Props) {
  const [q, setQ] = useState(""),
    r = useResource((signal) => admin.customers(q, signal), true, q + revision);
  return (
    <>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(values(e.currentTarget).q);
        }}
      >
        <input
          name="q"
          className="system-input"
          placeholder="Início do nome ou telefone"
          aria-label="Buscar clientes"
        />
        <button className="button outline" type="submit">
          Buscar
        </button>
      </form>
      <ErrorMessage message={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>CONTATO</th>
                <th>PRIMEIRO VEÍCULO</th>
                <th>PLANOS</th>
                <th>GERENCIAR</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.items.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <a
                      href={"https://wa.me/" + c.phone}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.phone} ↗
                    </a>
                  </td>
                  <td>{c.model}</td>
                  <td>{c.plans}</td>
                  <td>
                    <button
                      className="system-danger"
                      onClick={() => open({ type: "customer", id: c.id })}
                    >
                      Gerenciar cliente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="system-muted">
        Até 100 clientes por consulta. Use a busca para localizar registros
        antigos.
      </p>
    </>
  );
}
export function Settings({ revision }: { revision: number }) {
  const r = useResource((signal) => admin.profile(signal), true, revision),
    action = useAdminAction(),
    { toast } = useApp();
  const p = r.data?.profile;
  return (
    <>
      <ErrorMessage message={r.error || action.error} />
      {!p ? (
        <Loading />
      ) : (
        <section className="system-card">
          <h2>Local e dados da Fine Form.</h2>
          <p>
            O endereço de atendimento só aparece nos pedidos em que você liberar
            o local.
          </p>
          <form
            key={p.version}
            onSubmit={(e) =>
              action.form(e, async (f) => {
                await admin.mutate(
                  "business",
                  {
                    ...values(f),
                    version: p.version,
                    publishIdentity: checked(f, "publishIdentity"),
                    publishVisitAddress: false,
                  },
                  "PUT",
                );
                await r.reload();
                toast("Dados salvos.");
              })
            }
          >
            <fieldset disabled={action.busy} className="fieldset-clean">
              <FormArea
                name="visitAddress"
                label="Endereço completo para receber o veículo"
                value={p.visitAddress}
                maxLength={500}
              />
              <Field
                label="Link do mapa (opcional)"
                name="mapsUrl"
                defaultValue={p.mapsUrl}
                maxLength={1200}
              />
              <FormArea
                name="arrivalNote"
                label="Orientações de chegada (opcional)"
                value={p.arrivalNote}
                maxLength={500}
              />
              <hr className="system-divider" />
              <Field
                label="Nome empresarial conforme o documento"
                name="legalName"
                defaultValue={p.legalName}
                maxLength={160}
              />
              <Field
                label="CNPJ conforme o documento"
                name="cnpj"
                defaultValue={p.cnpj}
                maxLength={24}
              />
              <FormArea
                name="registeredAddress"
                label="Endereço cadastral (somente no painel)"
                value={p.registeredAddress}
                maxLength={500}
              />
              <FormCheck
                name="publishIdentity"
                label="Publicar nome empresarial e CNPJ na página de informações"
                defaultChecked={p.publishIdentity}
              />
              <button className="button orange" type="submit">
                Salvar dados
              </button>
            </fieldset>
          </form>
          <p className="system-muted">
            Salvar um local não altera os endereços já liberados. Abra cada
            pedido para atualizar.
          </p>
        </section>
      )}
      <section className="system-card">
        <h2>Dados e operação.</h2>
        <p>Os pagamentos e renovações são confirmados manualmente.</p>
        <button
          className="button orange"
          disabled={action.busy}
          onClick={() =>
            void action.run(
              () => request("/api/admin/export"),
              (data) => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "fine-form-backup-" + todaySP() + ".json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast("Backup solicitado. Guarde em um lugar privado.");
              },
            )
          }
        >
          Exportar dados JSON ↓
        </button>
        <p>
          <a href="/api/health" target="_blank" rel="noopener noreferrer">
            Consultar configuração ↗
          </a>
        </p>
        <p className="system-muted">
          Links privados permitem consultar o pedido ou Care correspondente.
          Reemita-os no registro quando necessário.
        </p>
      </section>
    </>
  );
}
export function Notifications() {
  const vm = usePushViewModel("admin");
  return (
    <>
      <section className="system-card">
        <h2>Novos pedidos no seu celular.</h2>
        <p>
          Receba um aviso mesmo com o painel fechado. Som e vibração seguem os
          ajustes do aparelho.
        </p>
        <p role="status">
          {!vm.supported
            ? "Este navegador não oferece avisos em segundo plano. No iPhone, adicione o painel à Tela de Início."
            : !vm.data?.configured
              ? "Os avisos precisam ser configurados para este site."
              : vm.active
                ? "Avisos ativados neste aparelho."
                : "Ative os avisos neste aparelho para os próximos pedidos."}
        </p>
        <div className="system-actions">
          {vm.active ? (
            <>
              <button
                className="button orange"
                disabled={vm.busy}
                onClick={() => void vm.test()}
              >
                Enviar notificação de teste
              </button>
              <button
                className="button outline"
                disabled={vm.busy}
                onClick={() => vm.revoke()}
              >
                Desativar neste aparelho
              </button>
            </>
          ) : (
            <button
              className="button orange"
              disabled={vm.busy || !vm.supported || !vm.data?.configured}
              onClick={vm.enable}
            >
              Ativar notificações neste aparelho
            </button>
          )}
        </div>
        <ErrorMessage message={vm.error} />
      </section>
      <section className="system-card">
        <h2>Aparelhos autorizados.</h2>
        {vm.data?.devices?.map((d) => (
          <div className="system-row" key={d.id}>
            <span>
              <strong>
                {d.label}
                {d.id === vm.device ? " · este aparelho" : ""}
              </strong>
              <small>
                Último envio:{" "}
                {d.lastSentAt
                  ? new Date(d.lastSentAt).toLocaleString("pt-BR")
                  : "Ainda sem envio"}
                {d.lastError ? " · houve falha de entrega" : ""}
              </small>
            </span>
            <button
              className="button outline"
              disabled={vm.busy}
              onClick={() => {
                if (confirm("Desativar os avisos deste aparelho?"))
                  vm.revoke(d.id);
              }}
            >
              Desativar
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
