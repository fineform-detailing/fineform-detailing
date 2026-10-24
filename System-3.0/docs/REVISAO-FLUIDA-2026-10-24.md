# Fine Form — continuação da direção de arte

Revisão de 24/10/2026 a partir da base React `990e77f` e da amostra privada recuperada `7f8a9da`. A alteração responde às cinco referências enviadas por Mateus: composição fluida, imagens com presença na página, tipografia expressiva e retirada das divisórias horizontais decorativas.

## O que está implementado

- Abertura com hierarquia ampla, tipografia Syne e acento Instrument Serif. DM Sans para leitura. Fontes locais, licenças SIL OFL incluídas.
- Cinco capítulos do mesmo Porsche 930: apresentação, lavagem/enxágue, pintura, cabine ilustrativa e resultado. A rolagem avança e volta na sequência; os botões escolhem uma etapa e aceitam setas do teclado.
- Alternativa sem fixação por rolagem, poster inicial, respeito a movimento reduzido e carregamento voluntário em conexões de economia de dados.
- Canvas 2D com quadros previamente renderizados, três solicitações simultâneas e cache limitado a 20 imagens decodificadas. Renderização somente quando necessário, sem loop permanente.
- Superfícies contínuas, composição assimétrica dos serviços, galeria editorial, planos, perguntas, contato e rodapé sem divisórias decorativas.
- Ciano aprovado `#53c3b1`, símbolo e tentáculo originais. Preços e contratos continuam no domínio existente.
- As rotas administrativas, pedidos, assinaturas, avaliações e funções da API continuam preservadas. A prévia privada encaminha operações ao site operacional existente.

## Arquivos

`apps/web/src/features/experience/CarStory.tsx`: sequência, carregamento e controles.

`apps/web/src/features/experience/story.ts`: capítulos e pontos de progresso.

`apps/web/src/styles/fluid.css`: tipografia e direção de arte, sobre os estilos do sistema existente.

`apps/web/public/assets/experience/`: 101 quadros em dois tamanhos e quatro posters recuperados da amostra publicada. A versão desktop soma 1.91 MB; mobile, 1.05 MB. Os arquivos-fonte Blender da renderização anterior não foram recuperados.

`apps/web/public/assets/experience/sequence.json`: autoria, licença, origem e identificação dos recursos visuais.

## Validação

TypeScript, build Next.js e os 187 testes existentes passaram: 148 backend/domínio, 15 integrações React e 24 verificações de exportação/infraestrutura. Os dois Workers passaram no empacotamento `wrangler deploy --dry-run`.

Revisão visual e interação em Chromium remoto, desktop 1363 px e celular simulado por viewports de iframe de 390 e 320 px. Não houve teste em telefone físico. Catálogo carro/moto, modal de serviço, seleção de capítulos, modo sem rolagem, teclado entre capítulos, atalho para serviços, enquadramento e ausência de rolagem horizontal conferidos. Medidas de transferência são dos arquivos; não são um teste de rede móvel real ou um resultado Lighthouse.

## Limites da representação

- A cabine foi concluída como imagem conceitual correspondente (ImageGen), vista pela porta do passageiro, painel analógico clássico e couro preto. O modelo 3D não contém interior detalhado; os créditos distinguem a reconstrução ilustrativa da geometria recuperada.
- Passeio 3D implementado com o Porsche correto: acelerador, freio/ré, esterçamento, duas câmeras, pausa e reinício; teclado e botões de toque. Carrega Three.js e o modelo somente após abertura. GLTF, binário e texturas locais (~4,08 MB), sem Draco, blobs ou mudança na CSP. Renderizador e recursos liberados ao fechar.
- A espuma e o polimento são demonstrações conceituais reaproveitadas. Não são registros de serviços executados pela Fine Form.
- A prévia é estática e não espelha dados privados nem as avaliações da produção. O envio de pedidos e a autenticação continuam no site operacional.

## Continuação

A prévia existente é `appgprj_6adccb0a4cb08191833f07a943d05db3`, com acesso privado preservado. A versão publicada deve ser consultada por Sites antes de novas edições. O código também é versionado na branch `feat/fluid-art-direction` do repositório Fine Form. A conclusão solicitada integra esta revisão ao sistema operacional, mantendo os serviços web/API e o banco existentes.

## Conclusão solicitada por Mateus

Título: “Seu veículo. Em boa forma.”, alinhado à marca. Imagem de cabine gerada pelo ImageGen integrado com `poster-0.webp` como referência; prompt: vista pela porta do passageiro do mesmo Porsche 930 mint, cabine preta clássica com cinco instrumentos analógicos, volante à esquerda, bancos plissados e iluminação do estúdio original. Otimizada em WebP desktop e mobile.

Modelo de condução recuperado com licença CC BY 4.0, autor Lionsharp Studios / Karol Miklas, fonte e modificações registradas em `apps/web/public/assets/experience/porsche/LICENSE.md`. 188.959 triângulos preservados, texturas512px e quantização de posição com erro máximo ~0,05 mm. Experiência recreativa de baixa velocidade, não simulador físico certificado. O acesso e os dados operacionais continuam preservados.

## Validação da conclusão

192 testes aprovados (148 backend/domínio, 20 React e 24 exportação), TypeScript, build Next.js e empacotamento dos dois Workers em dry run. Nenhuma migração de banco foi adicionada nesta revisão. Publicação pelo fluxo existente do GitHub main para o Cloudflare.
