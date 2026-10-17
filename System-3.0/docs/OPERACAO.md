# Rotina da Fine Form

## Pedidos

1. O cliente escolhe veículo, serviço/plano, adicionais, preferência de data, nome e WhatsApp. Ao enviar, o pedido é gravado no D1 e ele recebe um link privado.
2. Abra `/painel/`. Novos pedidos aparecem na visão geral e na aba Pedidos. Com o painel aberto, as atualizações chegam ao vivo.
3. Abra o pedido, confira o orçamento e a disponibilidade. Defina data/horário, escreva a mensagem para o cliente e salve como **Aceito** ou **Recusado**. Uma recusa/cancelamento exige uma explicação.
4. Para pedidos de orientação, informe o **valor completo confirmado** antes de aceitar. O subtotal inicial de adicionais não representa um preço final.
5. Atualize para **Em cuidado**, **Pronto para retirada** ou **Concluído** conforme o atendimento. As mensagens públicas aparecem no acompanhamento; anotações internas ficam só no painel.

O site recalcula os preços recebidos; um cliente não consegue definir seu próprio total na API. O resumo de WhatsApp inclui o orçamento, a referência do pedido e o link. Abrir WhatsApp/e-mail prepara uma mensagem, que é enviada somente por quem está usando o aplicativo.

Preferências não bloqueiam vagas. Não há cálculo automático da duração dos serviços; confira a capacidade antes de aceitar dois horários. A aba Agenda lista pedidos com data confirmada e visitas Care, sem incluir pedidos pendentes.

## Ativar Care

- Pedido feito pelo site: aceite o pedido de plano; após receber o pagamento, use **Ativar após pagamento** no mesmo registro. Escolha o início do ciclo.
- Cliente já conhecido: use **Cadastrar Care**, informe nome, telefone, veículo, plano e início; marque pagamento recebido.
- Confira o valor que recebeu antes de marcar a caixa. A caixa é um registro operacional; não verifica uma transação bancária.
- Copie o link privado mostrado após a ativação e envie ao cliente. O link do pedido original também abre a assinatura ativada.
- Um telefone identifica o cliente; cada Care identifica o veículo. Um veículo não pode ter dois planos ativos ou pausados ao mesmo tempo.

Ativar um plano não registra uma lavagem realizada. Registre as lavagens do primeiro ciclo em **Registrar lavagem**. Se o pedido inicial continha tratamentos/adicionais, ele mantém esses valores e preferências; combine a visita e registre a lavagem do Care quando acontecer. O site não transforma automaticamente o interesse mensal em visita consumida.

## Saldo e visitas

| Registro | Efeito no saldo |
| --- | --- |
| Pedido de visita recebido | Aguarda sua resposta; ainda não reserva saldo |
| Visita Care aceita ou agendada no painel | Reserva uma lavagem daquele tipo |
| Visita concluída | Registra o uso da lavagem reservada |
| Visita/registro cancelado com motivo | Libera o saldo daquele tipo |

Dois pedidos podem chegar enquanto há uma lavagem disponível; apenas um consegue ser aceito com esse saldo. O banco protege essa disputa. Você pode registrar uma lavagem diretamente no painel, inclusive para quem pediu por WhatsApp ou pessoalmente.

O cliente abre o portal Care, vê saldo e histórico, escolhe uma lavagem incluída e solicita a próxima visita. O valor da lavagem nesse pedido é **R$ 0**, pois já pertence ao ciclo pago. Somente os adicionais escolhidos geram um valor novo. A atualização depende da sua confirmação.

Ao mudar a data de uma visita vinculada a um pedido, o registro da lavagem acompanha a data, dentro do mesmo ciclo. Para mover a visita para um ciclo diferente, cancele o agendamento e crie outro no ciclo correto. Não conclua um atendimento futuro.

Se registrou uma lavagem por engano, use **Desfazer** e informe o motivo. O histórico de auditoria guarda a ação; o registro fica cancelado. Lavagens canceladas não diminuem o saldo.

## Renovação

- Cada ciclo dura um mês de calendário, contado da data de início. O dia original é preservado quando possível: 31/jan → 28/fev → 31/mar. O fim é exclusivo no banco: um ciclo 13/out → 13/nov pode ser utilizado até 12/nov.
- O cliente tem o saldo específico daquele ciclo; lavagens restantes não acumulam no próximo.
- Confirme um novo pagamento e use **Renovar Care**. O novo ciclo não pode se sobrepor ao anterior.
- Você pode registrar antecipadamente um ciclo futuro já pago. O portal continua mostrando o ciclo vigente; quando a nova data chega, exibe o próximo saldo automaticamente.
- Se o ciclo venceu e o cliente volta depois, o padrão inicia o novo ciclo no dia atual, com novo dia de cobrança. Para manter continuidade sem intervalo, informe o fim do ciclo anterior.
- **Pausar** impede novos pedidos/renovações, mantendo o histórico. A pausa não prolonga a validade nem congela o relógio do ciclo.
- **Cancelar** impede novas solicitações. Confira e desfaça separadamente visitas futuras que também devem ser canceladas. Os registros antigos permanecem para consulta; não há cobrança recorrente automática para interromper.
- Um plano cancelado permanece encerrado. Para um cliente que volta, cadastre um novo Care.
- **Excluir definitivamente** aparece só para plano cancelado e exige confirmação. Apaga assinatura, ciclos e visitas; preserva pedidos, cadastro do cliente e auditoria. Exporte backup primeiro.

