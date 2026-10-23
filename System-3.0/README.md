<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="docs/readme/brand-dark-mobile.svg">
  <source media="(max-width: 600px)" srcset="docs/readme/brand-light-mobile.svg">
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/brand-dark.svg">
  <img src="docs/readme/brand-light.svg" width="1200" alt="Fine Form — seu veículo, em boa forma. Identidade ciano e mascote original da marca.">
</picture>

# Plataforma Fine Form 3.0

Site, atendimento e operação diária no mesmo projeto. A experiência pública apresenta os cuidados para carros e motos; o painel organiza pedidos, agenda, clientes, veículos e **Fine Form Care**.

**[Site publicado](https://fine-form-3-0.fineformcare.workers.dev/) · [Painel](https://fine-form-3-0.fineformcare.workers.dev/painel/) · [Atualizar pelo celular](ATUALIZAR-PELO-CELULAR.md) · [Apresentação da marca](../README.md)**

## O que a plataforma faz

| Área | Recursos |
| --- | --- |
| Site e contatos | Catálogo para carros e motos, cuidados por área, planos, avaliações, galeria e página de links. |
| Atendimento | Escolha do cuidado, adicionais, preferência de data, resumo e envio de solicitação. |
| Acompanhamento | Link privado do pedido, atualizações e endereço liberado individualmente pelo administrador. |
| Operação | Painel de pedidos, agenda, cadastro de clientes e veículos, placas e mensagens para o cliente. |
| Fine Form Care | Assinaturas vinculadas ao veículo conferido, ciclos, saldo e registro de visitas. |
| Atualizações | WebSocket e notificações push opcionais, com cadastro limitado a cinco aparelhos. |
| Privacidade | Documentos públicos, preferências locais e remoção de rascunhos e links salvos no aparelho. |

**Atendimento por confirmação.** A solicitação e a preferência de data não reservam uma vaga automaticamente. Mateus confirma disponibilidade, duração, preço e escopo antes de aceitar. O endereço de atendimento permanece fora do conteúdo público e é liberado em cada pedido privado.

Os pagamentos Care são confirmados manualmente pelo administrador. Os registros de pagamento continuam no banco; o cartão de total financeiro foi removido do painel. Não há cobrança automática nem integração bancária.

## Identidade e interface

O ciano **`#53C3B1`** é o acento da marca, acompanhado de preto, tons claros, **Manrope** e **Barlow Condensed**, com fontes servidas pelo próprio projeto. O tentáculo original aparece na abertura e pode ser revisto pelo controle do site.

- Espaço em branco faz parte do layout: conteúdo e contatos devem aparecer com propósito, sem repetições.
- O rodapé mantém redes sociais, privacidade e informações complementares de forma compacta.
- Menus e painéis precisam caber na largura disponível, com rolagem interna quando necessário.
- Animações decorativas respeitam a preferência de movimento reduzido e o controle do visitante.

## Como o projeto está organizado

| Caminho | Responsabilidade |
| --- | --- |
| `dist/` | Páginas, estilos, fontes, imagens e módulos do navegador servidos como Assets. |
| `src/` | Fontes da abertura com o mascote e das interações compiladas. |
| `worker/` | API, regras de atendimento, autenticação, assinaturas, privacidade e atualizações ao vivo. |
| `migrations/` | Evolução do banco D1. |
| `scripts/` | Build, configuração, publicação e preparação dos ambientes. |
| `tests/` | Testes de interface, regras de negócio, segurança e integração com banco local fictício. |
| `docs/` | Operação, preços, arquitetura e manutenção. |
| `wrangler.jsonc` | Worker, Assets e bindings `DB` e `LIVE` do ambiente existente. |

**Base técnica:** JavaScript com módulos ES, React em interações específicas, Motion e esbuild. A publicação usa **Cloudflare Workers + Assets + D1 + Durable Objects SQLite**. O banco guarda os registros; o Durable Object distribui os avisos de mudança ao vivo.

## Rodar localmente

Use uma versão de Node compatível com `package.json`. O projeto foi validado com **Node 24.19.0**. Na pasta `System-3.0`:

```bash
npm ci
cp .dev.vars.example .dev.vars
```

Defina uma chave de desenvolvimento em `.dev.vars`. Depois:

```bash
npm run db:local
npm run dev
```

No PowerShell, use `Copy-Item .dev.vars.example .dev.vars` para copiar o arquivo. Quando necessário no Windows, execute `npm.cmd` e `npx.cmd`.

As migrações locais usam um banco separado de produção. O painel publicado exige chave e autenticador TOTP; a exceção de desenvolvimento é restrita aos hosts locais definidos pelo projeto.

## Verificar antes de publicar

```bash
npm run check
```

Esse comando executa a suíte de testes, gera os arquivos da aplicação e valida o empacotamento do Worker com `wrangler deploy --dry-run`. Ele não publica a aplicação.

O build atualiza os módulos compilados da abertura e das interações, gera os documentos legais e mantém a inclusão do rodapé nas páginas. Revise o resultado do build junto com as fontes alteradas.

## Atualizar a produção existente

A aplicação fica dentro de **`System-3.0`**, na branch **`main`** de `fineform-detailing/fineform-detailing`. O `wrangler.jsonc` já identifica o Worker **`fine-form-3-0`** e seu D1 existente.

Configuração conferida na integração **Workers Builds**:

| Campo | Valor |
| --- | --- |
| Branch de produção | `main` |
| Root directory | `System-3.0` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Caminhos que disparam build | `System-3.0/**` |

Alterações apenas no README da raiz não disparam o build por esse filtro. As mudanças na aplicação são verificadas e publicadas pela integração existente.

Para publicação manual por uma máquina já autenticada na conta correta:

```bash
npm run check
npm run deploy
```

`deploy` gera os assets, aplica as migrações D1 pendentes e publica o Worker. Preserve os identificadores e secrets do ambiente existente. `configure`, `reuse` e a criação de outro ambiente são fluxos específicos descritos no [guia de deploy](docs/DEPLOY-CLOUDFLARE.md).

Depois da publicação, confira **[`/api/health`](https://fine-form-3-0.fineformcare.workers.dev/api/health)**: versão `3.0.0` e `ready: true`. Confira também o site, o menu de Informações no celular e o acesso ao painel.

## Segurança e dados

O painel usa chave e TOTP, sessão opaca em cookie seguro, proteção CSRF e limites de tentativas. Os preços são recalculados no servidor; links privados ficam restritos ao registro autorizado. Detalhes, prazos e limites estão em [Segurança](docs/SEGURANCA.md) e [Privacidade e riscos](docs/PRIVACIDADE-E-RISCOS.md).

Credenciais de execução ficam nos secrets do Worker. `.dev.vars`, `.env`, backups, `node_modules` e o estado local do Wrangler não pertencem ao versionamento.

## Documentação para cada momento

| Preciso de… | Abrir |
| --- | --- |
| Atualizar pelo celular | [Passo a passo no GitHub e Cloudflare](ATUALIZAR-PELO-CELULAR.md) |
| Publicar, migrar ou configurar preview | [Deploy no Cloudflare](docs/DEPLOY-CLOUDFLARE.md) |
| Cuidar da operação diária | [Operação](docs/OPERACAO.md) |
| Consultar serviços e preços | [Preços](docs/PRECOS.md) |
| Entender placas e assinaturas | [Placas e assinaturas](docs/PLACAS-E-ASSINATURAS.md) |
| Entender as notificações | [Notificações](docs/NOTIFICACOES.md) |
| Trabalhar no mascote e na abertura | [Loader e tentáculo](docs/LOADER-TENTACULO.md) |
| Consultar créditos e licenças | [Terceiros](docs/TERCEIROS.md) |

---

**Fine Form · Um veículo por vez. Atenção por inteiro.**
