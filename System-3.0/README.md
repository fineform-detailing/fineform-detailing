# Fine Form 3.0

Projeto completo de site, atendimento, painel, agenda e Fine Form Care. Esta revisão inclui cadastro presencial de placas pelo administrador, assinaturas vinculadas ao veículo conferido, vitrificação de plásticos e as notificações limitadas a cinco aparelhos. O cartão de total financeiro permanece removido.

**Pelo celular: comece por [ATUALIZAR-PELO-CELULAR.md](ATUALIZAR-PELO-CELULAR.md).** O aplicativo está na pasta `System-3.0` deste repositório; essa é a raiz a selecionar no Cloudflare. A configuração já identifica a conta, o Worker e o D1 existentes, conferidos na conta do proprietário em 17/10/2026.

Os detalhes das mudanças estão em [LEIA-ME-PLACAS-E-ASSINATURAS.md](LEIA-ME-PLACAS-E-ASSINATURAS.md). Para instalação com computador e informações técnicas, consulte [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md). Os comandos das seções seguintes são para instalação pelo terminal.

## Atualizar mantendo os dados

Extraia o ZIP em uma nova pasta System-3.0. No PowerShell dessa pasta:

```powershell
npm.cmd ci
npx.cmd wrangler login
npm.cmd run reuse -- "C:\Users\Mateus Monteiro\Downloads\fine-form\project\System-2.0"
npm.cmd run db:remote
npm.cmd run security:setup
npm.cmd run deploy
```

`reuse` exporta um backup antes de copiar a configuração real do Worker/D1 antigos. O código é 3.0 mesmo mantendo o nome técnico e a URL do Worker antigo. Desconecte builds do código 2.0 no Cloudflare e depois conecte o repositório com os arquivos novos. Não apague o D1 para atualizar.

## Instalação nova

Crie um Worker chamado `fine-form-3-0` no Cloudflare. No projeto:

```powershell
npm.cmd ci
npx.cmd wrangler login
npm.cmd run configure
npm.cmd run deploy
```

`configure` cria/encontra o D1 e configura a chave e o autenticador. A instalação nova começa com banco vazio. O `wrangler.jsonc` entregue usa um UUID fictício até a configuração.

## O que muda na segurança

- Chave aleatória forte e autenticador TOTP exigidos no painel publicado.
- Sessão opaca de 256 bits, guardada como hash no D1, cookie HttpOnly/Secure/SameSite Strict com prefixo de host em HTTPS.
- Sessão de até duas horas, com expiração após vinte minutos sem requisições relacionadas à atividade do operador. Requisições automáticas de recuperação não mantêm a sessão aberta.
- Nova autenticação em operações administrativas e exportação após dez minutos da última confirmação. A sessão gira e a anterior é revogada.
- Validação de Origin/Fetch Metadata e token CSRF nas alterações. Limites de tentativas por IP e de segundo fator entre IPs.
- Valores calculados no servidor, dinheiro em centavos e operações concorrentes sem duplicar pagamentos/créditos.
- Recibos e auditoria sem edição/exclusão pela API; triggers protegem alterações no SQL normal. Recibos preservados ao excluir clientes ou assinaturas.
- Headers no servidor e nos assets, CSP restrita no painel, proteção contra iframe, MIME sniffing, vazamento por referrer e cache de dados privados.
- Links de cliente restritos ao registro autorizado. Tickets ao vivo com host/sessão, uso único, expiração e revogação.

Os registros de pagamentos Care continuam no banco, com confirmação manual e sem integração bancária ou cobrança automática. O alcance e as limitações estão em [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Verificar

```powershell
npm.cmd run check
```

Depois de publicar, `/api/health` precisa indicar versão 3.0.0 e `ready:true`. Abra `/painel/` com chave e autenticador. Os testes usam dados e bancos fictícios, sem consultar ou alterar sua conta Cloudflare.

O projeto usa Cloudflare Workers + Assets + D1 + Durable Objects SQLite. Os serviços e preços originais estão em `docs/PRECOS.md`. A operação diária está em `docs/OPERACAO.md`. As dependências são fixadas por `package-lock.json`; `node_modules` não acompanha o ZIP.
