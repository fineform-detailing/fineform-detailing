# Arquitetura e capacidade

O site usa arquivos estáticos para a apresentação e formulários. Somente `/api/*` executa o Worker. O D1 guarda pedidos, clientes, planos, ciclos, visitas e auditoria. Um Durable Object com backend SQLite distribui avisos de mudança por WebSocket; os dados continuam no D1.

## Por que D1 nesta versão

Os dados têm relações claras: cliente → veículo/plano → ciclo → visitas. SQL oferece índices, chaves estrangeiras e operações condicionais para reservar saldo com consistência. O binding `DB` acessa o banco dentro do Cloudflare, evitando uma URL com usuário/senha e infraestrutura de outro provedor. O MongoDB seria possível, mas acrescentaria uma conta, conectividade e configuração que esta versão não precisa.

## Limites gratuitos consultados em 13/10/2026

| Recurso | Workers Free |
| --- | --- |
| Worker dinâmico | 100.000 requisições por dia |
| CPU Worker | 10 ms por invocação; espera de rede não é CPU |
| Assets servidos diretamente | Requisições gratuitas e ilimitadas |
| D1 | 5 milhões de linhas lidas/dia; 100.000 escritas/dia; 5 GB no total |
| Durable Objects SQLite | 100.000 requisições/dia; 13.000 GB-s/dia de duração |

As cotas são por conta/produto e podem ser compartilhadas com outros projetos. D1 mede linhas examinadas/escritas, não apenas número de chamadas. O Free interrompe operações quando os limites correspondentes acabam; usar um plano pago muda essa política. A configuração não contrata um plano pago.

Referências oficiais:

- [Workers: preços](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1: preços](https://developers.cloudflare.com/d1/platform/pricing/)
- [Durable Objects: preços](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Hibernação de WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Wrangler: comandos D1](https://developers.cloudflare.com/workers/wrangler/commands/d1/)

## Seu volume inicial

Seis atendimentos por dia, de segunda a sábado, representam **36 por semana**. Em quatro semanas são **144 atendimentos**; seis atendimentos por dia × 24 dias de atendimento já daria 144, sem multiplicar semanas de novo. Se todos utilizassem duas visitas por mês, 144 visitas correspondem a aproximadamente **72 assinaturas**. O Care Frequente usa quatro visitas por ciclo; clientes avulsos e domingos mudam essa conta. Ela mede capacidade de agenda, não número garantido de novos clientes ou faturamento.

Esse movimento sugere boa folga para a primeira versão, mas uma visita pode gerar várias chamadas de API e leituras. Como estimativa conservadora de conexão degradada: um painel consultando a cada 30 segundos por 8 horas faz 960 consultas; seis clientes com a página aberta por 30 minutos fazem 360. Somam cerca de 1.320 chamadas de consulta naquele dia, antes das ações e conexões. Com WebSocket funcionando, essas consultas periódicas não acontecem: o cliente lê novamente quando um registro muda.

Essa é uma estimativa, não um teste de tráfego nem garantia de consumo. O painel Cloudflare mostra as métricas reais de requisições, CPU, D1 e Durable Objects. A cada crescimento relevante, confira também linhas lidas, pois histórico e busca podem examinar mais registros.

## Medidas para manter o sistema leve

- Assets são servidos antes do Worker; `run_worker_first` se limita à API.
- WebSocket usa `acceptWebSocket` com hibernação e resposta automática de ping. Não mantém um loop de servidor trabalhando continuamente.
- Avisos carregam somente `{"type":"changed"}`. A API autorizada fornece o estado atualizado.
- Conexões fecham quando a página fica oculta; reconectam ao voltar. Se falham, há consulta a cada 30 segundos e tentativas com espera crescente.
- Listas de pedidos e assinaturas têm 30 registros por página. A lista de assinaturas faz consultas em lote, sem uma consulta por cliente.
- Consultas frequentes têm índices de status, data, ciclo e assinatura. Ciclos anteriores exibidos se limitam aos últimos 12.
- Não há uploads de fotos, vídeos, e-mail automático, cron ou cobrança de cartão. Fotos podem ser enviadas na conversa do WhatsApp.
- Registros de rate limit expiram e são limpos em lotes pequenos. Há limite de oito envios por IP a cada dez minutos e oito tentativas de acesso por quinze minutos.

## Integridade dos dados

- Valores são recalculados no servidor usando o mesmo catálogo do site. Pedidos guardam a seleção e o orçamento da época.
- Dinheiro persistido fica em centavos; o orçamento do catálogo usa reais.
- Reenvio com o mesmo token e conteúdo retorna o mesmo pedido. Conteúdo diferente usando esse token é rejeitado.
- Versões impedem que uma edição antiga sobrescreva outra já salva.
- Reservas usam `INSERT ... SELECT` condicionado ao saldo e ciclo pago. Uma reserva concorrente não consegue ultrapassar a cota.
- Mudança de status, histórico e visita vinculada usam batch transacional D1.
- Renovação cria um ciclo novo. Pré-pagamento não substitui o ciclo atual.
- Nenhuma operação financeira verifica o banco bancário: confirmação de pagamento é uma ação manual do proprietário.

## Acesso

O operador entra com chave e autenticador TOTP armazenados como secrets do Worker. A sessão opaca é registrada por hash no D1; o cookie é HttpOnly, SameSite Strict e Secure em HTTPS. A validade máxima é de duas horas, com inatividade de vinte minutos. Operações sensíveis após dez minutos exigem nova autenticação. Recibos financeiros e auditoria são preservados contra edição/exclusão normal; consulte SEGURANCA.md. O cliente recebe um token aleatório de 256 bits no fragmento do link; seu hash é persistido no D1. O fragmento não é enviado como URL ao servidor: a página usa o token no cabeçalho de autorização.

Uma sessão protegida ou um link válido gera um ticket assinado de WebSocket com 60 segundos para abrir a conexão. Dados pessoais não são enviados nos avisos do socket. Cabeçalhos evitam cache da API, referenciadores e indexação das áreas privadas; as mutações verificam a origem. Não há rastreamento de publicidade.

Não é um sistema de múltiplos funcionários/níveis de permissão. A chave dá acesso administrativo completo. A versão 3.0 mantém a operação pensada para operação por Mateus, com clientes sem cadastro.
