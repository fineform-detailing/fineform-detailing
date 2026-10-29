# Em Tom

Aplicação da banda em https://em-tom-banda.fineformcare.workers.dev/.

O código foi recuperado da versão ativa de 27/10/2026 para versionamento nesta pasta. `worker/index.mjs` conserva o runtime publicado, incluindo a administração, salas, convites, sessões, restrição ao Brasil e notificações. A tabela de arquivos públicos foi extraída para `public/` e é recomposta durante o build. As chaves continuam nos secrets da Cloudflare e não estão neste repositório.

## Desenvolvimento e validação

Requer Node.js 22 ou superior.

```sh
npm ci
npm run check
npm run dev
```

O comando de desenvolvimento usa recursos locais e `ENVIRONMENT=development`. A publicação usa `ENVIRONMENT=production`, o Worker e o D1 existentes. Não há migração de dados nesta atualização. O banco local vazio não inclui salas ou convites de produção.

```sh
npm run deploy
```

O código do servidor contém a versão empacotada original e suas dependências; alterações de interface ficam em `public/`. `scripts/prepare-assets.mjs` gera somente arquivos de build ignorados pelo Git. O serviço de notificações continua sem cache de áudio, respostas privadas ou credenciais.

## Usabilidade aplicada

| Lei | Aplicação |
| --- | --- |
| Fitts | Alvos de toque de pelo menos 44 px, campos de 16 px e ações principais de fácil acesso. |
| Hick | Campos opcionais e opções de notificações aparecem quando solicitados; três candidatos de tonalidade continuam disponíveis. |
| Zeigarnik | Análise não enviada recebe um lembrete com Retomar análise; texto e candidato são preservados após falha de envio. Rascunhos de texto ficam apenas na memória da página. |
| Jakob | Navegação com Voltar do navegador, indicação da página atual, foco no título e retorno do foco ao fechar diálogos. |
| Gradiente de meta | Etapas Captar, Conferir e Compartilhar acompanham o estado real; duração da captação é anunciada de forma acessível. |
| Von Restorff | A ação de compartilhar recebe destaque; iniciar outra análise passa a ser uma ação secundária quando já há resultado. |
| Miller | O fluxo é dividido em três grupos, com identificação de música e voz em um grupo opcional. |

Os testes de áudio usam sinais sintéticos e simulam permissões e interrupções. Os testes de interface usam sessões e salas locais fictícias, sem enviar tons ou notificações a músicos reais. O reconhecimento musical com vozes reais em celulares continua dependendo do aparelho e do ambiente.
