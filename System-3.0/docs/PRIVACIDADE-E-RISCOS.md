# Fine Form — revisão dos 17 pontos

Revisão em 20/10/2026. Implementação técnica e textos correspondentes ao funcionamento observado do projeto. Não é certificação jurídica, auditoria integral de acessibilidade ou garantia de ausência de processos.

| Ponto | Resultado e limite |
| --- | --- |
| 1. Política de privacidade | `/privacidade/`: dados, finalidades, fundamentos, fornecedores, conservação, direitos e canal real de contato. Identificação jurídica ainda depende dos dados abaixo. |
| 2. Termos de serviço | `/termos/`: orçamento, confirmação pessoal, pagamento fora do site, limitações de resultado, Care e direitos do consumidor. |
| 3. Aviso de cookies | Aviso informativo e `/cookies/`. Sem botão de consentimento fictício: não existem ferramentas opcionais de rastreamento nesta versão. |
| 4. Reembolso | `/cancelamento-e-reembolso/`: canal existente, direito de arrependimento, hipóteses de restituição e preservação de direitos, sem multa ou perda de sinal inventada. |
| 5. Formulários e LGPD | Aviso junto ao envio, links para políticas e separação entre solicitação de atendimento, armazenamento local e autorização de avaliação. Versão do aviso dos novos pedidos registrada em `selection_json`. Pedidos antigos não ganham consentimento retroativo. |
| 6. Só dados necessários | Orçamento usa nome, contato, veículo e escolhas. Placa continua presencial; não se acrescentaram CPF, endereço, cartão ou localização ao formulário. Rascunho é opcional, até 30 dias; novos links privados exigem escolha, até 90 dias. |
| 7. Tracking | Nenhum Analytics, Tag Manager, Meta Pixel, SDK social ou mapa incorporado no código. CSP limita scripts e conexões à própria origem. Recursos técnicos da hospedagem têm finalidade distinta. Conferir também a configuração da conta Cloudflare. |
| 8. Acessibilidade | Estrutura semântica, rótulos, mensagens, conteúdo legal disponível sem JavaScript, links de pular conteúdo e respeito ao movimento reduzido. Falta auditoria manual completa com tecnologias assistivas. |
| 9. Alt nas imagens | Páginas estáticas verificadas sem imagens que omitam `alt`; imagens de conteúdo descritas e decoração com alternativa vazia. Componentes existentes preservados. |
| 10. Contraste | Texto escuro sobre o ciano da marca, avisos e focos reforçados. Pares de cores da camada nova verificados por cálculo. Não equivale a medição de todo pixel de todas as telas. |
| 11. Teclado | Foco visível e destino de pular conteúdo focável. Menu, diálogos, formulários, notas e carrossel possuem controles de teclado; galeria mantém botão alternativo ao arraste. |
| 12. Avaliações falsas | Publicação continua vinculada a pedido entregue e autorização específica; notas baixas não são suprimidas. Revogação autenticada pelo mesmo link despublica, remove nome e comentário e atualiza contagem/média. |
| 13. Promessas | Serviços e preços preservados. Termos esclarecem avaliação de materiais, estado anterior, cura e resultado variável, sem renúncia a responsabilidade legal. |
| 14. Imagens | `/creditos/` com autores, fontes e licença registrada; fotos explicitamente editoriais, sem alegar serviços prestados ou endosso de marcas. Confirmar direitos da identidade original e de todo material futuro. |
| 15. Dados da empresa | Marca, responsável de atendimento, região, telefone, e-mail e horários publicados. Razão social/nome civil completo, CNPJ ou identificação aplicável e endereço físico completo não estavam no projeto e continuam pendentes. |
| 16. Conformidade LGPD | Melhorias técnicas aplicadas. Cumprimento integral também exige atendimento de direitos, regras internas de retenção, contratos com fornecedores e mecanismos de transferência internacional adequados. |
| 17. Outros riscos | Pendências e rotina abaixo. Não há garantia de que um site com políticas não possa ser questionado judicialmente. |

## Dados que Mateus precisa fornecer

- Nome empresarial/razão social ou identificação civil aplicável do fornecedor. “Mateus” é o nome usado no atendimento, não uma razão social confirmada.
- CNPJ ou identificação fiscal aplicável. Não publicar um número fictício, mascarado ou de terceiros.
- Endereço físico completo para localização do fornecedor, incluindo CEP e complemento quando houver. “Mooca, São Paulo” é somente uma região.

