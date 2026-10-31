# Auditoria técnica, privacidade e conformidade — Fine Form
**Data da análise:** 31/10/2026  
**Escopo real:** pasta `System-3.0` do repositório Fine Form, Worker `fine-form-3-0`, seus bindings/metadados públicos e logs de build. **Não é** certificação jurídica, pentest, auditoria de acessibilidade completa ou inspeção de dados privados.

### Atualização de contexto operacional — informação fornecida pela empresa

**A Fine Form ainda não iniciou as operações.** Até esta atualização, não dispõe de CNPJ aberto, razão social constituída ou endereço comercial definido. **Não preencher nem publicar dados fictícios.** O site permite **enviar solicitações de orçamento/atendimento**, mas não transforma o envio em reserva, aceite de contrato ou pagamento: a análise e a decisão de aceitar ou recusar pertencem ao responsável, que recebe uma notificação e pode comunicar ao interessado a indisponibilidade por ainda não estar operando.

Esta informação foi fornecida pela empresa, e o caráter **manual** da aceitação é consistente com `worker/quotes.mjs` e `docs/OPERACAO.md`; não foi feita aqui uma simulação de aceitação em produção. Dizer que «não é possível enviar pedido» seria impreciso: **enviar uma solicitação é possível; contratar/confirmar automaticamente, não**.

**Conclusão jurídica delimitada:** a mera existência de uma página institucional de pré-lançamento não prova, sozinha, atividade comercial em funcionamento, mas o art. 2º do Decreto 7.962/2013 refere-se a sites utilizados para **oferta ou conclusão** de contrato. A publicação de catálogo, preços e formulário de solicitações pode caracterizar oferta, mesmo sem aprovação automática. O art. 30 do CDC também trata do caráter vinculante de informação/publicidade suficientemente precisa. A situação concreta exige verificar a comunicação comercial e validação por profissional habilitado; a recusa manual não constitui dispensa automática das exigências aplicáveis.

**Controle recomendado:** manter os avisos de que pedidos não representam reserva, contratação nem pagamento; antes de iniciar atendimentos, verificar a identificação e o endereço efetivos do fornecedor e os requisitos de formalização da atividade. Caso se deseje efetivamente um site apenas de pré-lançamento, avaliar restringir a publicidade de serviços/preços ou a recepção de solicitações, **somente com autorização expressa e teste**, sem realizar alteração funcional nesta atualização. A LGPD continua pertinente aos dados de pessoas interessadas coletados no período de preparação, pois o controlador pode ser pessoa natural.

Fontes: [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm), [CDC — arts. 30 e 31](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) e [ANPD — controlador pessoa natural ou jurídica](https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular-referente-lgpd).

## 1. Problemas identificados: descrição, gravidade e evidência

