export const money = (n) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
export const polishIds = ["polishLight", "polishMedium", "polishPremium"];
const paintPreparation = [
  "Lavagem técnica e descontaminação da pintura conforme necessidade",
  "Inspeção da pintura e teste para definir o processo",
];
const paintNotice =
  "O teste define os riscos que podem ser melhorados sem comprometer a pintura. Não inclui lixamento, retoque, repintura ou funilaria.";
const essentialDetails = [
  {
    title: "Exterior",
    items: [
      "Lavagem da carroceria e secagem cuidadosa.",
      "Limpeza das rodas e pneus nas partes acessíveis, sem desmontagem.",
    ],
  },
  {
    title: "Interior",
    items: [
      "Aspiração dos bancos, carpete e tapetes; limpeza dos tapetes, painel e console.",
    ],
  },
  { title: "Vidros", items: ["Limpeza dos vidros por dentro e por fora."] },
];
const premiumDetails = [
  ...essentialDetails,
  {
    title: "Mais detalhes",
    items: ["Limpeza de emblemas, frestas e vãos de portas acessíveis."],
  },
  {
    title: "Mais proteção",
    items: [
      "Proteção dos plásticos internos e cera na pintura, conforme o material.",
    ],
  },
];
const extraDetails = [
  {
    title: "Exterior completo",
    items: [
      "Pré-lavagem, lavagem e secagem; emblemas, frestas e vãos de portas.",
      "Rodas, pneus e caixas de roda acessíveis, com descontaminação quando indicada e acabamento dos pneus.",
    ],
  },
  {
    title: "Pintura e acabamentos",
    items: [
      "Descontaminação e polimento Premium da pintura elegível quando necessário, após avaliação e teste.",
      "Limpeza e proteção de manutenção dos plásticos externos.",
    ],
  },
  {
    title: "Interior completo",
    items: [
      "Higienização dos bancos de tecido ou limpeza e condicionamento dos bancos de couro.",
      "Painel, console, forros, teto e cintos; tapetes, carpete acessível e porta-malas vazio.",
      "Limpeza e proteção dos plásticos internos.",
    ],
  },
  {
    title: "Vidros",
    items: [
      "Limpeza interna e externa, tratamento de marcas d’água removíveis e proteção hidrorrepelente nos vidros externos compatíveis.",
    ],
  },
  {
    title: "Finalização",
    items: ["Cera na pintura compatível e revisão do acabamento."],
  },
];
const detailItems = (sections) => sections.flatMap((section) => section.items);
export const services = [
  {
    id: "essential",
    vehicle: "car",
    label: "Essencial",
    class: "Classe A",
    price: 100,
    tag: "O básico, muito bem feito",
    description:
      "Limpeza por fora e por dentro, rodas, pneus e vidros. O cuidado da rotina, com capricho em cada etapa.",
    includes: detailItems(essentialDetails),
    sections: essentialDetails,
    included: [],
    notice:
      "Cuidado de manutenção. Higienização profunda, cera e tratamentos de pintura são serviços separados.",
  },
  {
    id: "premium",
    vehicle: "car",
    label: "Premium",
    class: "Classe B",
    price: 180,
    tag: "Mais detalhes. Mais proteção.",
    description:
      "Todo o cuidado da Essencial, com atenção às frestas e emblemas, proteção dos plásticos internos e cera na pintura.",
    includes: detailItems(premiumDetails),
    sections: premiumDetails,
    included: ["wax", "interiorPlastic"],
    notice:
      "Higienização profunda, polimento, vitrificação e tratamento de marcas d’água são serviços separados.",
  },
  {
    id: "extra",
    vehicle: "car",
    label: "Extra",
    class: "PACOTE COMPLETO",
    price: 1590,
    tag: "Por fora. Por dentro. Por inteiro.",
    description:
      "Cuidado completo do exterior e do interior, com higienização profunda, tratamento dos vidros e polimento Premium quando necessário.",
    includes: detailItems(extraDetails),
    sections: extraDetails,
    included: [
      "wax",
      "interiorPlastic",
      "exteriorPlastic",
      "leather",
      "fabric",
      "carpet",
      "wheelIron",
      "paintIron",
      "glassCare",
    ],
    covered: ["fullClean", ...polishIds],
    notice:
      "Os bancos precisam de tempo para secar após a higienização. O prazo de entrega é combinado considerando essa secagem.",
  },
  {
    id: "fullClean",
    vehicle: "car",
    label: "Higienização completa",
    class: "Classe C",
    price: 450,
    tag: "De dentro para fora",
    description:
      "Higienização profunda dos bancos e do interior. Vai além da limpeza de manutenção já incluída nas lavagens.",
    includes: [
      "Bancos de tecido por extração ou couro com limpeza e condicionamento compatível",
      "Carpete acessível, tapetes e porta-malas vazio",
      "Painel, console e forros",
      "Limpeza e proteção dos plásticos internos",
      "Lavagem Essencial",
    ],
    included: ["interiorPlastic", "leather", "fabric", "carpet"],
    notice:
      "Prazo de secagem combinado. Teto e cintos dependem de avaliação específica. Sem desmontagem ou tratamento do ar-condicionado.",
  },
  {
    id: "polishLight",
    vehicle: "car",
    label: "Polimento de realce",
    class: "Classe C",
    price: 420,
    tag: "Brilho e marcas leves",
    description:
      "Realce do brilho e melhora de marcas leves em toda a pintura elegível, com uma etapa de polimento.",
    includes: [
      ...paintPreparation,
      "Uma etapa de polimento na pintura elegível",
      "Lavagem Essencial e finalização com cera compatível",
    ],
    included: ["wax", "paintIron"],
    notice: paintNotice,
  },
  {
    id: "polishMedium",
    vehicle: "car",
    label: "Polimento médio",
    class: "Classe C",
    price: 690,
    tag: "Riscos mais marcados",
    description:
      "Correção localizada de riscos mais marcados em até quatro peças da carroceria, acordadas na avaliação.",
    includes: [
      ...paintPreparation,
      "Corte e refino nas peças acordadas, até quatro peças pintadas",
      "Lavagem Essencial e finalização com cera compatível",
    ],
    included: ["wax", "paintIron"],
    notice:
      paintNotice +
      " Para correção distribuída pelo carro inteiro, escolha o Premium.",
  },
  {
    id: "polishPremium",
    vehicle: "car",
    label: "Polimento Premium",
    class: "Classe C",
    price: 990,
    tag: "O carro inteiro",
    description:
      "Polimento em toda a pintura elegível do carro, com corte, refino e lustro conforme o teste de cada área.",
    includes: [
      ...paintPreparation,
      "Tratamento de toda a pintura externa elegível",
      "Corte, refino e lustro conforme a necessidade de cada área",
      "Lavagem Essencial e finalização com cera compatível",
    ],
    included: ["wax", "paintIron"],
    notice:
      paintNotice +
      " As etapas respeitam o estado e a espessura disponível da pintura.",
  },
  {
    id: "coating",
    vehicle: "car",
    label: "Vitrificação de pintura",
    class: "Classe C",
    price: 1390,
    preparedPrice: 970,
    tag: "Proteção cerâmica",
    description:
      "Preparação da pintura e aplicação manual de revestimento cerâmico em toda a pintura externa elegível.",
    includes: [
      ...paintPreparation,
      "Polimento de realce incluído na preparação",
      "Remoção de óleos e resíduos antes do revestimento",
      "Aplicação manual, nivelamento e inspeção do revestimento cerâmico",
      "Orientação de cura e manutenção conforme o produto utilizado",
    ],
    included: ["paintIron"],
    covered: ["polishLight"],
    notice:
      "R$ 1.390 pelo atendimento completo. Com um polimento ou com o Extra: acréscimo de R$ 970, sem repetir a preparação. Substitui a cera. Correção média ou Premium pode ser combinada, com abatimento do realce já incluído. Produto, condições de cura e entrega são combinados antes; vidros, rodas e plásticos não recebem este revestimento de pintura.",
  },
  {
    id: "motoPremium",
    vehicle: "moto",
    label: "Moto Premium",
    class: "Classe D",
    price: 150,
    tag: "Cuidado em duas rodas",
    description:
      "A lavagem de motos da Fine Form. Limpeza estética e acabamento com respeito a cada material.",
    includes: [
      "Carenagens e tanque compatíveis",
      "Para-lamas externos e faces acessíveis das rodas",
      "Banco, espelhos e painel",
      "Frestas externas acessíveis, secagem e cera em pintura compatível",
    ],
    included: ["wax"],
    notice:
      "Sem motor, inferior/chassi, corrente/transmissão, desmontagem, lubrificação ou manutenção mecânica. Sem pretinho nos pneus e sem acabamento escorregadio em banco, manoplas, pedaleiras ou freios.",
  },
];
export const extras = [
  {
    id: "exteriorPlastic",
    vehicle: "both",
    price: 70,
    motoPrice: 50,
    label: "Revitalização de plásticos externos",
    area: "exterior",
    description:
      "Limpeza e acabamento de manutenção dos plásticos externos compatíveis. Incluída no Extra. Para proteção cerâmica, escolha a vitrificação de plásticos.",
  },
  {
    id: "plasticCoating",
    vehicle: "both",
    price: 220,
    motoPrice: 150,
    label: "Vitrificação de plásticos externos",
    area: "exterior",
    description:
      "Limpeza, preparação e aplicação de revestimento cerâmico nos plásticos externos sem pintura e compatíveis, sem desmontagem. Substitui o acabamento de manutenção nessas peças. A entrega considera a cura; em motos, aplicação restrita a acabamentos sem contato com pneus, freios, banco, manoplas ou pedaleiras.",
  },
  {
    id: "leather",
    vehicle: "car",
    price: 190,
    label: "Tratamento dos bancos de couro",
    area: "interior",
    description:
      "Limpeza e condicionamento do conjunto de bancos compatível. Sem reparação ou tingimento. Incluído na higienização completa e no Extra.",
  },
  {
    id: "fabric",
    vehicle: "car",
    price: 250,
    label: "Higienização dos bancos de tecido",
    area: "interior",
    description:
      "Limpeza profunda por extração do conjunto de bancos compatível, com prazo de secagem combinado. Incluída na higienização completa e no Extra.",
  },
  {
    id: "wheelIron",
    vehicle: "both",
    price: 90,
    motoPrice: 50,
    label: "Descontaminação das rodas",
    area: "rodas",
    description:
      "Remoção de contaminação ferrosa em quatro rodas de carro ou duas de moto acessíveis, sem desmontagem. Incluída no Extra quando indicada.",
  },
  {
    id: "paintIron",
    vehicle: "car",
    price: 120,
    label: "Descontaminação da pintura",
    area: "pintura",
    description:
      "Tratamento de contaminação ferrosa na pintura. Incluído na preparação dos polimentos, da vitrificação e no Extra. Não substitui a descontaminação mecânica quando necessária.",
  },
  {
    id: "glassCare",
    vehicle: "car",
    price: 160,
    label: "Tratamento completo dos vidros",
    area: "vidros",
    description:
      "Limpeza técnica, tratamento de marcas d’água removíveis e proteção hidrorrepelente nos vidros externos compatíveis. Incluído no Extra.",
  },
  {
    id: "motoPolish",
    vehicle: "moto",
    price: 160,
    label: "Realce de uma peça pintada",
    area: "pintura",
    description:
      "Polimento de uma peça elegível, como o tanque, após avaliação. Não abrange toda a carenagem.",
  },
];
export const extraPrice = (extra, vehicle) =>
  vehicle === "moto" && extra.motoPrice ? extra.motoPrice : extra.price;
