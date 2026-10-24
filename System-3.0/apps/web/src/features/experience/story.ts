export const stages = [
  { label: "O olhar", at: 0, title: "Cuidado em", accent: "cada curva.", text: "Seu veículo, em boa forma. Cuidado para carros e motos, com atenção do primeiro olhar ao último acabamento.", action: "Escolher meu cuidado", href: "/atendimento/" },
  { label: "Lavagem", at: .29, title: "O cuidado", accent: "começa aqui.", text: "Espuma, limpeza e enxágue. Uma etapa de cada vez, respeitando cada superfície do veículo.", action: "Conhecer as lavagens", href: "#cuidados" },
  { label: "Pintura", at: .56, title: "Olhe além", accent: "do brilho.", text: "A pintura conta uma história. A avaliação e o teste definem o polimento e a correção possível.", action: "Encontrar meu polimento", href: "/atendimento/?vehicle=car&mode=guidance&area=pintura" },
  { label: "Resultado", at: .97, title: "Boa forma.", accent: "Por inteiro.", text: "O mesmo carro. Outro olhar. Conte sobre o seu veículo e combine o próximo cuidado diretamente com Mateus.", action: "Preparar meu atendimento", href: "/atendimento/" },
] as const;
export const clampProgress = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export const stageAt = (p: number) => p < .15 ? 0 : p < .43 ? 1 : p < .68 ? 2 : 3;
export const frameAt = (p: number) => Math.round(clampProgress(p) * 100);
