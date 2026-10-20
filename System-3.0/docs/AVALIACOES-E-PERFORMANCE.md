# Avaliações depois da entrega e experiência no celular

O status final do pedido agora aparece como **Retirado / entregue**. Use-o somente depois de devolver o veículo. “Pronto para retirada” continua sendo uma etapa anterior e não libera a avaliação.

## Jornada do cliente

1. No recibo do pedido ou no acompanhamento, o cliente pode ativar o convite de avaliação neste aparelho. A permissão é solicitada somente após o toque no botão. É possível desativar o convite depois.
2. A entrega grava o convite na mesma transação da mudança de status. O processamento começa em segundo plano; o cron existente tenta novamente em caso de falha temporária. Há limite de cinco tentativas e sete dias de validade na fila, sem reenviar um convite já confirmado pelo provedor. Como em Web Push em geral, uma interrupção entre a entrega ao provedor e a confirmação local pode repetir o envio; a tag estável substitui a notificação no aparelho.
3. O aviso abre `/avaliar/` com uma autorização restrita à avaliação, em fragmento, válida por trinta dias. Essa autorização não permite consultar o pedido completo e é invalidada quando o operador reemite o link privado. O cliente também pode avaliar pelo acompanhamento, mesmo sem permitir notificações.
4. O cliente escolhe de uma a cinco estrelas, pode escrever até 600 caracteres e autoriza a publicação. Uma avaliação por pedido; reenvios retornam a mesma avaliação. Não há filtragem por nota.
5. A seção **Avaliações**, na página inicial, mostra média, quantidade e avaliações de pedidos entregues, seis por página. Somente primeiro nome, nota, comentário, tipo de veículo e data são publicados. Não são publicados telefone, modelo, placa, referência, identificador nem link do pedido.

A fila utiliza os provedores e a chave VAPID já configurados. O service worker do cliente fica em `/acompanhar/sw.js`, separado do painel, e não intercepta nem armazena páginas privadas. Aparelhos sem suporte recebem uma explicação e continuam com acesso à avaliação pelo acompanhamento. No iPhone, use a página adicionada à Tela de Início.

Visitas do Care com pedido vinculado também geram o convite ao serem concluídas. Registros manuais sem pedido não têm link de cliente nem inscrição para envio. Avaliações, inscrições e trabalhos são removidos em cascata na exclusão do pedido ou cliente. O backup administrativo inclui as avaliações.

## Performance e movimento

- `src/studio-motion.mjs` é a entrada atual do build dos efeitos. Galeria com swipe, setas e teclado, pasta interativa e faixa animada usam JavaScript nativo e CSS. Os antigos componentes React permanecem como referência; seus arquivos de execução não são carregados pela página inicial.
- O pacote antigo dos efeitos tinha 358.011 bytes; a nova entrada fica em aproximadamente 6,4 KB, sem React/Motion na execução da página. Essa é uma redução de transferência e execução, não uma medição de FPS ou de tempo de carregamento em um aparelho real.
- A rolagem do celular é nativa e não executa o cálculo de parallax. No desktop, o listener passivo é ativado somente enquanto o topo está visível e há movimento permitido. As animações de entrada usam opacidade e transformações, com duração menor no celular.
- A faixa para de animar fora da tela ou com a aba oculta. A preferência por movimento reduzido e o botão para pausar animações continuam respeitados. A galeria não avança automaticamente.
- As três fontes passam de 276.704 para 56.792 bytes em WOFF2, com caracteres latinos e acentos. Fotografias recebem versões menores para telas pequenas, dimensões e carregamento diferido abaixo da primeira dobra. A foto principal continua prioritária.
- A lista de avaliações só consulta a API quando se aproxima da tela. Telas privadas e APIs continuam sem cache; somente fontes com nome versionado têm cache longo.

## Publicação e validação

Execute `npm run check`. O pipeline existente do GitHub executa a mesma verificação e `npm run deploy`, aplicando `0006_customer_reviews.sql` antes de publicar. A migração adiciona tabelas e índices sem reescrever pedidos ou clientes.

Os testes cobrem elegibilidade, consentimento, dados públicos, notas baixas, reenvio concorrente, rollback da fila, criptografia Web Push, restrição do link, expiração/revogação, retentativas, exclusão em cascata, clique do aviso e formulário. Testes de DOM não substituem medição visual em navegador ou em um celular real.