## Links e acesso

O cliente não cria uma conta. O token aleatório do link dá acesso a um único pedido/plano e fica após `#t=`. Não remova essa parte ao copiar. Tokens são guardados como hash no banco; o painel não revela a chave original.

Acompanhar sem ID mostra os últimos links guardados naquele aparelho. O cliente pode apagá-los do aparelho. Isso não apaga os dados da Fine Form. Um rascunho guardado pode incluir nome e telefone; em aparelho compartilhado, recomece o formulário e desmarque guardar rascunho.

Se o cliente perdeu o link, confira sua identidade pelo contato registrado e use **Reemitir link privado** no pedido ou **Reemitir link do cliente** no Care. O link anterior daquele registro deixa de funcionar. Reemitir somente o portal do Care não revoga o acesso pelo pedido de origem; para revogar os dois, reemita os dois registros.

O painel publicado usa chave e autenticador, com sessão de até duas horas e inatividade de vinte minutos. Depois de dez minutos, operações sensíveis pedem nova autenticação. Execute `npm run security:setup` para renovar chave e autenticador; a troca invalida as sessões anteriores. O logout revoga a sessão no servidor.

## Backup e restauração

O painel exporta um JSON com até 5.000 registros por tabela e 15.000 no total. Acima disso, use o backup SQL completo. O JSON é para consulta/exportação; não existe importador JSON nesta versão.

```bash
npm run backup
```

Para restaurar, crie **uma base nova vazia**, evitando sobrepor os dados em uso:

```bash
npx wrangler d1 create fine-form-restaurado
npx wrangler d1 execute fine-form-restaurado --remote --file=backup.sql
```

Altere `database_name` e `database_id` do binding `DB` em `wrangler.jsonc` para a base restaurada e publique novamente. O backup SQL inclui a estrutura; não aplique a migração inicial de novo sobre as mesmas tabelas já restauradas. Confira a tabela `d1_migrations` após a restauração antes de rodar o deploy que aplica migrações.

Backups contêm dados de clientes e hashes de links. Guarde-os fora do GitHub. A versão 3.0 migra a estrutura do D1 2.0 e importa os ciclos pagos ainda existentes. Confira DEPLOY-CLOUDFLARE.md para atualizar sem criar outro banco.

## Primeira conferência após publicar

Abra o site e o painel em dois aparelhos. Envie um pedido de teste, aceite no painel e confira a atualização do acompanhamento. Faça uma assinatura de teste, registre as duas lavagens e confira que uma terceira não é aceita. Use registros fictícios nesses testes. Confira também a leitura e os botões no celular antes de divulgar `/links/` nas redes.

## Limpeza de testes no painel

Em **Pedidos**, use **Excluir** na linha ou **Excluir pedido** dentro do registro. Confirme a exclusão permanente. O pedido e seu histórico desaparecem, e seu link privado deixa de funcionar. Se for uma solicitação Care com visita vinculada, esse registro de lavagem é apagado e o saldo volta ao ciclo. A assinatura e seus pagamentos permanecem. Se for o pedido que ativou o Care, o portal próprio da assinatura continua válido; o link do pedido deixa de abri-la. Um cliente sem mais pedidos nem assinaturas é removido junto com seu último pedido aceito.

Em **Clientes**, **Excluir cliente** abre uma confirmação com os totais de pedidos, assinaturas, ciclos e lavagens vinculados. **Manter cliente** fecha sem apagar nada. **Excluir cliente e registros** remove definitivamente o cliente e esses registros, inclusive pedidos pendentes com o mesmo telefone. Os respectivos links privados deixam de funcionar. Este botão apaga também assinaturas ativas e os ciclos vinculados; confira os totais antes de confirmar. Na versão 3.0, os recibos financeiros sem nome/telefone permanecem, preservando o total de mensalidades já recebido.

As duas ações exigem sessão do painel e confirmação. Se os dados mudarem antes da exclusão, recarregue o pedido ou confira novamente o resumo do cliente. Exclusões são transações: uma falha impede a remoção parcial. Um registro técnico de auditoria da operação permanece. Nenhum dado é apagado apenas por instalar a atualização.