| Severidade | Achado e impacto | Evidência | Situação |
| --- | --- | --- | --- |
| **Médio, com potencial alto se houver oferta ativa** | Empresa ainda não aberta e sem CNPJ, razão social ou endereço comercial definidos (conforme responsável). O site permite solicitações, mas a aceitação é exclusivamente manual. A necessidade e o momento de divulgação da identificação do fornecedor dependem da caracterização da oferta/contratação eletrônica; a recusa manual não gera isenção automática. | Declaração do responsável; `worker/business.mjs`, `worker/quotes.mjs`, `docs/OPERACAO.md`, Decreto 7.962/2013 art. 2º e CDC art. 30. D1 privado não consultado. | Registrar fase pré-operacional; manter comunicação de solicitação não vinculante quanto à confirmação; validar a oferta atual juridicamente e preencher dados reais quando definidos/necessários. Não inventar CNPJ nem endereço. |
| **Médio** | Política operacional de retenção e descarte de D1, logs, backups e financeiro ainda depende de tabela de prazos, fundamentos e responsabilidades. | `dist/privacidade/index.html`, `migrations/`, `docs/OPERACAO.md`. | Não programar deleção automática sem decisão jurídica/financeira. |
| **Médio** | Transferência internacional/contratos com Cloudflare e serviços de push não foram validados quanto às garantias contratuais e países envolvidos. | `wrangler.jsonc`, `worker/push.mjs`, `dist/privacidade/index.html`. | Analisar DPA, mecanismos ANPD e localização efetiva. |
| **Médio** | Restrição `request.cf.country === 'BR'`, deliberada no projeto, bloqueia visitantes fora do Brasil e potencialmente crawlers de mecanismos de busca. | `worker/index.mjs`, `docs/SEGURANCA.md`. | Não alterada; depende de avaliação comercial e de risco. |
| **Médio** | CSP pública permite `style-src 'unsafe-inline'`; remoção repentina pode quebrar componentes. | `worker/security.mjs`, `dist/_headers`. | Refatorar CSS de forma incremental e validar antes. |
| **Médio** | A imagem de capa depende de obtenção do Pexels no build, criando dependência operacional da CDN externa. | `scripts/prepare-hero-photo.mjs`. | Download validado e imagem servida localmente; avaliar fixação/versionamento do binário. |
| **Médio** | Não foi possível auditar branch protection/alertas do GitHub nem controles de MFA dos usuários: branch protection retornou 403 pelo conector. | Consulta API GitHub à `branches/main/protection`. | Conta administradora deve verificar manualmente; não presumir configuração. |
| **Médio** | QA de navegador real, teclado, leitor de tela, Core Web Vitals e restauração de backup não foram executados nesta análise. | Testes atuais são Node, jsdom e Miniflare. | Pendente validação em ambientes reais. |
| **Baixo, corrigido** | Fotografia da abertura era repetida. | Histórico de `dist/index.html`. | Substituída por nova foto Pexels com variantes e crédito. |
| **Baixo, corrigido** | Ausência de `robots.txt` e `sitemap.xml`. | Arquivos ausentes na árvore inicial. | Criados; não compensam a restrição geográfica. |
| **Baixo, corrigido** | Falta de teste de presença/integridade mínima da foto pós-build. | `package.json` anterior. | `scripts/verify-build-assets.mjs` integrado ao `npm run check`. |
| **Baixo, melhoria preventiva** | Não havia workflow específico de auditoria periódica de dependências no repositório inspecionado. | Árvore do GitHub sem `.github/workflows`. | Adicionados workflow read-only e Dependabot; confirmar execução no GitHub Actions. |

Nenhuma falha crítica foi **confirmada** pela inspeção. Isso **não comprova ausência de vulnerabilidades**.

## 2. Correções realizadas e arquivos

- `dist/index.html`: imagem inédita da capa com `srcset`, `preload`, `alt`, e sem reaproveitar a antiga imagem da galeria.
- `scripts/prepare-hero-photo.mjs`: duas resoluções JPEG otimizadas da foto de Kaboompics (Pexels), gravadas na pasta de assets para servir da própria origem.
- `scripts/build-legal.mjs`, `dist/creditos/index.html`, `docs/TERCEIROS.md`: referência e licença da nova imagem.
- `tests/intro.test.mjs`: regressão de foto e responsabilidade da home.
- `scripts/verify-build-assets.mjs` e `package.json`: validação de bytes JPEG, presença, preload, texto alternativo e atribuição; `audit:deps` disponível.
- `dist/robots.txt` e `dist/sitemap.xml`: descoberta SEO, sem indexar caminhos privados.
- `.github/workflows/security-quality.yml`: job sem segredos e sem permissão de escrita, com `npm ci`, auditoria de dependências, testes e build.
- `.github/dependabot.yml`: atualização semanal via PR, sem aceitar upgrades automaticamente.

Não foram alterados D1 de produção, políticas de acesso, secrets, regras geográficas, cobrança, preços, sessão ou dados pessoais.

## 3. Segurança: mitigado e pendente

**Constatado no código:** sessão administrativa HttpOnly/Secure/SameSite Strict, segundo fator TOTP, confirmação recente, CSRF, verificação de origem, limites D1 por tipo de operação, tokens privados aleatórios e armazenados como hash, WebSockets com tickets temporários, erros genéricos no backend, `CSP`, HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `no-store` em rotas sensíveis. Fontes: `worker/security.mjs`, `worker/index.mjs` e testes de segurança.

**Constatado na conta Cloudflare, apenas metadados:** bindings `ADMIN_KEY`, `ADMIN_TOTP_SECRET` e `PUSH_VAPID` do tipo `secret_text`; D1 e Durable Object; URL de prévia desabilitada; deploy disparado por branch `main` e `npm run check`. Nenhum segredo foi exibido.

