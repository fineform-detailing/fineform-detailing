"use client";
import { useTrackingViewModel } from "./useTrackingViewModel";
import {
  Budget,
  Location,
  PrivateFrame,
  Status,
  Loading,
  ErrorMessage,
} from "../../components/ui/primitives";
import { config, dateLabel, statusLabels } from "../../models/config";
import {
  trackingUrl,
  copyText,
  saveBookmark,
} from "../../services/browser.mjs";
import { registeredPlateLabel } from "@domain/plates.mjs";
import { useApp } from "../../components/layout/AppProvider";
import { CustomerNotice } from "../reviews/CustomerNotice";
export function TrackingView() {
  const vm = useTrackingViewModel();
  const { toast, contact } = useApp();
  const q = vm.data?.quote;
  const copy = () =>
    copyText(trackingUrl(vm.id, vm.token))
      .then(() => toast("Link copiado."))
      .catch((e: Error) => toast(e.message));
  return (
    <PrivateFrame
      title="Seu cuidado, por aqui."
      eyebrow="ACOMPANHAMENTO / FINE FORM"
      live={vm.id ? vm.live : undefined}
    >
      {!vm.ready || (vm.loading && !q) ? (
        <Loading />
      ) : !vm.id ? (
        <section className="system-card">
          <h2>Seus pedidos neste aparelho.</h2>
          <p>
            Cada pedido tem um link privado. Guarde-o para acompanhar em outro
            aparelho.
          </p>
          {vm.orders.length ? (
            <div className="system-list">
              {vm.orders.map((o) => (
                <a
                  className="system-row"
                  key={o.id}
                  href={trackingUrl(o.id, o.token)}
                >
                  <strong>{o.reference}</strong>
                  <span>Acompanhar ↗</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="system-empty">
              Se já enviou um pedido em outro aparelho, abra o link que recebeu
              de Mateus.
            </p>
          )}
          <div className="system-actions">
            <a className="button orange" href="/atendimento/">
              Preparar orçamento ↗
            </a>
            <button
              className="button outline"
              onClick={() => {
                if (
                  confirm(
                    "Apagar os links deste aparelho? Os pedidos continuam na Fine Form.",
                  )
                )
                  vm.forget();
              }}
            >
              Apagar links deste aparelho
            </button>
          </div>
        </section>
      ) : !q ? (
        <section className="system-card">
          <h2>Não foi possível abrir seu pedido.</h2>
          <ErrorMessage
            message={vm.error || "Abra o link privado completo que recebeu."}
          />
          <button className="button orange" onClick={() => contact()}>
            Falar com Mateus ↗
          </button>
        </section>
      ) : (
        <>
          <ErrorMessage message={vm.error} />
          <CustomerNotice quote={q} token={vm.token} />
          {q.status === "pending" && (
            <p className="system-note">
              Sua solicitação aguarda a análise e aceitação de Mateus. Ainda não
              há confirmação de atendimento.
            </p>
          )}
          <Location value={q.location} />
          <div className="system-grid">
            <section className="system-card">
              <Status value={q.status} />
              <h2 className="mt-5">{q.reference}</h2>
              <p>Olá, {q.name}.</p>
              <p>
                {q.message ||
                  "Mateus vai avaliar os cuidados e combinar os detalhes com você."}
              </p>
              <div className="system-note">
                <strong>{q.model}</strong>
                <br />
                {registeredPlateLabel(q)}
                <br />
                {dateLabel(q.scheduledDate || q.preferredDate)} ·{" "}
                {q.scheduledTime || q.preferredTime || "Horário a combinar"}
              </div>
              <div className="system-actions">
                <button
                  className="button outline"
                  onClick={() => void vm.reload()}
                >
                  Atualizar
                </button>
                <button
                  className="button orange"
                  onClick={() =>
                    contact(
                      "Olá, Mateus! Gostaria de falar sobre meu pedido " +
                        q.reference +
                        ".",
                    )
                  }
                >
                  Falar com Mateus ↗
                </button>
              </div>
              {q.subscriptionId && q.kind === "plan" && (
                <a
                  className="underlined-link"
                  href={trackingUrl(q.subscriptionId, vm.token, "assinatura")}
                >
                  Ver meu Fine Form Care ↗
                </a>
              )}
            </section>
            <section className="system-card">
              <Budget budget={q.budget} confirmedTotal={q.confirmedTotal} />
            </section>
          </div>
          <section className="system-card">
            <h2>O caminho do seu cuidado.</h2>
            <ol className="system-timeline">
              {vm.data?.events.map((e, i) => (
                <li key={e.created_at + i}>
                  <strong>{statusLabels[e.status] || e.status}</strong>
                  <p>{e.message}</p>
                  <time>
                    {new Date(e.created_at).toLocaleString("pt-BR", {
                      timeZone: config.timezone,
                    })}
                  </time>
                </li>
              ))}
            </ol>
          </section>
          <section className="system-card">
            <h2>Guarde seu link.</h2>
            <p>Compartilhe apenas com quem deve acompanhar este pedido.</p>
            <a className="tracking-link" href={trackingUrl(q.id, vm.token)}>
              {trackingUrl(q.id, vm.token)}
            </a>
            <div className="system-actions">
              <button
                className="button outline"
                onClick={() =>
                  toast(
                    saveBookmark(q.id, vm.token, q.reference, {
                      remember: true,
                    })
                      ? "Link guardado neste aparelho por até 90 dias."
                      : "Não foi possível guardar. Copie o link.",
                  )
                }
              >
                Guardar link por até 90 dias
              </button>
              <button className="button outline" onClick={copy}>
                Copiar link
              </button>
              <a className="button outline" href="/acompanhar/">
                Meus pedidos neste aparelho
              </a>
            </div>
          </section>
        </>
      )}
    </PrivateFrame>
  );
}
