<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="System-3.0/docs/readme/brand-dark-mobile.svg">
  <source media="(max-width: 600px)" srcset="System-3.0/docs/readme/brand-light-mobile.svg">
  <source media="(prefers-color-scheme: dark)" srcset="System-3.0/docs/readme/brand-dark.svg">
  <img src="System-3.0/docs/readme/brand-light.svg" width="1200" alt="Fine Form. Seu veículo, em boa forma. Um veículo por vez, atenção por inteiro. Ilustração do tentáculo ciano da marca.">
</picture>

<p align="center">
  <a href="https://fine-form-3-0.fineformcare.workers.dev/">Conheça a Fine Form</a> ·
  <a href="https://fine-form-3-0.fineformcare.workers.dev/atendimento/">Escolha seu cuidado</a> ·
  <a href="https://fine-form-3-0.fineformcare.workers.dev/links/">Todos os contatos</a>
</p>

## Cada detalhe merece um cuidado próprio.

A **Fine Form** cuida de carros e motos com atenção aos materiais, ao acabamento e à conversa. O atendimento é direto com Mateus: entender o veículo, explicar os cuidados possíveis e combinar o que será feito antes de começar.

**Um veículo por vez. Atenção por inteiro.**

### Um cuidado que acompanha você

| Seu momento | O que você encontra |
| --- | --- |
| Cuidar agora | Lavagens, higienização, polimento, proteção e cuidados por área. |
| Manter a boa forma | **Fine Form Care**, com planos para dar continuidade ao cuidado de carros e motos. |
| Escolher com clareza | Serviços, valores de referência e resumo do pedido em um só lugar. |
| Acompanhar cada etapa | Link privado para consultar o pedido e suas atualizações. |

O site recebe sua solicitação. Data, duração, local e escopo são combinados pessoalmente antes do atendimento. O endereço é compartilhado pelo canal privado do pedido quando liberado por Mateus.

### A forma Fine Form

Uma identidade de **ciano, preto e tons claros**, com tipografia direta e espaço para respirar. O tentáculo do loader traz o lado curioso da marca; a apresentação mantém o foco no veículo e no cuidado.

No site, você pode explorar serviços para carros e motos, conhecer os planos Care, preparar um pedido e acompanhar o atendimento. Nas redes, encontra a mesma atenção aos detalhes.

<p align="center">
  <a href="https://wa.me/5511959473298">WhatsApp</a> ·
  <a href="https://www.instagram.com/fineform.detailing/">Instagram</a> ·
  <a href="https://www.tiktok.com/@fineform.detailing">TikTok</a> ·
  <a href="mailto:fineformcare@gmail.com">E-mail</a>
</p>

---

### Por trás da experiência

Este repositório também guarda a plataforma que conecta o site, o atendimento, os pedidos, a agenda, o painel e o Fine Form Care.

**[Abrir a documentação do projeto →](System-3.0/README.md)**

Código e aplicação em [`System-3.0/`](System-3.0/). Publicação em Cloudflare Workers, com banco D1 e atualizações ao vivo.

## Acesso restrito ao Brasil

A Fine Form 3.0 atende somente requisições com país de origem **Brasil (BR)**, conforme a geolocalização **confiável** fornecida pela Cloudflare ao Worker (`request.cf.country`). Não são usados cabeçalhos enviados pelo visitante para decidir o acesso.

- **Brasil:** o Worker processa normalmente o site, os arquivos estáticos, o painel e a API.
- **Outros países ou país desconhecido:** o Worker responde **HTTP 403** antes de servir páginas, scripts, imagens, estilos ou executar rotas da API. A mensagem é `Acesso disponível apenas no Brasil.`.
- **Desenvolvimento local:** apenas os hosts loopback explícitos são isentos. O domínio público continua sujeito à verificação.
- **Arquivos estáticos:** `System-3.0/wrangler.jsonc` usa `assets.run_worker_first: true`, para que os Assets não contornem a validação.
- **Testes:** `System-3.0/tests/geography.test.mjs` contém cenários para países internacionais, país ausente, cabeçalhos falsificados, APIs, assets e acesso brasileiro.

**Como interpretar o painel:** contagens de *requests* por cidade ou país incluem tentativas de bots, scanners e requisições recusadas. Essas métricas não equivalem a visitantes autorizados. Uma restrição aplicada no Worker responde HTTP 403, mas a tentativa ainda pode aparecer nos relatórios de tráfego da Cloudflare. Para analisar sucesso ou bloqueio, verifique o status HTTP dos eventos, não apenas o mapa.

**Publicação:** o Worker de produção é `fine-form-3-0`, na conta Cloudflare da Fine Form. O repositório `fineform-detailing/fineform-detailing`, branch `main`, tem build automático do diretório `System-3.0/**`. Alterações no README da raiz apenas documentam a regra e **não acionam** uma publicação da aplicação. Evite publicar uma versão antiga do projeto sobre modificações mais recentes feitas diretamente na Cloudflare sem antes reconciliar os arquivos de produção.