**Pendências:** configuração WAF/Turnstile e limites de conta, MFA dos administradores GitHub/Cloudflare, gestão de papéis e tokens, inspeção de possíveis alertas de dependências e verificação de rollback/restore. Turnstile não é requisito automático de todo formulário; o orçamento possui honeypot e rate limiting no servidor. Não introduzir indiscriminadamente um desafio externo sem avaliar impacto e necessidade.

Referências técnicas: [OWASP Top 10:2025](https://top10.owasp.org/2025/pt-BR/) e [OWASP ASVS 5.0](https://asvs.owasp.org/). Sua adoção aqui é **parcial**, não certificada.

## 4. Privacidade: inventário e fluxos

| Dados ou recurso | Finalidade | Local/acesso | Hipótese legal em avaliação | Retenção e fornecedor |
| --- | --- | --- | --- | --- |
| Nome, WhatsApp, veículo, modelo, serviço, preferências, notas | Orçamento, agenda e atendimento | D1 `quotes`, painel protegido; consulta por link privado | Tratativas pré-contratuais a pedido do titular (LGPD art. 7º V) | Prazo D1 a definir; Cloudflare |
| Cliente, placa conferida presencialmente, planos, visitas, ciclos, comprovantes administrativos | Execução e histórico Care | D1 `customers`, `subscriptions`, `cycles`, `visits`, recibos; painel e portal privado | Execução contratual, obrigação legal ou exercício de direito, conforme o registro | Retenção conforme obrigações específicas; Cloudflare |
| Nota e comentário voluntários, primeiro nome, autorização de publicação | Avaliações reais de pedidos concluídos | D1 `reviews` e página pública quando autorizada | Consentimento específico da publicação | Revogação despublica; resíduos/retenção a avaliar |
| Endpoint e chave de inscrição push | Avisos opt-in ao cliente e ao administrador | D1 `customer_push_subscriptions`, `admin_push_subscriptions`, fornecedor de push do navegador | Consentimento/escolha de notificações, com hipótese a formalizar | Até revogação/expiração; serviço push |
| Cookie de admin, hash de sessão, limites e auditoria | Autenticar, evitar abuso e manter trilha | Cookie `__Host-ff_admin`, D1; acesso administrativo | Segurança e cumprimento das obrigações; fundamento a registrar | Sessão 2h, inatividade 20min; retenção dos eventos a definir |
| `ff-care-draft-v1` e `ff-orders-v2` | Rascunho e link por escolha explícita | Armazenamento local no aparelho | Tratamento opcional vinculado a finalidade declarada | 30 e 90 dias, respectivamente; limpo na visita |
| Dados técnicos de conexão | Operar e proteger a infraestrutura | Cloudflare + buckets D1 | Tratamento técnico necessário a avaliar | Contrato e configurações de logs a confirmar |

Não foi efetuada leitura/exportação de clientes reais. O inventário é inicial; fundamentos e registros operacionais dependem de aprovação do controlador/assessoria.

O site **não possui evidência de analytics/pixels de marketing nos arquivos revisados**; o aviso existente é informativo, e não um banner que pretende recolher consentimento fictício. Configurações de ferramentas externas devem ser conferidas separadamente. Para direitos dos titulares já existe canal por e-mail/WhatsApp descrito em `/privacidade/`.

## 5. Conformidade brasileira: aplicável, condicional e recomendação

| Norma/referência | Classificação orientativa | Implicação |
| --- | --- | --- |
| LGPD 13.709/2018 | Obrigatória para tratamentos abrangidos | Transparência, finalidades, bases, minimização, direitos, segurança e conservação justificável. |
| CDC 8.078/1990 | Obrigatória nas relações de consumo | Oferta verdadeira, preços/condições claros, direito de informação e limites a cláusulas abusivas. |
| Marco Civil 12.965/2014 | Obrigatória nos dispositivos pertinentes | Privacidade, segurança e obrigações de guarda de registros segundo enquadramento do provedor. |
| LBI 13.146/2015 | Obrigatória segundo aplicação legal concreta | Acessibilidade da informação e dos canais digitais nos termos da legislação. |
| Decreto 7.962/2013 | Condicional à utilização do site para **oferta ou conclusão** de contrato de consumo | O fato de aceitar ou recusar manualmente não afasta automaticamente a norma se já houver oferta. Fase pré-operacional e publicidade efetiva exigem avaliação concreta; não publicar identificadores inexistentes. |
| Res. ANPD 2/2022 | Condicional a enquadramento comprovado como pequeno porte | Algumas flexibilizações, **sem isenção geral** da LGPD. |
| Res. ANPD 19/2024 | Condicional a transferências internacionais efetivas | Definir mecanismo válido e obrigações de transparência. |
| Guia de cookies ANPD | Referência orientativa | Diferenciar tecnologias necessárias, não criar consentimento falso. |
| OWASP Top 10:2025/ASVS 5.0 | Referências técnicas | Orientar revisão de ataques, controles e testes sem alegar certificação. |
| WCAG 2.2 AA | Objetivo técnico de acessibilidade | Exige avaliação manual além de testes automatizados; não afirmar exigência universal literal de AA. |

Fontes oficiais: [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm), [ANPD pequeno porte](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022), [ANPD transferências](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024), [Guia ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## 6. Testes executados versus testes pendentes

**Executado com prova nos logs da Cloudflare** na alteração da imagem: `npm run check` (testes Node, build de produção e `wrangler deploy --dry-run`), seguido de `npm run deploy`: **194 testes aprovados, zero falhas** e publicação concluída no Worker. O commit corrigido foi `4c85f840e30e1bfc3dbeb0ee09d3cbd63272883d`. Um build anterior falhou por expressão regular do próprio teste; foi corrigido, sem produção quebrada.

**Nesta auditoria:** foram **adicionados** `node scripts/verify-build-assets.mjs` ao check e um workflow GitHub para `npm audit`, `npm test`, `npm run build`. Só declarar esses novos comandos aprovados depois de consultar os logs de suas execuções.

**Inspeção estática executada:** scripts, componentes, manifestos de dependências, migrations D1, cabeçalhos, políticas, Cloudflare Worker/Builds e alguns controles do GitHub.

**Não executado:** lint e typecheck (scripts não existentes), testes manuais em navegador real, redes, console, leitor de tela e dispositivos, verificação jurídica por especialista, pentest e restauração de backup. Não inventar resultados.

## 7. Implantação, rollback e continuidade

- Repositório: `fineform-detailing/fineform-detailing`, branch `main`, pasta `System-3.0`.
- Pipeline Cloudflare detectado: `npm run check` e `npm run deploy`.
- O projeto prevê `npm run backup` (export SQL) e orientações em `docs/OPERACAO.md`. Executar backup e restauração em ambiente de teste; não manipular dados reais nesta auditoria.
- Mutações de WAF, banco, credenciais, permissões e georrestrição foram excluídas desta entrega por seu impacto potencial e necessidade de aprovação explícita.

## 8. Pendências e decisões empresariais

1. **Fase pré-operacional confirmada:** ainda não há CNPJ, razão social constituída ou endereço comercial. Não inventar ou preencher campos com informações inexistentes. Antes da efetiva abertura e/ou da oferta/contratação abrangida pelo Decreto 7.962/2013, avaliar com profissional habilitado a formalização e identificação adequada do fornecedor; quando houver dados reais, informar em **Painel → Dados**. Enquanto isso, deixar inequívoco que as solicitações não são aceites, agendamentos ou cobranças automáticas e avaliar a apresentação de preços/ofertas durante a preparação.
2. Validar tabela de retenção, obrigações financeiras e backups; estabelecer procedimento de direitos dos titulares e resposta a incidentes.
3. Rever DPA/fornecedores e transferência internacional, inclusive notificações push.
4. Conferir branch protection, GitHub Actions, Dependabot, token scopes, MFA e Cloudflare WAF.
5. Decidir se geobloqueio exclusivamente BR continuará apesar do impacto em SEO/acesso.
6. Testar teclado, leitores de tela, zoom, movimentos reduzidos, responsividade, console e Core Web Vitals em navegadores reais.
7. Submeter os textos legais e condições comerciais a profissional jurídico com conhecimento da operação efetiva.