export const plans = [
  {
    id: "careEssential",
    vehicle: "car",
    name: "Care Essencial",
    visits: 2,
    premium: 1,
    essential: 1,
    price: 260,
    saving: 20,
    description: "Uma Premium + uma Essencial por mês.",
  },
  {
    id: "careFrequent",
    vehicle: "car",
    name: "Care Frequente",
    visits: 4,
    premium: 1,
    essential: 3,
    price: 440,
    saving: 40,
    description: "Uma Premium + três Essenciais por mês.",
  },
  {
    id: "careMoto",
    vehicle: "moto",
    name: "Care Moto",
    visits: 2,
    premium: 2,
    essential: 0,
    price: 280,
    saving: 20,
    description: "Duas lavagens Moto Premium por mês.",
  },
];
export const findService = (id) =>
  services.find((x) => x.id === (id === "correction" ? "polishMedium" : id));
export const findPlan = (id) => plans.find((x) => x.id === id);
export const compatibleExtras = (vehicle) =>
  extras.filter((x) => x.vehicle === "both" || x.vehicle === vehicle);
export function baseFor(state) {
  if (state.mode === "guidance") return undefined;
  if (state.mode === "plan")
    return state.vehicle === "moto" ? "motoPremium" : "premium";
  return findService(state.service)?.id || state.service;
}
export function normalizeTreatments(state) {
  if (state.vehicle !== "car") return [];
  const base = baseFor(state);
  const eligible = services
    .filter((s) => s.class === "Classe C")
    .map((s) => s.id);
  const covered = findService(base)?.covered || [];
  let selected = [
    ...new Set(
      (state.treatments || []).map((id) =>
        id === "correction" ? "polishMedium" : id,
      ),
    ),
  ].filter(
    (id) => eligible.includes(id) && id !== base && !covered.includes(id),
  );
  if (polishIds.includes(base))
    selected = selected.filter((id) => !polishIds.includes(id));
  const chosenPolish = selected.filter((id) => polishIds.includes(id)).at(-1);
  selected = selected.filter(
    (id) => !polishIds.includes(id) || id === chosenPolish,
  );
  if (selected.includes("coating"))
    selected = selected.filter((id) => id !== "polishLight");
  return selected;
}
export function availableTreatments(state) {
  if (state.vehicle !== "car") return [];
  const base = baseFor(state),
    covered = findService(base)?.covered || [];
  return services.filter(
    (s) =>
      s.class === "Classe C" &&
      s.id !== base &&
      !covered.includes(s.id) &&
      !(polishIds.includes(base) && polishIds.includes(s.id)) &&
      !(
        normalizeTreatments(state).includes("coating") && s.id === "polishLight"
      ),
  );
}
export function hasCoating(state) {
  return (
    baseFor(state) === "coating" ||
    normalizeTreatments(state).includes("coating")
  );
}
export function treatmentPrice(id, state) {
  const service = findService(id),
    base = baseFor(state),
    treatments = normalizeTreatments(state);
  if (!service) return 0;
  if (
    id === "coating" &&
    (base === "extra" ||
      polishIds.includes(base) ||
      treatments.some((x) => polishIds.includes(x)))
  )
    return service.preparedPrice;
  if (polishIds.includes(id) && base === "coating")
    return service.price - findService("polishLight").price;
  return service.price;
}
export function includedFor(state) {
  const ids = [baseFor(state), ...normalizeTreatments(state)];
  const included = [
    ...new Set(ids.flatMap((id) => findService(id)?.included || [])),
  ];
  return hasCoating(state) ? included.filter((id) => id !== "wax") : included;
}
export function extraPriceFor(extra, state) {
  const price = extraPrice(extra, state.vehicle);
  if (
    extra.id === "plasticCoating" &&
    includedFor(state).includes("exteriorPlastic")
  )
    return Math.max(
      0,
      price -
        extraPrice(
          extras.find((x) => x.id === "exteriorPlastic"),
          state.vehicle,
        ),
    );
  return price;
}
export function normalizeExtras(state) {
  const included = includedFor(state);
  const eligible = compatibleExtras(state.vehicle).map((x) => x.id);
  let selected = [...new Set(state.extras || [])].filter(
    (id) => eligible.includes(id) && !included.includes(id),
  );
  if (selected.includes("plasticCoating"))
    selected = selected.filter((id) => id !== "exteriorPlastic");
  const seats = selected
    .filter((id) => ["leather", "fabric"].includes(id))
    .at(-1);
  return selected.filter(
    (id) => !["leather", "fabric"].includes(id) || id === seats,
  );
}
export function todaySP(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((x) => x.type === t).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
export function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const d = new Date(date + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}
export function timesFor(date) {
  if (!validDate(date)) return [];
  const sunday = new Date(date + "T12:00:00Z").getUTCDay() === 0;
  const close = sunday ? 12 * 60 : 17 * 60 + 30;
  const times = [];
  for (let m = 9 * 60; m < close; m += 30)
    times.push(
      String(Math.floor(m / 60)).padStart(2, "0") +
        ":" +
        String(m % 60).padStart(2, "0"),
    );
  return times;
}
export function validatePreference(state, now = new Date()) {
  if (state.flexibleDate && !state.date) return "";
  if (!validDate(state.date))
    return "Escolha uma data ou marque que prefere combinar pela conversa.";
  if (state.date < todaySP(now)) return "Escolha uma data de hoje em diante.";
  if (state.time && !timesFor(state.date).includes(state.time))
    return "Escolha um horário dentro do expediente deste dia.";
  if (state.date === todaySP(now) && state.time) {
    const current = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
    if (state.time <= current)
      return "Esse horário já passou. Escolha outra preferência.";
  }
  return "";
}
export function quoteFor(state) {
  const plan = state.mode === "plan" ? findPlan(state.plan) : undefined;
  const validPlan = plan?.vehicle === state.vehicle ? plan : undefined;
  const base = state.mode === "single" ? findService(state.service) : undefined;
  const validBase = base?.vehicle === state.vehicle ? base : undefined;
  const items = [];
  if (validPlan)
    items.push({
      id: validPlan.id,
      label: validPlan.name,
      price: validPlan.price,
      kind: "monthly",
    });
  else if (validBase)
    items.push({
      id: validBase.id,
      label: validBase.label,
      price: validBase.price,
      kind: "service",
    });
  let washCount = state.vehicle === "car" && (validBase || validPlan) ? 1 : 0;
  for (const id of normalizeTreatments(state)) {
    const treatment = findService(id),
      price = treatmentPrice(id, state);
    items.push({
      id,
      label: treatment.label,
      price,
      kind: price === treatment.price ? "treatment" : "complement",
    });
    // A ceramic complement or correction upgrade already has preparation credited.
    if (state.vehicle === "car" && price === treatment.price) washCount++;
  }
  for (const id of normalizeExtras(state)) {
    const extra = extras.find((x) => x.id === id);
    const price = extraPriceFor(extra, state);
    items.push({
      id,
      label: extra.label,
      price,
      kind: price === extraPrice(extra, state.vehicle) ? "extra" : "complement",
    });
  }
  const discount = Math.max(0, washCount - 1) * findService("essential").price;
  const gross = items.reduce((sum, item) => sum + item.price, 0);
  const total = gross - discount;
  const recurring = validPlan?.price || 0;
  return {
    items,
    gross,
    discount,
    total,
    recurring,
    additional: validPlan ? total - recurring : 0,
    hasBase: Boolean(validBase || validPlan),
  };
}
export function createSummary(state) {
  const plan = findPlan(state.plan);
  const service = findService(state.service);
  const clean = (s) =>
    String(s || "")
      .replace(/[\r\n]+/g, " ")
      .trim();
  const selected = normalizeExtras(state)
    .map((id) => extras.find((x) => x.id === id))
    .filter(Boolean);
  const treatments = normalizeTreatments(state);
  const quote = quoteFor(state);
  const name = clean(state.name);
  const lines = [
    "Olá, Mateus! Tudo bem?",
    name
      ? "Meu nome é " +
        name +
        " e gostaria de cuidar do meu veículo na Fine Form."
      : "Gostaria de cuidar do meu veículo na Fine Form.",
    "",
    "*Meu veículo*",
    (state.vehicle === "moto" ? "Moto" : "Carro") + " · " + clean(state.model),
    ...(state.plateVerified === true && state.plate
      ? ["Placa: " + clean(state.plate)]
      : []),
    "",
    "*Cuidado de interesse*",
  ];
  if (state.mode === "guidance")
    lines.push("Gostaria da sua orientação para escolher o cuidado.");
  else if (state.mode === "plan" && plan)
    lines.push(
      plan.name + " — " + money(plan.price) + "/mês",
      plan.description,
      state.plateVerified === true
        ? "Assinatura exclusiva da placa " +
            clean(state.plate) +
            ". As lavagens não podem ser transferidas para outro veículo."
        : "A placa será conferida e cadastrada pessoalmente na Fine Form antes da ativação. O Care atende um único veículo.",
    );
  else if (service) lines.push(service.label + " — " + money(service.price));
  else lines.push("Gostaria de conversar sobre os cuidados.");
  if (state.goals?.length)
    lines.push("Prioridades: " + state.goals.map(clean).join(", "));
  if (treatments.length) {
    lines.push(
      "",
      "*Tratamentos para combinar*",
      ...treatments.map((id) => {
        const treatment = findService(id),
          price = treatmentPrice(id, state);
        return (
          "• " +
          treatment.label +
          " — " +
          money(price) +
          (price !== treatment.price ? " (complemento)" : "")
        );
      }),
    );
  }
  if (selected.length)
    lines.push(
      "",
      "*Cuidados adicionais*",
      ...selected.map(
        (x) =>
          "• " +
          x.label +
          " — " +
          money(extraPriceFor(x, state)) +
          (extraPriceFor(x, state) !== extraPrice(x, state.vehicle)
            ? " (complemento, acabamento de manutenção já contemplado)"
            : ""),
      ),
    );
  if (state.mode === "plan" && plan && (treatments.length || selected.length))
    lines.push(
      "Gostaria de combinar esses cuidados na visita Premium do plano.",
    );
  if (quote.items.length) {
    if (quote.discount)
      lines.push("", "Etapas em comum: −" + money(quote.discount));
    if (quote.recurring) {
      lines.push(
        "",
        "*Meu orçamento*",
        "Mensalidade: " + money(quote.recurring) + "/mês",
      );
      if (quote.additional)
        lines.push(
          "Adicionais nesta visita: " + money(quote.additional),
          "*Total deste pedido: " + money(quote.total) + "*",
          "Os adicionais são para esta visita; a mensalidade continua " +
            money(quote.recurring) +
            ".",
        );
      else lines.push("*Total mensal: " + money(quote.total) + "*");
    } else
      lines.push(
        "",
        quote.hasBase
          ? "*Total do atendimento: " + money(quote.total) + "*"
          : "*Subtotal dos cuidados escolhidos: " + money(quote.total) + "*",
      );
  }
  const date = validDate(state.date)
    ? state.date.split("-").reverse().join("/")
    : "";
  lines.push(
    "",
    "*Data e horário de preferência*",
    date
      ? date + (state.time ? " às " + state.time : " — horário a combinar")
      : "Podemos combinar pela conversa.",
  );
  if (date && state.flexibleDate)
    lines.push("Tenho flexibilidade para combinar outra data ou horário.");
  if (state.notes?.trim()) lines.push("", "*Observações*", clean(state.notes));
  const base = baseFor(state);
  if (
    base === "extra" ||
    base === "fullClean" ||
    treatments.includes("fullClean") ||
    selected.some((x) => x.id === "fabric")
  )
    lines.push(
      "",
      "Podemos combinar a entrega considerando a secagem dos bancos.",
    );
  if (selected.some((x) => x.id === "plasticCoating"))
    lines.push(
      "",
      "Revestimento cerâmico nos plásticos externos compatíveis, com preparação e prazo de cura a combinar.",
    );
  if (hasCoating(state))
    lines.push(
      "",
      "Vitrificação em substituição à cera, com prazo de cura a combinar.",
    );
  lines.push(
    "",
    quote.hasBase
      ? "Pode confirmar a disponibilidade e o prazo com esse orçamento?"
      : "Pode me orientar e confirmar o orçamento para meu veículo?",
    "Obrigado!",
  );
  return lines.join("\n");
}

// A visita usa um crédito já pago; somente os adicionais geram um novo valor.
export function planVisitQuote(state) {
  const budget = quoteFor({ ...state, mode: "single" }),
    base = budget.items[0];
  if (!base || base.kind !== "service")
    throw new Error("Escolha uma lavagem incluída no plano.");
  budget.gross -= base.price;
  budget.total -= base.price;
  budget.items[0] = {
    id: "plan_credit",
    label: base.label + " · incluída no Care",
    price: 0,
    kind: "credit",
  };
  return budget;
}
