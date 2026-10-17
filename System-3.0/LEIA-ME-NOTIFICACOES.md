# Fine Form 3.0 — notificações do administrador

Este ZIP adiciona avisos de novos pedidos no celular do administrador e mantém a remoção do cartão de pagamentos Care. A atualização usa o projeto 3.0 recuperado nesta conversa.

Extraia **o conteúdo** na raiz do seu projeto, onde estão `package.json` e `wrangler.jsonc`. Preserve as pastas do ZIP e aceite substituir os arquivos correspondentes. Se o extrator criar uma pasta com o nome do ZIP, copie o conteúdo dela para a raiz do projeto.

No terminal do VS Code, execute:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run notifications:setup
npm.cmd run deploy
```

Na configuração, informe a URL HTTPS do site já publicado, sem `/painel`. O comando mantém sua chave de administrador, autenticador, Worker e banco existentes. A publicação aplica a nova migração de notificações, preservando clientes, pedidos, Care e recibos.

Depois, no celular: **Painel → Notificações → Ativar notificações neste aparelho → Permitir → Enviar notificação de teste**. Feche o painel e faça um pedido de teste para conferir a entrega em segundo plano.

As notificações não mostram dados do cliente nem valores. Som e vibração seguem as permissões e os ajustes do celular. O ZIP contém código e instruções para publicar; a entrega no seu aparelho deve ser conferida pelo teste após ativar.

Detalhes de instalação, segurança, revogação de aparelhos e funcionamento estão em `docs/NOTIFICACOES.md`. O pacote não substitui seu `wrangler.jsonc`, arquivos de credenciais, fotos, fontes ou catálogo.
