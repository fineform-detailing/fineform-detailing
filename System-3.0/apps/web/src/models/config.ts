import brand from "@domain/brand-config.json";
export const config = Object.freeze(brand);
export const statusLabels: Record<string, string> = {
  pending: "Recebido",
  accepted: "Aceito",
  declined: "Recusado",
  in_progress: "Em cuidado",
  ready: "Pronto para retirada",
  completed: "Retirado / entregue",
  cancelled: "Cancelado",
  active: "Ativo",
  paused: "Pausado",
  scheduled: "Agendada",
};
export const visitLabels: Record<string, string> = {
  premium: "Premium",
  essential: "Essencial",
  moto: "Moto Premium",
};
export const transitions: Record<string, string[]> = {
  pending: ["accepted", "declined", "cancelled"],
  accepted: ["in_progress", "ready", "completed", "cancelled"],
  in_progress: ["ready", "completed", "cancelled"],
  ready: ["completed", "cancelled"],
  declined: [],
  completed: [],
  cancelled: [],
};
export const dateLabel = (s?: string | null) =>
  s ? s.slice(0, 10).split("-").reverse().join("/") : "A combinar";
export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
