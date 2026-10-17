# 3.0.0 — Segurança e recebimentos

Base: System-2.0.zip enviado por Mateus. Autenticador obrigatório em produção, sessões revogáveis, CSRF, reautenticação, limite global do segundo fator, headers/CSP do servidor e tickets de uso único. Recibos financeiros e auditoria preservados contra alteração e exclusão. Migração importa ciclos pagos existentes. Scripts de instalação, atualização com backup e preview com D1 separado. Interface, preços e correções de visitas/exclusões da 2.0 preservados.

# Versão 2.0.0 — 13/10/2026

- Backend Cloudflare Workers, D1 e acompanhamento por Durable Object SQLite.
- Envio do orçamento ao painel, referência única, reenvio sem duplicação e links privados.
- Painel com visão geral, pedido, aceite/recusa, mensagem, status, agenda e clientes.
- Acesso do operador por secret e cookie protegido, sem cadastro obrigatório para clientes.
- Care com ciclos mensais pagos, quotas por lavagem, reservas, conclusão e correção com motivo.
- Renovação, pré-pagamento, pausa, cancelamento, exclusão controlada e histórico.
- Portal do assinante com saldo, visitas e solicitação de atendimento com adicionais.
- Total calculado pelo servidor, preços do catálogo, subtotal de orientação e valor confirmado.
- Mensagem de WhatsApp com referência e link de acompanhamento.
- Exportação de dados, scripts de configuração/deploy e instruções de backup SQL.
- Site e assets originais preservados; sem Ferrofluid; card final compacto com BorderGlow.
- Testes de regras, API/D1, concorrência, WebSocket e fluxos de interface no DOM.
