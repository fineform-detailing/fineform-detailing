import { todaySP } from "./catalog.mjs";
import { isPlate } from "./plates.mjs";
const date = (s) =>
  String(s || "")
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("/");
export function creditKinds(subscription) {
  return Object.entries(subscription?.cycle?.credits || {}).filter(
    ([, credit]) => Number(credit.quota) > 0,
  );
}
export function chooseCredit(subscription, preferred = "") {
  const kinds = creditKinds(subscription);
  return (
    kinds.find(
      ([kind, credit]) => kind === preferred && Number(credit.available) > 0,
    )?.[0] ||
    kinds.find(([, credit]) => Number(credit.available) > 0)?.[0] ||
    kinds[0]?.[0] ||
    ""
  );
}
export function visitAvailability(subscription, kind, now = todaySP()) {
  const cycle = subscription?.cycle;
  if (subscription?.status === "paused")
    return {
      allowed: false,
      reason:
        "Seu Care está pausado. Fale com Mateus para reativar e combinar a visita.",
    };
  if (subscription?.status === "cancelled")
    return {
      allowed: false,
      reason:
        "Este Care foi cancelado. Fale com Mateus para iniciar um novo plano.",
    };
  if (subscription?.status !== "active" || !cycle)
    return {
      allowed: false,
      reason:
        "Seu Care ainda precisa de um ciclo ativo. Fale com Mateus para ativar o plano.",
    };
  if (!cycle.paid)
    return {
      allowed: false,
      reason:
        "O pagamento deste ciclo ainda precisa ser confirmado por Mateus.",
    };
  if (cycle.notStarted || cycle.starts_on > now)
    return {
      allowed: false,
      reason:
        "Seu ciclo começa em " +
        date(cycle.starts_on) +
        ". As solicitações ficam disponíveis a partir dessa data.",
    };
  if (cycle.expired || cycle.ends_on <= now)
    return {
      allowed: false,
      reason:
        "Seu ciclo terminou. Fale com Mateus para confirmar a renovação e liberar novas lavagens.",
    };
  if (!subscription.plateVerified || !isPlate(subscription.plate))
    return {
      allowed: false,
      reason:
        "O veículo deste Care precisa de cadastro presencial com Mateus. Seu saldo está preservado; a conferência da placa libera novas solicitações.",
    };
  const kinds = creditKinds(subscription);
  if (!kinds.some(([, credit]) => Number(credit.available) > 0))
    return {
      allowed: false,
      reason:
        "As lavagens deste ciclo já foram utilizadas ou reservadas. Confira suas visitas ou fale com Mateus.",
    };
  if (
    !kind ||
    !cycle.credits[kind] ||
    Number(cycle.credits[kind].available) < 1
  )
    return {
      allowed: false,
      reason:
        "Esta lavagem não tem saldo disponível. Escolha outra lavagem incluída no seu Care.",
    };
  return {
    allowed: true,
    reason:
      "Sua lavagem está disponível. O atendimento será confirmado por Mateus.",
  };
}
