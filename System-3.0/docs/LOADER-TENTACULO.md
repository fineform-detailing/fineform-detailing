# Abertura e mascote em React

O markup do tentáculo é o componente `apps/web/src/components/motion/IntroArtwork.tsx`. `Intro.tsx` renderiza a abertura; `useIntroViewModel.ts` controla seu ciclo de vida. A ilustração editável também está em `apps/web/public/assets/tentacle.svg`.

A coreografia fica em `apps/web/src/services/motion/`: configuração, ajuste de proporção do SVG, controle das fases, escopo de animações canceláveis e transição entre rotas públicas. CSS está em `apps/web/src/styles/intro.css`.

As fases são carregamento, alcance, agarre e revelação. Movimento reduzido, pausa, histórico, links profundos e páginas privadas não bloqueiam o acesso. Escape e Pular encerram a abertura; navegação, descarte e ocultação cancelam temporizadores e animações e devolvem foco e interação.

Os componentes são a fonte da marcação. Não há script separado que injeta o loader nas páginas compiladas. Edite os componentes ou o motor isolado e execute `npm run check`.
