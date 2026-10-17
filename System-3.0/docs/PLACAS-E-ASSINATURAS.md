# Gestão presencial de veículos

A identificação do veículo é cadastrada pelo operador autenticado. O orçamento público recolhe modelo, contato e cuidados, sem pedir placa. `validateSelection` ignora os campos de placa ou de suposta confirmação enviados pelo cliente.

## Avulsos

Um pedido representa um atendimento de um veículo. Aceite e agendamento não dependem da placa. O operador usa `PATCH /api/admin/quotes/:id/plate` na chegada, com versão atual, placa e confirmação presencial. A transação registra placa, momento, operador e evento no histórico, sem recalcular preço ou trocar o link privado.

O cadastro precisa estar confirmado para iniciar, liberar para retirada ou concluir. O mesmo cliente pode ter pedidos de veículos diferentes, inclusive com o mesmo modelo. Não há associação automática de um avulso ao saldo de assinatura só porque a placa coincide. Pedidos encerrados não permitem reatribuir o veículo.

## Assinaturas

A ativação de um pedido exige que o veículo desse pedido já tenha sido cadastrado presencialmente e que o pagamento esteja confirmado. O cadastro direto exige placa, confirmação presencial explícita e pagamento. Existe no máximo uma assinatura ativa ou pausada por placa.

No portal, a placa é exibida para consulta; a solicitação usa a placa da assinatura no servidor. Não há campo de placa no formulário do cliente. Uma tentativa de enviar placa diferente é recusada. Nome, modelo e tipo de veículo também vêm do vínculo.

Concluir uma lavagem manual/agendada ou iniciar/liberar/concluir um pedido Care exige digitar a placa física conferida. Uma divergência não utiliza o saldo. Reservas, conclusão e cancelamento mantêm as regras de cotas já existentes.

O endpoint administrativo de placa na assinatura exige confirmação, versão e motivo para corrigir uma placa já confirmada. Correções aguardam a resolução de pedidos/reservas em aberto. Outro veículo recebe atendimento ou assinatura próprios.

## Persistência e compatibilidade

A migração 0004 permanece inalterada. A 0005 adiciona `plate_verified_at` e `plate_verified_by` a pedidos e assinaturas e atualiza as validações transacionais. Um valor antigo não é promovido automaticamente a conferência presencial.

A primeira confirmação de um vínculo antigo pode manter as reservas desse mesmo veículo. Registros abertos sem placa recebem o vínculo confirmado; registros concluídos não são reescritos. Uma placa antiga divergente com pedidos abertos exige resolver esses registros antes da correção. Créditos, valores, ciclos, recibos e tabelas de notificações não são apagados ou recriados.

As rotas de cadastro são protegidas por sessão, mesma origem, CSRF e autenticação recente. Há comparação de versão e auditoria transacional. As mudanças são publicadas para os canais privados de pedidos/assinaturas; o link do cliente continua o mesmo. Não existe consulta pública de placas.

O sistema registra a declaração do operador de que viu o veículo. A conferência presencial é feita pela Fine Form; não há consulta automática a cadastro externo de veículos.
