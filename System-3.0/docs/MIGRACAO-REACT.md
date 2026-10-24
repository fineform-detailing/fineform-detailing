# Migração React / Next.js — Fine Form 4.0

## Resultado

Todas as rotas de interface passaram a ser componentes React no App Router: página inicial, links, assistente de atendimento, acompanhamento, portal Care, avaliação, painel e sete páginas de informações. O build antigo de HTML e os controladores que renderizavam formulários por `innerHTML` foram removidos. Os módulos de domínio passaram para `packages/domain`; o código da API passou para camadas em `services/api`.

A identidade visual, o mascote, as fotografias, os contatos, os valores do catálogo, as regras de inclusão e complemento, os links privados e a operação manual permanecem. A interface usa TypeScript; hooks coordenam estado, assinaturas e requisições. Tailwind está integrado ao PostCSS e ao tema da marca.

## Recursos existentes preservados

- Worker público: `fine-form-3-0`.
- D1: `e4a5ca12-b6f6-416f-b57e-f0c389161c23`.
- Durable Object: classe `LiveUpdates`, sem mudança de namespace ou migração destrutiva.
- Secrets de produção e sessões existentes: permanecem no gateway.
- Migrações SQL: nenhuma alteração de esquema necessária para esta conversão.
- Serviço adicional: `fine-form-web`, interno, sem endereço público próprio.

## Verificação reproduzível

`npm run check` executa testes de preços, ciclo, placas, sessão, origem, CSRF, pagamentos, exclusões atômicas, avaliações e Web Push. A integração React exerce envio com resposta perdida sem duplicar pedido, ativação paga, cadastro presencial de placa, consulta por links anteriores, solicitação de visita, bloqueio de Care pausado, notas baixas e retirada de avaliação, reautenticação, expiração e ativação/reversão de notificações. A validação do export confere rotas, ativos locais, scripts do Next.js e hashes CSP, além da restrição por país.

A prévia visual hospedada foi bloqueada pelo ambiente durante esta migração, pois poderia exportar o projeto para um domínio externo de prévias. A validação local de componentes e da API não depende desse envio. Após a publicação, a conferência visual e de navegação foi realizada diretamente no próprio site, sem utilizar a prévia externa; ela identificou e corrigiu contraste herdado do cabeçalho e da lateral do assistente.

## Reversão

O código anterior continua no histórico Git. Cloudflare conserva versões do Worker e do serviço web. Para uma reversão, publique uma versão anterior do gateway com o manifesto de assets correspondente; os dados permanecem no mesmo D1. Não reverta migrações de banco nem restaure uma base antiga para desfazer uma mudança de interface.

## Manutenção

Crie uma funcionalidade em `features/<nome>`, deixe contratos em `models`, regras puras em `packages/domain` e chamadas HTTP em `services/api.ts`. Não edite o export em `dist`. Para acrescentar uma tela, crie uma rota no App Router e componha componentes existentes; não injete uma página HTML em um componente React.
