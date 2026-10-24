"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminSession } from "./useAdminSession";
import { useLive } from "../../hooks/useLive";
import {
  Field,
  ErrorMessage,
  Loading,
  Modal,
} from "../../components/ui/primitives";
import { useApp } from "../../components/layout/AppProvider";
import {
  AdminOverview,
  QuotesTable,
  SubscriptionsTable,
  Agenda,
  Customers,
  Settings,
  Notifications,
} from "./AdminLists";
import {
  QuoteEditor,
  SubscriptionEditor,
  ManualSubscription,
  CustomerEditor,
} from "./AdminEditors";
import { messageOf } from "../../models/config";
import { trackingUrl, copyText } from "../../services/browser.mjs";
export type Detail =
  | { type: "quote" | "subscription" | "customer"; id: string }
  | { type: "manual" }
  | null;
const tabs = [
  ["dashboard", "Visão geral"],
  ["quotes", "Pedidos"],
  ["subscriptions", "Assinaturas"],
  ["plates", "Gerenciador de placas"],
  ["agenda", "Agenda"],
  ["customers", "Clientes"],
  ["notifications", "Notificações"],
  ["settings", "Dados"],
] as const;
const titles: Record<string, string> = {
  dashboard: "Seu estúdio, em dia.",
  quotes: "Pedidos de cuidado.",
  subscriptions: "Assinaturas Fine Form Care.",
  plates: "Gerenciador de placas.",
  agenda: "Agenda de atendimento.",
  customers: "Seus clientes.",
  notifications: "Notificações de pedidos.",
  settings: "Dados e operação.",
};
export function AdminView() {
  const auth = useAdminSession();
  const [tab, setTab] = useState("dashboard"),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState<Detail>(null),
    [pending, setPending] = useState(false),
    [link, setLink] = useState("");
  const pendingNotification = useRef("");
  const detailRef = useRef(detail);
  detailRef.current = detail;
  const { toast } = useApp();
  const refresh = () => setRevision((v) => v + 1);
  const live = useLive(
    "admin",
    "",
    "",
    () => {
      if (
        detailRef.current ||
        document.activeElement?.matches("input,textarea,select")
      )
        setPending(true);
      else refresh();
    },
    auth.authenticated,
  );
  const show = (d: Detail) => {
    setLink("");
    setDetail(d);
  };
  const changed = () => {
    refresh();
    setPending(false);
  };
  useEffect(() => {
    if (!auth.authenticated) {
      setDetail(null);
      setLink("");
      return;
    }
    const id = new URLSearchParams(location.search).get("pedido");
    if (id && /^[0-9a-f-]{36}$/i.test(id)) setDetail({ type: "quote", id });
    const notify = (event: MessageEvent) => {
      let source: URL;
      try {
        source = new URL(
          (event.source as ServiceWorker | null)?.scriptURL || "",
        );
      } catch {
        return;
      }
      if (
        source.origin !== location.origin ||
        source.pathname !== "/painel/sw.js" ||
        event.data?.type !== "ff-open-order" ||
        !/^[0-9a-f-]{36}$/i.test(event.data.quoteId || "")
      )
        return;
      if (detailRef.current) {
        pendingNotification.current = event.data.quoteId;
        toast("Há um novo pedido. Termine esta edição para abri-lo.");
        setPending(true);
        return;
      }
      setDetail({ type: "quote", id: event.data.quoteId });
    };
    navigator.serviceWorker?.addEventListener("message", notify);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", notify);
  }, [auth.authenticated, toast]);
  const created = (id: string, token: string, path: string) =>
    setLink(trackingUrl(id, token, path));
  if (!auth.ready)
    return (
      <main id="conteudo" className="admin-access">
        <Loading />
      </main>
    );
  if (!auth.authenticated)
    return (
      <main id="conteudo" className="admin-access">
        <div className="admin-brand">FINE FORM</div>
        <h1>Seu painel.</h1>
        <p>Entre com sua chave e o código do autenticador.</p>
        <AccessForm error={auth.error} onSubmit={auth.login} />
        <p className="system-muted">
          Sessão de até 2 horas, encerrada após 20 minutos sem atividade.
          Operações sensíveis pedem nova confirmação.
        </p>
        <a href="/">Voltar ao site ↗</a>
      </main>
    );
  return (
    <>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <a className="admin-brand" href="/">
            FINE FORM
          </a>
          <p>SEU PAINEL · VERSÃO 4.0</p>
          <nav className="admin-nav" aria-label="Gestão">
            {tabs.map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-bottom">
            <a href="/" target="_blank" rel="noopener noreferrer">
              Abrir o site ↗
            </a>
            <button
              type="button"
              onClick={() =>
                void auth.logout().catch((e) => toast(messageOf(e)))
              }
            >
              Sair do painel
            </button>
          </div>
        </aside>
        <main className="admin-main" id="conteudo">
          <div className="admin-top">
            <div>
              <h1>{titles[tab]}</h1>
              <p className="live-state">{live}</p>
            </div>
            <div className="system-actions">
              <button
                className="button outline"
                onClick={() => {
                  if (detail) {
                    toast("Feche ou recarregue o registro para atualizar.");
                    return;
                  }
                  changed();
                }}
              >
                Atualizar
              </button>
              <button
                className="button outline"
                onClick={() =>
                  void auth.logout().catch((e) => toast(messageOf(e)))
                }
              >
                Sair
              </button>
            </div>
          </div>
          {pending && (
            <p className="admin-note-banner" role="status">
              Há atualizações. Salve o que está editando e toque em Atualizar.
            </p>
          )}
          <div id="admin-view">
            {tab === "dashboard" && (
              <AdminOverview revision={revision} open={show} />
            )}{" "}
            {tab === "quotes" && (
              <QuotesTable revision={revision} open={show} />
            )}{" "}
            {(tab === "subscriptions" || tab === "plates") && (
              <>
                <SubscriptionsTable revision={revision} open={show} />
                {tab === "plates" && (
                  <>
                    <h2>Pedidos e cadastro presencial.</h2>
                    <QuotesTable revision={revision} open={show} />
                  </>
                )}
              </>
            )}
            {tab === "agenda" && <Agenda revision={revision} open={show} />}{" "}
            {tab === "customers" && (
              <Customers revision={revision} open={show} />
            )}{" "}
            {tab === "notifications" && <Notifications />}
            {tab === "settings" && <Settings revision={revision} />}
          </div>
        </main>
      </div>
      {detail && (
        <Modal
          title={
            detail.type === "quote"
              ? "Pedido de cuidado."
              : detail.type === "customer"
                ? "Dados do cliente."
                : "Fine Form Care."
          }
          onClose={() => {
            const next = pendingNotification.current;
            pendingNotification.current = "";
            show(next ? { type: "quote", id: next } : null);
            if (pending) changed();
          }}
        >
          {link && (
            <section className="system-success">
              <strong>Link privado do cliente</strong>
              <p>
                Guarde este link antes de fechar. Compartilhe pelo contato
                conferido.
              </p>
              <a className="tracking-link" href={link}>
                {link}
              </a>
              <button
                className="button outline"
                onClick={() =>
                  copyText(link)
                    .then(() => toast("Link copiado."))
                    .catch((e) => toast(messageOf(e)))
                }
              >
                Copiar link
              </button>
            </section>
          )}
          {detail.type === "quote" && (
            <QuoteEditor
              key={detail.id}
              id={detail.id}
              changed={changed}
              open={show}
              created={created}
            />
          )}{" "}
          {detail.type === "subscription" && (
            <SubscriptionEditor
              key={detail.id}
              id={detail.id}
              changed={changed}
              close={() => show(null)}
              created={created}
            />
          )}{" "}
          {detail.type === "manual" && (
            <ManualSubscription
              changed={changed}
              open={show}
              created={created}
            />
          )}{" "}
          {detail.type === "customer" && (
            <CustomerEditor
              id={detail.id}
              changed={changed}
              close={() => show(null)}
            />
          )}
        </Modal>
      )}
      {auth.reauth && (
        <Modal title="Confirme seu acesso." onClose={auth.cancelReauth}>
          <p>
            Esta operação exige uma nova confirmação com chave e autenticador.
          </p>
          <AccessForm error={auth.error} onSubmit={auth.login} />
        </Modal>
      )}
    </>
  );
}
export function AccessForm({
  error,
  onSubmit,
}: {
  error: string;
  onSubmit: (key: string, code: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const lock = useRef(false);
  return (
    <form
      ref={form}
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        const data = new FormData(e.currentTarget);
        try {
          await onSubmit(
            String(data.get("key")),
            String(data.get("code") || ""),
          );
        } finally {
          form.current?.reset();
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <Field
        label="Chave do painel"
        name="key"
        type="password"
        minLength={32}
        maxLength={4096}
        autoComplete="current-password"
        required
      />
      <Field
        label="Código do autenticador"
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
      />
      <ErrorMessage message={error} />
      <button className="button orange" type="submit" disabled={busy}>
        {busy ? "Verificando…" : "Abrir painel ↗"}
      </button>
    </form>
  );
}
