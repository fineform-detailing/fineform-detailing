# Notificações do administrador — Fine Form 3.0

Novos pedidos de serviços, planos e visitas Care geram um aviso para os aparelhos que o administrador autorizou. O recurso utiliza Web Push e pode funcionar com a aba do painel fechada, conforme o suporte e as permissões do navegador.

A notificação mostra **Fine Form · Novo pedido** e um aviso genérico. Nome, telefone, veículo, orçamento e valores ficam no painel. Ao tocar, você abre o pedido; o acesso continua exigindo a sessão administrativa. Uma edição aberta é preservada antes de abrir outro pedido.

## Aplicar no Windows

Extraia o conteúdo do ZIP na raiz do projeto existente, onde estão `package.json` e `wrangler.jsonc`. Mantenha as pastas e substitua os arquivos correspondentes.

No terminal do VS Code:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run notifications:setup
npm.cmd run deploy
```

O comando de configuração pede a **URL HTTPS que você usa para abrir o site**, sem `/painel`, caminho extra ou parâmetros. Ele gera uma chave própria de notificações, grava um único secret `PUSH_VAPID` no Worker e adiciona uma tarefa de recuperação por minuto ao `wrangler.jsonc`. Os nomes e os identificadores do Worker, D1 e Durable Object existentes são preservados. A chave administrativa e o autenticador permanecem os mesmos.

Se a chave de notificações já existe, o comando a preserva. A publicação aplica a migração `0003_admin_notifications.sql` e publica o código. Essa migração cria somente as tabelas de aparelhos, fila e tokens de envio; preserva os dados e as migrações anteriores. O ZIP mantém a remoção do cartão financeiro da atualização anterior.

Se o Wrangler solicitar login na sua conta Cloudflare, use:

```powershell
npx.cmd wrangler login
```

## Ativar no celular

1. Abra o painel publicado no Chrome do Android e entre com sua chave e autenticador.
2. Abra **Notificações** e toque em **Ativar notificações neste aparelho**.
3. Permita as notificações quando o navegador perguntar.
4. Toque em **Enviar notificação de teste** e confira o aviso no celular.
5. Feche a aba do painel e envie um pedido de teste pela área do cliente. Confira a notificação e toque nela para abrir o pedido.

No iPhone ou iPad, adicione o painel à Tela de Início e abra-o por esse ícone antes de ativar. Web Push para esses aplicativos requer iOS/iPadOS 16.4 ou posterior.

Som e vibração dependem do navegador e das permissões do sistema, incluindo Não Perturbe, volume e economia de bateria. Bloqueio das notificações ou fechamento forçado do navegador pode impedir o aviso. O botão de teste permite verificar a entrega no aparelho real após publicar. A tela do painel também continua mostrando os pedidos pendentes.

## Controle dos aparelhos

Você pode autorizar até cinco aparelhos. **Desativar neste aparelho** interrompe seus avisos. A lista permite revogar outro aparelho, inclusive um perdido. Sair do painel ou expirar a sessão mantém o aviso discreto autorizado; tocar na notificação exige login quando a sessão expirou.

Trocar a chave administrativa, o autenticador ou a chave VAPID impede novos envios para as autorizações antigas. Para renovar deliberadamente a chave de notificações:

```powershell
npm.cmd run notifications:setup -- --rotate
npm.cmd run deploy
```

Reative os avisos nos aparelhos depois dessa renovação. O mesmo procedimento permite corrigir a URL usada na configuração inicial.

## Segurança e entrega

- Cadastro, teste e revogação exigem administrador autenticado, mesma origem, CSRF e autenticação recente.
- Chaves VAPID privadas ficam no secret do Worker. Endpoints e chaves dos aparelhos ficam no D1 e não aparecem na listagem nem na exportação JSON do painel.
- Somente destinos HTTPS de serviços de push conhecidos são aceitos. Credenciais na URL, endereços locais, portas alternativas e redirecionamentos são recusados.
- O payload usa a biblioteca `@block65/webcrypto-web-push` 2.0.0, com criptografia `aes128gcm` e autenticação VAPID. O token por provedor é reutilizado por uma hora.
- A fila é criada na mesma transação que salva o pedido. Reenvio do mesmo formulário não cria outro aviso. Uma reserva temporária evita duas tentativas simultâneas para o mesmo aparelho e pedido.
- O envio é iniciado em segundo plano após salvar. Falhas temporárias têm até cinco tentativas com espera crescente; a tarefa agendada recupera a fila sem precisar abrir o painel. Os avisos expiram após 24 horas. Endpoints expirados são removidos.
- Pedidos já respondidos deixam de ser elegíveis a novos envios. Excluir um pedido remove os avisos ainda vinculados na fila. Uma entrega já aceita pelo serviço de push pode chegar depois.
- O service worker se limita a `/painel/` e às notificações. Ele não intercepta requisições nem guarda páginas privadas em cache.

A entrega depende também dos serviços de push, da conexão e do sistema do aparelho. Confirme-a pelo teste depois da publicação; os testes automatizados usam um provedor simulado, não seu celular.

## Pesquisa utilizada

- [Push API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notificações e interação do usuário — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)
- [Som, vibração e opções de notificação — MDN](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
- [Web Push no iPhone/iPad — WebKit](https://webkit.org/blog/13878/)
- [Biblioteca Web Push e protocolo criptográfico](https://github.com/block65/webcrypto-web-push/blob/master/packages/web-push/README.md)
- [Cron Triggers — Cloudflare](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

As licenças MIT das novas dependências acompanham `docs/licencas/`. Esta entrega é uma atualização do código para aplicar localmente; não publica o site por conta própria.
