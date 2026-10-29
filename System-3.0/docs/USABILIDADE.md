# Usabilidade — 29/10/2026

| Lei | Aplicação no atendimento e na navegação |
| --- | --- |
| Fitts | Menu de 48 px, links com pelo menos 44 px, campos de 16 px e foco de teclado visível. |
| Hick | Três modalidades de atendimento; tratamentos específicos ficam em grupos expansíveis, abertos quando há seleção. |
| Zeigarnik | O rascunho opcional retoma a etapa, preserva escolhas e informa a retomada. Após enviar, o rascunho é removido e o acompanhamento vira a ação principal. |
| Jakob | Menu consistente e branco; Escape e clique fora fecham a navegação. Etapas já percorridas e botões Editar permitem corrigir o resumo. |
| Gradiente de meta | Progresso conta etapas concluídas: começa em zero e chega a 100% somente após o servidor confirmar o envio. A última etapa indica revisar e enviar. |
| Von Restorff | Próxima ação recebe a cor da marca. Na confirmação, Acompanhar pedido é a ação principal; outras opções ficam agrupadas. |
| Miller | Veículo, cuidado, detalhes, preferência e contato são etapas separadas. O resumo agrupa veículo, interesse, preferência e adicionais. |

O consentimento para guardar rascunho continua opcional e restrito ao aparelho, com validade de 30 dias. Aceites e autorização de persistência do link não são restaurados como marcados. A revisão não altera preços, escopos, reservas, cobranças ou a confirmação manual do atendimento.

Validação: testes DOM/API do fluxo completo, recuperação de rascunho, associação de erros aos campos, edição do resumo e execução do build e do dry-run de implantação. Revisão visual em desktop e quadro móvel de 390 px; sem criação de pedidos reais.
