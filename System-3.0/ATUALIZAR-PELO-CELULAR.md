# Atualizar a Fine Form pelo celular

Revisão de 17/10/2026. Este pacote contém o projeto completo preparado para o GitHub; a publicação no Cloudflare é uma etapa separada. Você consegue configurar tudo pelo navegador do celular. Se um menu ficar escondido, use a opção “Versão para computador” do navegador.

## Antes do envio: autorizar o repositório

Se o envio pelo ChatGPT retornar “Resource not accessible by integration”, a conexão não tem autorização de gravação para aquele repositório. A permissão da sua conta pessoal no GitHub não substitui a autorização da integração.

Abra a [instalação do ChatGPT Codex Connector](https://github.com/apps/chatgpt-codex-connector/installations/new), escolha a conta `fineform-detailing`, marque **Only select repositories**, selecione `fineform-detailing/fineform-detailing` e conclua **Install / Install & Authorize**. Depois volte à conversa para verificar a conexão e repetir o envio. Uma autorização de usuário e uma instalação com acesso ao repositório são etapas diferentes.

Você também pode conferir as instalações em [GitHub → Settings → Applications → Installed GitHub Apps](https://github.com/settings/installations). Não é necessário fornecer uma senha ou token na conversa.

## 1. Conferir o banco que o site já usa

Nesta entrega, o Worker `fine-form-3-0` e o D1 ligado ao binding `DB` já foram conferidos pelo acesso à conta Cloudflare do proprietário. O arquivo `wrangler.jsonc` contém a conta e o ID reais desse banco. Não é necessário copiar ou enviar esses identificadores novamente. Os passos abaixo servem para conferência ou para uma futura troca de ambiente.

1. Entre em [dash.cloudflare.com](https://dash.cloudflare.com/), na conta do site.
2. Abra **Workers & Pages → fine-form-3-0 → Bindings**. Localize a ligação **DB**, do tipo **D1 Database**, e anote o nome do banco associado.
3. Abra esse banco em **Storage & databases → D1**. Em seus detalhes/configurações, copie o **Database ID / ID do banco**. É um identificador com letras, números e hífens.
4. Informe ao responsável pela atualização o nome do banco e esse ID. Esses identificadores não são senha. Ele deve colocá-los em `wrangler.jsonc`, mantendo o binding `DB` e o Worker `fine-form-3-0`.

Use o D1 ligado ao Worker atual: criar outro banco deixaria os registros antigos fora da aplicação nova. O comando `npm run deploy` também bloqueia configurações que ainda utilizem o marcador de instalação `00000000-0000-0000-0000-000000000000`.

## 2. Conectar o Worker existente ao GitHub

Se a integração de build ainda não estiver configurada no Worker, use os passos abaixo. O ID do banco já está preenchido nesta entrega.

1. Abra **Workers & Pages → fine-form-3-0 → Settings → Builds**.
2. Toque em **Connect** e escolha GitHub. Autorize a conta `fineform-detailing` e o repositório `fineform-detailing/fineform-detailing` quando o Cloudflare solicitar.
3. Se já houver conexão com outro repositório, confira a origem e reconfigure a conexão nessa mesma tela.
4. Preencha os campos abaixo. O nome do Worker deve continuar igual ao `name` de `wrangler.jsonc`.

| Campo | Valor |
| --- | --- |
| Repositório | `fineform-detailing/fineform-detailing` |
| Production branch / branch de produção | `main` |
| Root directory / diretório raiz | `System-3.0` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Variável de build | `NODE_VERSION` = `24.19.0` |
| Builds de outras branches / previews | Desativados até configurar um banco de teste separado |

O Cloudflare instala as dependências do `package-lock.json`. Se aparecer um campo separado de instalação, use `npm ci`. O projeto é um Worker com API, banco e assets; sua configuração já aponta para `dist`. Conecte o Worker existente para manter a URL e seus secrets de execução.

## 3. Permitir a atualização do banco

O deploy aplica as migrações pendentes do D1 e depois publica o sistema. O token usado pelo **Workers Builds** precisa de **Workers Scripts: Edit**, **D1: Edit** e **Account Settings: Read**, na conta correta. Preserve as demais permissões que o token de build já utiliza.

Na configuração de Builds, identifique o token selecionado. Em **My Profile → API Tokens**, edite as permissões desse token para incluir D1 ou selecione no Builds um token seu que já tenha essas permissões. O token automático do Builds pode vir sem D1. Faça essa configuração dentro do Cloudflare; não envie o valor do token em conversas e não o grave no repositório.

Os secrets **ADMIN_KEY**, **ADMIN_TOTP_SECRET** e **PUSH_VAPID** continuam nos **Variables and Secrets** do Worker em execução. O build não precisa dos valores desses três secrets. A configuração mantém o agendamento de recuperação das notificações a cada minuto e preserva variáveis existentes do painel Cloudflare.

## 4. Publicar e conferir

1. Salve a conexão e as configurações. Quando houver a opção de executar/repetir o build, use-a; caso a tela aguarde um novo commit, o responsável pode enviar uma alteração ao GitHub para iniciar o primeiro build.
2. Acompanhe o histórico de builds do Worker até o deploy concluir. Os testes e a compilação rodam antes de qualquer migração.
3. Abra [a verificação do sistema](https://fine-form-3-0.fineformcare.workers.dev/api/health). Confira `version: "3.0.0"` e `ready: true`.
4. Feche e reabra o [painel](https://fine-form-3-0.fineformcare.workers.dev/painel/). Confira **Gerenciador de placas** e faça uma notificação de teste em um aparelho já autorizado.
5. No formulário público, confira **Vitrificação de plásticos externos** e prepare um orçamento de teste. O cliente continua fazendo orçamento sem placa; você cadastra o veículo presencialmente no painel.

O deploy aplica somente migrações que faltam. Se a produção ainda usa a 3.0 com notificações, entram as migrações `0004` e `0005`. Se o primeiro pacote de placas já foi aplicado, entra somente `0005`. Os pagamentos, orçamentos, assinaturas e aparelhos permanecem no mesmo D1. Mantenha as chaves de acesso e de push atuais para conservar as autorizações dos aparelhos.

## Se o build falhar

| Mensagem/sintoma | Ajuste |
| --- | --- |
| “Configure o banco primeiro” | Registrar o ID real do D1 em `wrangler.jsonc`. |
| Sem permissão para D1 / autenticação negada durante migrações | Incluir `D1: Edit` no token usado pelo Builds. |
| `package.json` não encontrado | Usar `System-3.0` como Root directory. |
| Nome do Worker diferente | Selecionar o Worker existente `fine-form-3-0` e conferir `name` no Wrangler. |
| Build concluído, mas uma alteração antiga aparece no celular | Fechar e reabrir a página; conferir a branch e o commit exibidos no build. |

Se precisar de ajuda, envie o trecho final do erro ou uma captura da tela sem exibir tokens, chaves ou códigos do autenticador.

## Documentação oficial

- [Conectar um Worker existente](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Configuração e permissões do Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Versão do Node no build](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Migrações D1](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