Atualizar o gerador `scripts/build-legal.mjs`, o rodapé gerado e a política de privacidade com esses dados verificados. O Decreto nº 7.962/2013 exige identificação e contatos na oferta eletrônica; encaminhar ao responsável jurídico a avaliação do enquadramento específico antes de considerar o item concluído.

## Rotina que depende da operação

1. Monitorar `fineformcare@gmail.com` e o WhatsApp usado no atendimento. Confirmar recebimento de demandas e observar os prazos aplicáveis. Para declaração completa de acesso a dados, o art. 19 da LGPD prevê até 15 dias. Para as demandas de consumidor abrangidas pelo Decreto nº 7.962/2013, observar também o prazo próprio de manifestação. Não confundir o envio preparado no aplicativo do visitante com uma mensagem recebida.
2. Verificar identidade de forma proporcional antes de exportar ou apagar dados. Não pedir documentos por padrão. O painel já possui funções protegidas de consulta, exportação e exclusão; limitar o conteúdo fornecido aos dados do solicitante. Exportação administrativa da base inteira não é resposta adequada a um cliente individual.
3. Definir e documentar a tabela de retenção por finalidade e obrigação legal, incluindo orçamento não convertido, cadastro, histórico financeiro, auditoria e backups. Este trabalho não introduz eliminação automática de registros de produção. A limpeza local ocorre no acesso seguinte, não em segundo plano com o navegador fechado.
4. Ao receber pedido de eliminação, avaliar o que pode ser removido e o que precisa ser conservado com fundamento específico. Não prometer remoção total se houver obrigação legal de guarda. Tratar cópias de segurança e restaurações para evitar reaparecimento indevido de dados eliminados.
5. Formalizar o uso da infraestrutura e suas salvaguardas de transferência internacional conforme a LGPD e a regulamentação da ANPD; verificar termos/DPA do fornecedor e papéis de outros prestadores. O texto da política, sozinho, não comprova essas salvaguardas.
6. Manter MFA nas contas administrativas, acesso restrito ao painel, revisão de permissões e processo de resposta a incidentes. Não enviar tokens de acompanhamento para analytics, ferramentas de erro, prints públicos ou terceiros. Links dão acesso ao respectivo registro: pedir reemissão pelo painel em caso de exposição.
7. Não publicar fotos identificáveis de clientes, placas ou depoimentos sem finalidade e autorização adequadas. Guardar a procedência e licenças dos ativos. Não gerar avaliações, números de clientes ou certificados fictícios.
8. Informar escopo, materiais, preço completo, prazo, cura/secagem e condições antes da contratação. Guardar a confirmação. Revisar políticas com profissional habilitado conforme a operação real; não criar multas, exceções genéricas ao arrependimento ou cláusulas que eliminem garantias legais.
9. Validar manualmente os fluxos em celular, teclado, zoom e leitor de tela. A validação desta entrega é automatizada com DOM e testes da API; não foi executada uma auditoria completa de navegador/tecnologia assistiva.
10. Se instalar qualquer tracking opcional no futuro, revisar inventário e fundamento, manter o recurso bloqueado antes da escolha aplicável e oferecer rejeição e revogação fáceis. O aviso “Entendi” atual apenas fecha a informação e não autoriza tracking.

## Validação técnica

- Suite de testes do projeto, incluindo envio, Care, autenticação, proteção dos links, avaliações e revogação transacional.
- Testes adicionais de escolha explícita de armazenamento, expiração, limpeza local, links das páginas legais e pares de contraste da camada nova.
- Build dos assets e empacotamento do Worker em modo `wrangler deploy --dry-run`.
- Publicação pela integração Workers Builds já conectada ao GitHub; conferir o resultado do commit e as novas páginas na URL de produção.

## Fontes oficiais consultadas

- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), especialmente arts. 6, 7, 8, 9, 18, 19, 33 e seguintes e 46.
- [Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm), especialmente arts. 20, 30, 37 e 49.
- [Decreto nº 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm).
- [Guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [teclado](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).
- [Licença Unsplash](https://unsplash.com/license).
