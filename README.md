<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="System-3.0/docs/readme/brand-dark-mobile.svg">
  <source media="(max-width: 600px)" srcset="System-3.0/docs/readme/brand-light-mobile.svg">
  <source media="(prefers-color-scheme: dark)" srcset="System-3.0/docs/readme/brand-dark.svg">
  <img src="System-3.0/docs/readme/brand-light.svg" width="1200" alt="Fine Form. Seu veículo, em boa forma. Identidade em laranja, preto e tons claros.">
</picture>

<p align="center">
  <a href="https://fine-form-3-0.fineformcare.workers.dev/"><strong>Acompanhe a Fine Form ↗</strong></a> &nbsp;·&nbsp;
  <a href="https://www.instagram.com/fineform.detailing/">Instagram</a> &nbsp;·&nbsp;
  <a href="https://wa.me/5511959473298">WhatsApp</a>
</p>

## Um novo cuidado. Em breve.

A **Fine Form Estética Automotiva** está em preparação para a inauguração. Nosso espaço e nosso site estão sendo preparados para receber carros e motos com atenção aos materiais, ao acabamento e à conversa.

**Um veículo por vez. Atenção por inteiro.**

A data de inauguração será divulgada nas redes da marca. Até a abertura, o site apresenta somente a página de inauguração, com os contatos de Mateus. As páginas internas, o painel e as APIs ficam bloqueados no servidor, inclusive por links diretos.

## A forma Fine Form

**Laranja `#FF8000`, preto e tons claros.** Tipografia direta, espaço para respirar e o símbolo original da marca. A experiência acompanha o cuidado: explicar com clareza, combinar os detalhes e tratar cada veículo conforme sua necessidade.

| Nosso princípio | Como aparece na experiência |
| --- | --- |
| Cuidado com critério | Etapas, materiais e acabamento considerados em cada serviço. |
| Conversa direta | Atendimento com Mateus, com escopo e condições combinados antes de começar. |
| Continuidade | Fine Form Care para acompanhar a manutenção do veículo. |
| Clareza | Solicitação de atendimento não significa agendamento automático. |

## O projeto

Este repositório guarda o site e a plataforma de operação da Fine Form. Os recursos abaixo fazem parte da aplicação completa e ficam indisponíveis ao público durante a preparação:

| Área | Finalidade |
| --- | --- |
| Cuidados | Serviços para carros e motos, adicionais e opções por superfície. |
| Atendimento | Preparação de solicitação, preferência de data e acompanhamento por link privado. |
| Operação | Pedidos, agenda, clientes, veículos e controle de acesso ao painel. |
| Fine Form Care | Assinaturas por veículo, ciclos e registro de visitas. |

**Código e documentação:** [`System-3.0/`](System-3.0/)

| Para consultar | Documento |
| --- | --- |
| Arquitetura, execução e manutenção | [Documentação técnica](System-3.0/README.md) |
| Bloqueio temporário e reabertura | [Modo inauguração](System-3.0/docs/INAUGURACAO.md) |
| Publicação na infraestrutura existente | [Deploy na Cloudflare](System-3.0/docs/DEPLOY-CLOUDFLARE.md) |
| Atualização pelo celular | [Guia de atualização](System-3.0/ATUALIZAR-PELO-CELULAR.md) |

**Base técnica:** JavaScript, React em interações específicas, Motion e esbuild. Hospedagem em Cloudflare Workers com Static Assets, banco D1 e Durable Objects para atualizações ao vivo.

## Contato

[Instagram](https://www.instagram.com/fineform.detailing/) · [TikTok](https://www.tiktok.com/@fineform.detailing) · [WhatsApp](https://wa.me/5511959473298) · [E-mail](mailto:fineformcare@gmail.com)

<details>
<summary>Notas de operação e acesso</summary>

O Worker de produção é `fine-form-3-0`, na conta Cloudflare da Fine Form. A aplicação está em `System-3.0/`, na branch `main`. Mudanças nessa pasta acionam a integração de publicação existente; alterações apenas neste README não acionam o build.

O modo inauguração é controlado pela variável `PRELAUNCH_MODE`, versionada em `System-3.0/wrangler.jsonc`. A reabertura exige alterar o valor para `"false"`, verificar e publicar. Não há um parâmetro público que permita contornar o bloqueio.

A restrição geográfica existente continua ativa: somente requisições identificadas pela Cloudflare como originadas no Brasil podem acessar a aplicação. País desconhecido ou diferente de `BR` recebe HTTP 403 antes das páginas, dos arquivos e da API. Cabeçalhos fornecidos pelo visitante não liberam o acesso. A exceção de desenvolvimento é restrita a hosts loopback.

As contagens de tráfego da Cloudflare podem incluir bots e tentativas bloqueadas. Elas não representam, por si só, visitantes autorizados.

Antes de publicar, reconcilie o código com a versão em produção. Preserve banco, bindings e segredos. O modo inauguração não exclui registros nem modifica credenciais.

</details>
