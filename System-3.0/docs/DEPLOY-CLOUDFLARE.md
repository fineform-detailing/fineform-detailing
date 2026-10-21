# Fine Form 3.0 — instalação, D1, Cloudflare e GitHub

**Sem computador:** use [ATUALIZAR-PELO-CELULAR.md](../ATUALIZAR-PELO-CELULAR.md). No repositório `fineform-detailing/fineform-detailing`, o diretório raiz do aplicativo é `System-3.0`. O guia abaixo também documenta instalação pelo terminal.

Este pacote usa o seu System-2.0.zip como base. Mantém a aparência, o catálogo, os preços e as últimas correções de visitas, exclusões e restauração de arquivos. As mudanças de segurança ficam no servidor e no painel. O ZIP contém código e arquivos públicos, sem node_modules, banco local, backup ou secrets reais.

## 1. Escolha como publicar

**Se já existem clientes ou recebimentos: atualize o Worker atual, mantendo o D1.** A versão do aplicativo será 3.0, mesmo que o nome técnico do Worker continue `fine-form-2-0`. Isso preserva a URL e evita deixar uma versão antiga com acesso ao mesmo banco. Não precisa apagar o repositório para isso.

Para uma instalação realmente nova, use `fine-form-3-0` e um D1 novo. O banco novo começa vazio. Apagar o D1 antigo não transfere os registros para a versão nova.

## 2. Preparar o computador

Instale Node.js 24 LTS atualizado (24.15 ou superior). Extraia o ZIP: a pasta `System-3.0` deve conter diretamente `package.json`, `wrangler.jsonc`, `worker`, `migrations` e `dist`. Abra **essa pasta** no VS Code e o terminal PowerShell.

```powershell
npm.cmd ci
npx.cmd wrangler login
```

Entre na mesma conta Cloudflare usada pelo projeto. Havendo várias organizações, escolha a correta ou defina seu `account_id` em `wrangler.jsonc`. O UUID do D1 e o ID da conta não são senhas.

## 3A. Atualizar, mantendo o banco e a URL atuais

Não crie outro D1. Na pasta System-3.0, execute:

```powershell
npm.cmd run reuse -- "C:\Users\Mateus Monteiro\Downloads\fine-form\project\System-2.0"
```

Esse comando lê o `wrangler.jsonc` antigo, faz um backup SQL remoto em `backups/` e grava no projeto novo o Worker e o D1 existentes. Só continua depois de concluir o backup. Preserve essa cópia fora do repositório.

No Cloudflare, abra o Worker atual em **Workers & Pages → seu Worker → Settings → Builds**. Desconecte o build automático que usa o código 2.0 antes de publicar a 3.0; depois conecte o repositório com os novos arquivos. Um build antigo não deve voltar a publicar o login antigo.

Continue, uma linha por vez:

```powershell
npm.cmd run db:remote
npm.cmd run security:setup
npm.cmd run deploy
```

- `db:remote` aplica somente migrações pendentes. A `0002_security.sql` cria sessões, proteção contra repetição do autenticador, tickets e o histórico financeiro. Copia os ciclos pagos já existentes para recibos; mantém clientes e assinaturas.
- `security:setup` gera uma chave forte e o segredo do autenticador no seu próprio computador. Cadastre a conta no aplicativo autenticador, informe um código de seis dígitos e guarde a chave e a recuperação. Os valores vão para secrets do Worker, sem serem gravados no código.
- `deploy` compila, aplica migrações pendentes e publica código e assets. Ao concluir, a URL atual passa a executar a versão 3.0.

**Não copie o `wrangler.jsonc` de uma instalação vazia sobre sua configuração real.** `reuse` existe para preservar os IDs e bindings corretos.

## 3B. Criar uma instalação nova e vazia

Se você escolheu começar sem os registros anteriores, mantenha o `wrangler.jsonc` que vem no ZIP: nome `fine-form-3-0`, D1 `fine-form-3-0` e UUID ainda fictício.

No Cloudflare:

