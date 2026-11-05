# Cartões de fidelidade

No painel, abra **Clientes → Cartão fidelidade**. O mesmo acesso aparece nos detalhes de um pedido aceito e vinculado a um cliente.

1. Marque o pedido como **Retirado / entregue**, depois da entrega real do veículo.
2. Emita o cartão, escolhendo de 2 a 30 pontos e descrevendo o prêmio. O formulário sugere 10 pontos; não há prêmio predefinido.
3. Anote o identificador do cartão no voucher físico. Selecione o pedido entregue e toque no próximo círculo branco. Ele fica preto apenas quando o servidor confirma o registro, inclusive no primeiro serviço.
4. Ao atingir a meta, confirme a entrega do prêmio. O cartão fica no histórico e pode ser emitido um novo para os próximos atendimentos.

Cada pedido entregue vale um ponto e não pode ser reaproveitado em outro cartão. Compra de plano, pedidos pendentes e pedidos de outro cliente não pontuam. As visitas Care com pedido entregue podem pontuar; visitas lançadas diretamente na assinatura sem pedido não entram nesta versão.

Somente a sessão administrativa, com autenticação recente e proteção CSRF, pode emitir, pontuar e resgatar. Cliques concorrentes usam versão e operações atômicas. Pontos e resgates guardam data e identificação da sessão do operador. A meta e o prêmio ficam fixos após a emissão; não há exclusão isolada de pontos ou resgate repetido. O controle do painel é a referência para conferir um voucher físico; não é um mecanismo de verificação da identidade de quem apresenta o cartão.

Excluir um pedido preserva o ponto já registrado e sua referência. Excluir definitivamente o cliente, pela confirmação já existente, também remove seus cartões, pontos e eventos. Os três novos conjuntos de dados entram na exportação JSON e no backup D1.

A migração `0008_loyalty.sql` é aditiva e executada pelo fluxo existente `npm run deploy`. Não atribui pontos retroativamente nem modifica pedidos existentes. Testes: `tests/loyalty.test.mjs` e `tests/loyalty-ui.test.mjs`, além de `npm run check`.
