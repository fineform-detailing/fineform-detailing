import type { Selection } from "../../models/entities";
import {
  services,
  plans,
  findService,
  findPlan,
  normalizeExtras,
  normalizeTreatments,
  validatePreference,
  polishIds,
} from "@domain/catalog.mjs";
export const goals = [
  "Manutenção",
  "Interior",
  "Pintura",
  "Rodas",
  "Acabamentos",
  "Quero orientação",
];
export const emptySelection = (): Selection => ({
  vehicle: "car",
  model: "",
  mode: "single",
  service: "essential",
  plan: "careEssential",
  goals: [],
  extras: [],
  treatments: [],
  date: "",
  time: "",
  flexibleDate: true,
  name: "",
  phone: "",
  notes: "",
  ack: false,
  rememberLink: false,
});
export function sanitizeSelection(raw: Partial<Selection> | null): Selection {
  const s = emptySelection();
  if (!raw) return s;
  s.vehicle = raw.vehicle === "moto" ? "moto" : "car";
  s.mode = ["single", "plan", "guidance"].includes(raw.mode || "")
    ? raw.mode!
    : "single";
  const service = findService(raw.service),
    plan = findPlan(raw.plan);
  s.service =
    service?.vehicle === s.vehicle
      ? service.id
      : s.vehicle === "car"
        ? "essential"
        : "motoPremium";
  s.plan =
    plan?.vehicle === s.vehicle
      ? plan.id
      : s.vehicle === "car"
        ? "careEssential"
        : "careMoto";
  for (const k of ["model", "name", "phone", "date", "time", "notes"] as const)
    s[k] =
      typeof raw[k] === "string"
        ? raw[k]!.slice(0, k === "notes" ? 600 : 80)
        : "";
  s.goals = Array.isArray(raw.goals)
    ? raw.goals.filter((x) => goals.includes(x))
    : [];
  s.extras = Array.isArray(raw.extras)
    ? raw.extras.filter((x) => typeof x === "string")
    : [];
  s.treatments = Array.isArray(raw.treatments)
    ? raw.treatments.filter((x) => typeof x === "string")
    : [];
  s.flexibleDate = raw.flexibleDate !== false;
  return normalizeSelection(s);
}
export function normalizeSelection(s: Selection): Selection {
  return {
    ...s,
    treatments: normalizeTreatments(s),
    extras: normalizeExtras(s),
  };
}
export function selectionFromQuery(
  s: Selection,
  query: URLSearchParams,
): Selection {
  const next = { ...s },
    service = findService(query.get("service")),
    plan = findPlan(query.get("plan"));
  if (query.get("vehicle") === "moto" || query.get("vehicle") === "car")
    next.vehicle = query.get("vehicle") as Selection["vehicle"];
  if (service) {
    next.vehicle = service.vehicle as Selection["vehicle"];
    next.service = service.id;
    next.mode = "single";
    next.extras = [];
    next.treatments = [];
  }
  if (plan) {
    next.vehicle = plan.vehicle as Selection["vehicle"];
    next.plan = plan.id;
    next.mode = "plan";
    next.extras = [];
    next.treatments = [];
  }
  if (query.get("mode") === "guidance") next.mode = "guidance";
  const areas: Record<string, string> = {
    pintura: "Pintura",
    interior: "Interior",
    rodas: "Rodas",
    exterior: "Acabamentos",
  };
  if (areas[query.get("area") || ""]) {
    next.goals = [areas[query.get("area")!]];
    next.mode = "guidance";
  }
  return sanitizeSelection(next);
}
export function validateStep(s: Selection, step: number): string {
  if (step === 0 && s.model.trim().length < 2)
    return "Conte a marca e o modelo do veículo para continuar.";
  if (
    step === 1 &&
    s.mode === "single" &&
    !services.some((v) => v.id === s.service && v.vehicle === s.vehicle)
  )
    return "Escolha um cuidado para o seu veículo.";
  if (
    step === 1 &&
    s.mode === "plan" &&
    !plans.some((p) => p.id === s.plan && p.vehicle === s.vehicle)
  )
    return "Escolha um plano para o seu veículo.";
  if (step >= 3) {
    const invalid = validatePreference(s);
    if (invalid) return invalid;
  }
  if (step === 4) {
    if (s.name.trim().length < 2)
      return "Conte seu nome para preparar o resumo.";
    if (!/^(?:55)?\d{10,11}$/.test(s.phone.replace(/\D/g, "")))
      return "Informe seu WhatsApp com DDD.";
    if (!s.ack)
      return "Confirme que o pedido depende de uma conversa com Mateus.";
  }
  return "";
}
export function toggleAddon(
  s: Selection,
  id: string,
  kind: "extras" | "treatments",
): Selection {
  let selected = s[kind].includes(id)
    ? s[kind].filter((x) => x !== id)
    : [...s[kind], id];
  if (kind === "extras" && selected.includes(id)) {
    if (id === "leather") selected = selected.filter((x) => x !== "fabric");
    if (id === "fabric") selected = selected.filter((x) => x !== "leather");
  }
  if (kind === "treatments" && polishIds.includes(id) && selected.includes(id))
    selected = selected.filter((x) => !polishIds.includes(x) || x === id);
  return normalizeSelection({ ...s, [kind]: selected });
}