1. Abra **Workers & Pages → Create application**.
2. Crie um **Worker**, usando a opção de exemplo/Hello World caso seja necessário criar primeiro o aplicativo vazio.
3. Dê o nome **fine-form-3-0**, igual ao `name` de `wrangler.jsonc`.
4. Faça o deploy inicial do exemplo; os comandos abaixo vão substituí-lo pelo sistema.

No terminal da pasta System-3.0:

```powershell
npm.cmd run configure
npm.cmd run deploy
```

`configure` encontra ou cria o D1 `fine-form-3-0`, registra seu UUID em `wrangler.jsonc`, aplica as duas migrações e chama a configuração do autenticador. Siga os campos apresentados no terminal. `deploy` publica a aplicação completa.

Esse é um **Worker com Assets, API, D1 e Durable Objects**. A pasta de arquivos estáticos é `dist`; o arquivo que executa a API é `worker/index.mjs`. Fazer somente upload de `dist` não instala o painel com banco de dados.

## 4. Conferir D1, LIVE e secrets

No seu Worker, confira os bindings:

| Tipo | Nome do binding | Recurso |
| --- | --- | --- |
| D1 Database | `DB` | O banco configurado em `wrangler.jsonc` |
| Durable Object | `LIVE` | Classe `LiveUpdates`, com SQLite |
| Assets | `ASSETS` | Conteúdo de `dist`, administrado pelo Wrangler |

Em **Settings → Variables and Secrets**, confira a existência dos secrets **ADMIN_KEY** e **ADMIN_TOTP_SECRET**. Eles são secrets do Worker em execução. Não são variáveis públicas do frontend nem do build. O setup grava ambos automaticamente.

As migrações do Durable Object ficam no campo `migrations` do Wrangler e o deploy configura a classe. Não crie uma tabela LIVE manualmente no D1. Não é preciso MongoDB, DATABASE_URL ou uma senha de conexão para D1.

## 5. Colocar no GitHub e configurar o build

Suba o **conteúdo de System-3.0** na raiz do repositório: `package.json`, `package-lock.json`, `wrangler.jsonc` já configurado, `worker`, `migrations`, `dist`, `src`, `scripts`, `tests` e `docs`. Inclua o `.gitignore`. Não suba `node_modules`, `.wrangler`, `.dev.vars`, `.env` nem `backups`.

No Cloudflare, conecte esse repositório ao Worker preparado acima. Ao criar o aplicativo por GitHub, ou em **Settings → Builds**, use:

| Campo | Preencher |
| --- | --- |
| Nome do Worker/app | O `name` do seu `wrangler.jsonc`; `fine-form-3-0` se instalação nova, ou o nome preservado por `reuse` |
| Production branch | `main`, ou a branch que você realmente vai publicar |
| Root directory | `/` quando o conteúdo estiver na raiz; `System-3.0` se você subiu essa pasta inteira |
| Framework/preset | Sem framework/preset específico, se esse campo aparecer |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Preview command | `npm run preview`, somente depois da configuração separada abaixo |
| Builds for non-production branches | Desativado no primeiro deploy; ative após configurar e testar o preview |
| Build variable | `NODE_VERSION = 24.19.0`, versão usada na validação deste pacote |
| Output/static directory, se solicitado | `dist`; a configuração principal continua no Wrangler |

O runtime de build instala dependências conforme `package-lock.json`. Se houver campo separado de instalação, use `npm ci`.

O token usado pelo Workers Builds precisa de permissão para publicar o Worker e aplicar migrações D1 na conta correta. Inclua **D1: Edit** no token de build e mantenha **Deploy command = `npm run deploy`**, para que a atualização do banco também aconteça no Cloudflare. Nenhum token Cloudflare deve ser salvo no repositório.

`ADMIN_KEY` e `ADMIN_TOTP_SECRET` ficam nos secrets de execução do Worker. Não coloque esses dois valores em Build variables, `dist/config.js`, `wrangler.jsonc` ou GitHub.

## 6. Configurar preview com banco separado

Primeiro deixe a produção funcionando. Na mesma pasta:

