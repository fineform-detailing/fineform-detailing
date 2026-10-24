"use client";
import type { Quote } from "../../models/entities";
import { usePushViewModel } from "../../hooks/usePushViewModel";
import { trackingUrl } from "../../services/browser.mjs";
import { ErrorMessage } from "../../components/ui/primitives";
export function CustomerNotice({
  quote: q,
  token,
}: {
  quote: Quote;
  token: string;
}) {
  const enabled = !["completed", "cancelled", "declined"].includes(q.status);
  const vm = usePushViewModel("customer", q.id, token, enabled);
  if (q.status === "completed")
    return (
      <section className="system-card review-invitation">
        <p className="kicker">VEÍCULO ENTREGUE / SUA EXPERIÊNCIA</p>
        <h2>Seu cuidado ficou em boa forma?</h2>
        <p>Sua opinião ajuda a Fine Form a melhorar.</p>
        <a className="button orange" href={trackingUrl(q.id, token, "avaliar")}>
          Deixar minha avaliação ↗
        </a>
      </section>
    );
  if (!enabled) return null;
  return (
    <section className="system-card customer-notice">
      <h3>Um aviso depois da entrega.</h3>
      <p>Receba um convite para avaliar quando seu veículo for retirado.</p>
      <p className="system-muted" role="status">
        {!vm.supported
          ? "A avaliação ficará disponível neste acompanhamento depois da entrega."
          : vm.active
            ? "Convite ativado neste aparelho."
            : "Ative e permita notificações neste navegador."}
      </p>
      {vm.supported && vm.data?.configured && (
        <button
          className="button outline"
          type="button"
          disabled={vm.busy}
          onClick={() => (vm.active ? vm.revoke() : vm.enable())}
        >
          {vm.busy
            ? "Aguarde…"
            : vm.active
              ? "Desativar convite neste aparelho"
              : "Ativar convite de avaliação"}
        </button>
      )}
      <ErrorMessage message={vm.error} />
    </section>
  );
}
