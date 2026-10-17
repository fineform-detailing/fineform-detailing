# Validação — cadastro presencial e vitrificação de plásticos

Verificação em 17/10/2026, na Fine Form 3.0 com notificações de administrador.

| Verificação | Resultado |
| --- | --- |
| Testes automatizados completos | 138 aprovados, zero falhas |
| Build do projeto | Aprovado |
| Simulação de publicação do Worker | Aprovada |
| Sintaxe dos módulos alterados e espaços no diff | Aprovados |

Os testes abrangem orçamento sem placa, dados forjados ignorados, aceite/agendamento antes da chegada, cadastro exclusivo pelo painel, confirmação presencial, atualização do mesmo link, trilha de auditoria, correção com motivo, autenticação recente, origem e CSRF. Avulsos permitem veículos diferentes sem utilizar Care automaticamente; assinaturas exigem cadastro verificado, placa única, pagamento e conferência física em cada utilização.

Duas migrações de cenário são verificadas: a base anterior sem placas e o primeiro pacote que aceitava placa do cliente. Reservas, visitas históricas, saldos, ciclos, recibos e tabelas de notificações são preservados. Uma placa preenchida anteriormente não vira automaticamente uma confirmação presencial.

A vitrificação de plásticos é verificada no catálogo, resumo, formulário e servidor: valores carro/moto, upgrade do Extra, escolha em qualquer ordem sem revitalização duplicada, pintura separada, cera preservada na pintura e cobrança única na visita Care. Preços enviados pelo visitante não alteram o resultado do catálogo.

Os testes de interface usam JSDOM e a API no Miniflare. Não foi feito teste visual em navegador nem publicação no ambiente do proprietário. Push é verificado com provedores simulados; os módulos de envio e o limite de cinco aparelhos permanecem os anteriores.