```powershell
npm.cmd run preview:configure
npm.cmd run preview -- --name teste
npm.cmd run security:setup -- --preview teste
```

- O primeiro comando cria um D1 separado, com nome terminado em `-preview`, aplica migrações nele e registra os bindings em `previews`.
- O segundo cria o Preview chamado `teste`. O script confere que seu D1 é diferente de produção e que o arquivo de migrações aponta para esse mesmo D1.
- O terceiro cria chave e autenticador próprios para `teste`. Até essa etapa, o painel desse Preview permanece bloqueado.
- O Cloudflare cria um namespace novo de Durable Objects por Preview. O projeto declara o binding `LIVE` no bloco `previews`.

Depois, envie ao GitHub os dois arquivos atualizados: `wrangler.jsonc` e `wrangler.preview-migrations.jsonc`. Aí pode habilitar builds de branches de teste com **Preview command = `npm run preview`**. Para uma branch nova, configure seus secrets com `npm.cmd run security:setup -- --preview NOME_DO_PREVIEW` usando o nome que o Cloudflare mostrar. Cada Preview tem secrets próprios. O D1 de teste deste fluxo é compartilhado entre seus Previews, sempre separado de produção.

Os novos **Previews** do Cloudflare são diferentes das antigas **Version URLs**. Neste projeto use `wrangler preview`; não use `wrangler versions upload` como atalho para testar contra o banco de produção. URLs de Preview são públicas por padrão; use apenas clientes fictícios ali.

## 7. Verificar o deploy

Use a URL que o terminal do Wrangler mostrar:

1. Abra `/api/health`. Nesta revisão, confira `release: "2026-10-21-appointments"`, `locationSharing: true` e os indicadores `ready`, `database`, `security`, `mfa` e `realtime` verdadeiros. A migração aditiva `0007_business_profile.sql` cria o cadastro e a coluna de endereço por pedido, preservando os registros existentes. O deploy deve aplicar as migrações antes de publicar o Worker.
2. Abra `/painel/`, pressione **Ctrl + F5**, informe a chave e o código atual do autenticador.
3. Confira o site público, os preços e o envio de um pedido de teste.
4. No painel, confirme que o pedido apareceu. Uma ativação/renovação só entra no total depois de você marcar que recebeu o pagamento real.
5. Confira clientes, assinaturas, saldo disponível/reservado/concluído e o total Care já registrado.
6. Clique em **Sair**. Atualizar uma API administrativa sem entrar novamente deve retornar 401. Uma pessoa com link de cliente só consulta aquele pedido/assinatura.

O valor financeiro registra mensalidades Care confirmadas manualmente; não consulta seu banco bancário, não calcula lucro e não inclui pagamentos avulsos ou estornos. A importação recupera os ciclos pagos que ainda existem no D1. Dados apagados antes desta versão precisam de backup para serem recuperados.

## 8. Testar localmente e recuperar o acesso

```powershell
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:local
npm.cmd run dev
```

Edite `.dev.vars` com uma chave de desenvolvimento. O acesso sem autenticador é permitido apenas nos hosts locais `localhost`, `127.0.0.1` e `::1`; o painel publicado exige os dois fatores. O D1 local é separado de produção.

Para verificar código e empacotamento sem publicar:

```powershell
npm.cmd run check
```

Se perder o autenticador/chave, entre na sua própria conta Cloudflare pelo Wrangler e execute `npm.cmd run security:setup`. Guarde os novos dados e use-os no painel. A troca invalida sessões anteriores. Proteja também a conta Cloudflare e a conta GitHub com autenticação em duas etapas: elas administram o código e o banco.

## Referências oficiais usadas

- [Configuração de Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [D1 e migrações pelo Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
- [Bindings e ordem de execução dos assets](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Previews e recursos separados](https://developers.cloudflare.com/workers/previews/resources/)
- [Configuração de Previews](https://developers.cloudflare.com/workers/previews/configuration/)

Configurado a partir da documentação consultada em 13/10/2026. Os nomes visuais dos menus podem variar; os comandos e bindings acima correspondem aos scripts entregues.
