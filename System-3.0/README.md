# Fine Form 4.0

Toda a interface é desenvolvida com **React 19, Next.js 16 App Router, TypeScript e Tailwind CSS 4**. Páginas, formulários, diálogos, painel e portal Care são componentes React. CSS preserva a identidade ciano da Fine Form; hooks coordenam estado e efeitos.

A aplicação continua em `System-3.0` para preservar a integração existente do GitHub com Cloudflare. A versão funcional é 4.0; o Worker público mantém o nome e o endereço anteriores.

## Estrutura

| Local | Responsabilidade |
| --- | --- |
| `apps/web/src/app/` | Rotas Next.js, layout, metadados e tratamento de erro. |
| `apps/web/src/features/` | Telas e ViewModels por funcionalidade: home, orçamento, acompanhamento, Care, avaliações, painel e informações. |
| `apps/web/src/components/` | Componentes de interface, catálogo, navegação e tentáculo. |
| `apps/web/src/hooks/` | Recursos assíncronos, atualizações ao vivo, links privados e notificações. |
| `apps/web/src/models/` | Contratos TypeScript e configuração pública. |
| `apps/web/src/services/` | Transporte HTTP, sessão, notificações e integração de animação. |
| `apps/web/src/styles/` | Tailwind, tokens da marca e CSS organizado. |
| `apps/web/public/` | Imagens, fontes, mascote e Service Workers do painel/acompanhamento. |
| `packages/domain/` | Catálogo, cálculo de preços, placas, Care, contatos e política de armazenamento compartilhados. |
| `services/api/src/domain/` | Modelos e invariantes do servidor. |
| `services/api/src/application/` | Casos de uso de pedidos, assinaturas, placas, avaliações, privacidade e cadastro. |
| `services/api/src/infrastructure/` | D1, autenticação, Web Push e Durable Object de atualizações. |
| `services/api/src/http/` | Gateway HTTP, autorização, roteamento e respostas. |
| `services/web/` | Microsserviço interno que entrega a aplicação React compilada. |
| `migrations/` | Evolução versionada do banco existente. |
| `tests/` | Regressão do domínio/API, integração React e validação do export Next.js. |

## Desenvolvimento

Use Node.js conforme `engines` de `package.json`.

```bash
npm ci
npm run db:local
npm run dev
```

`npm run dev` inicia Next.js em `http://localhost:3000` e os Workers locais em `http://localhost:8787`. Configure uma **chave somente de desenvolvimento** em `.dev.vars` para testar o painel local. Nunca copie credenciais de produção para o código.

A interface usa MVVM: a View renderiza componentes; o hook ViewModel coordena estado, validação e chamadas; modelos e serviços permanecem independentes da apresentação. A API conserva validação e autorização próprias. O navegador não decide pagamento, aceitação, crédito ou permissão de acesso.

## Verificação

```bash
npm run check
```

O comando verifica TypeScript, testa domínio e API com D1 local, exercita componentes React contra a API, compila todas as rotas, verifica arquivos e hashes CSP e executa o dry run dos dois Workers. Os testes não alteram o banco de produção.

## Publicação

```bash
npm run deploy
```

O deploy compila Next.js, publica primeiro o serviço interno `fine-form-web`, aplica somente migrações versionadas pendentes no D1 existente e publica o gateway `fine-form-3-0`. O binding privado `WEB` conecta os serviços. O serviço web não oferece endereço `workers.dev` nem URLs públicas de versões.

A interface é exportada pelo próprio Next.js. Os dados continuam dinâmicos pela API e pelos WebSockets; o export não transforma o código-fonte em HTML manual. `dist/`, `.next/` e `out/` são resultados de compilação e não devem ser editados.

O endereço público continua: <https://fine-form-3-0.fineformcare.workers.dev/>. Consulte `/api/health` para confirmar versão, banco, segurança e serviço web. A restrição de acesso ao Brasil continua no gateway, inclusive para arquivos do framework.

## Segurança e dados

O D1 existente, o namespace `LiveUpdates`, as sessões, as chaves de ambiente, os links privados, os pagamentos e o histórico permanecem vinculados aos recursos atuais. Esta migração de interface não cria um banco substituto nem reaplica dados de exemplo em produção.

A autenticação mantém MFA, CSRF, expiração, confirmação recente e revogação. O build calcula hashes das instruções inline geradas pelo Next.js para a política CSP, sem liberar scripts inline arbitrários. Pedidos e portais usam `no-store`. Nenhuma chave do painel é persistida no navegador.

Veja [arquitetura e modelagem](docs/ARQUITETURA.md), [migração React](docs/MIGRACAO-REACT.md), [publicação](docs/DEPLOY-CLOUDFLARE.md) e [operação](docs/OPERACAO.md).
