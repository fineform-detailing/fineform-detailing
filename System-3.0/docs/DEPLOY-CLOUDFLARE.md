# Publicação da Fine Form 4.0

A integração existente continua apontando para `System-3.0` na branch `main`. O comando de validação é `npm run check`, e o comando de publicação é `npm run deploy`.

## Sequência

1. `npm ci` instala as versões do lockfile.
2. `npm run check` verifica tipos, API, componentes, export Next.js e os dois Workers.
3. `npm run deploy` compila a interface, publica `fine-form-web`, aplica migrações D1 pendentes e publica `fine-form-3-0`.
4. Confirme `/api/health`: versão `4.0.0`, `ready: true` e `webService: true` no ambiente configurado.

O primeiro serviço publicado é o web para que o gateway encontre seu binding `WEB`. O serviço web usa os arquivos em `dist` e não oferece `workers.dev` nem URLs públicas de versões. O gateway também mantém um binding de Assets para desenvolvimento e compatibilidade; quando `WEB` está disponível, a entrega usa o serviço interno.

## Recursos e segredos

Preserve `account_id`, `database_id`, o nome `fine-form-3-0`, a classe e as migrações do Durable Object. Não execute criação de novo banco para atualizar esta instalação. `--keep-vars` preserva a configuração de produção; secrets continuam no Worker existente.

Nenhum secret é necessário no serviço web. Não copie a chave do painel para o frontend, para um arquivo público ou para variáveis `NEXT_PUBLIC_*`. O arquivo `.dev.vars` é exclusivamente local e ignorado pelo Git.

A API pública continua no mesmo domínio das páginas. Não há mudança de CORS, cookies, caminhos `/api`, links `#t=` nem escopo dos Service Workers.

## Desenvolvimento e dry run

`npm run dev` inicia Next.js e Wrangler locais. `npm run db:local` prepara somente o banco local. O dry run completo é incluído em `npm run check`. A restrição por país continua ativa em produção, e as versões antigas não ganham URLs públicas.

## Build e CSP

`next build` gera o export de todas as rotas. `scripts/build.mjs` reúne o resultado e calcula os hashes de cada script inline do Next.js. O gateway usa esses hashes para permitir a hidratação sem `unsafe-inline` em `script-src`. Compile frontend e gateway a partir do mesmo estado do código.

O deploy não publica versões sem antes compilar. Para CI que acabou de executar `npm run check` sem alterar os arquivos, `FF_SKIP_BUILD=1 npm run deploy` reaproveita a compilação já validada.

## Reversão

Use as versões do Worker ou o histórico Git correspondente, mantendo o D1 atual. Uma mudança de interface não exige restaurar o banco. Consulte a documentação de `wrangler rollback` antes de selecionar a versão de destino.
