export const stages = [
  { label: "O olhar", at: 0, title: "Seu veículo.", accent: "Em boa forma.", text: "Lavagem, polimento e proteção. Cuidado para carros e motos, com atenção do primeiro olhar ao último acabamento.", action: "Escolher meu cuidado", href: "/atendimento/", poster: "poster-0.webp" },
  { label: "Lavagem", at: .26, title: "O cuidado", accent: "começa aqui.", text: "Espuma, limpeza e enxágue. Uma etapa de cada vez, respeitando cada superfície do veículo.", action: "Conhecer as lavagens", href: "#cuidados", poster: "poster-1.webp" },
  { label: "Pintura", at: .50, title: "Olhe além", accent: "do brilho.", text: "A pintura conta uma história. A avaliação e o teste definem o polimento e a correção possível.", action: "Encontrar meu polimento", href: "/atendimento/?vehicle=car&mode=guidance&area=pintura", poster: "poster-2.webp" },
  { label: "Interior", at: .74, title: "Por dentro,", accent: "cada detalhe.", text: "Bancos, painel e carpete. Limpeza e proteção compatíveis com cada material, para cuidar também de onde você vive o carro.", action: "Cuidar do interior", href: "/atendimento/?vehicle=car&mode=guidance&area=interior", poster: "cabin.webp" },
  { label: "Resultado", at: .97, title: "Pronto para", accent: "o próximo caminho.", text: "O mesmo carro. Outro olhar. Explore o Porsche ou combine o próximo cuidado do seu veículo com Mateus.", action: "Preparar meu atendimento", href: "/atendimento/", poster: "poster-3.webp" },
] as const;
export const clampProgress = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export const stageAt = (p: number) => p < .13 ? 0 : p < .37 ? 1 : p < .64 ? 2 : p < .85 ? 3 : 4;
// Reserve a complete chapter for the cabin without jumping over exterior frames.
export const frameAt = (p: number) => {
  const n = clampProgress(p);
  return Math.round((n < .64 ? n / .64 * .72 : n < .85 ? .72 : .72 + (n - .85) / .15 * .28) * 100);
};
