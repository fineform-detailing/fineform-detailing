# Fine Form — revisão dos 17 pontos

Revisão atualizada em 21/10/2026. Implementação técnica e textos correspondentes ao funcionamento observado do projeto. Não é certificação jurídica ou auditoria integral de acessibilidade.

## Solicitações e confirmação manual

O site usa um fluxo permanente de solicitação e confirmação manual, sem avisos ou datas de abertura. A ausência de divulgação não impede acessos à URL pública. O site não promete que o estabelecimento está aberto, não confirma reservas sozinho e não cobra automaticamente.

- Novos pedidos ficam pendentes e recebem `requestStage: appointment` no servidor. Esse marcador não participa da identificação de reenvios. Metadados dos pedidos antigos são preservados, sem avisos de fase no painel ou acompanhamento.
- O painel protege alterações com sessão, autenticador em produção, CSRF, origem e confirmação recente de acesso. Liberar o endereço não aceita o orçamento nem muda data, preço ou status.
- O cadastro `business_profile` separa endereço operacional e identificação pública. O endereço fica privado por padrão. Só as opções de publicação selecionadas pelo administrador aparecem em `/api/business`.
- A liberação cria uma cópia do local em `quotes.location_json`, acessível pelo link privado daquele pedido. Mudar o padrão não muda o que já foi enviado. Retirar o local não apaga mensagens ou cópias externas.
- Valores, Care, conferência presencial de placa, pagamentos manuais e avaliações de pedidos entregues mantêm suas regras anteriores.

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
| 15. Dados da empresa | Contato e região estão visíveis. Nome empresarial, CNPJ e endereço físico do fornecedor podem ser cadastrados e publicados pela aba Dados. Nenhum dado fictício foi criado. A funcionalidade não substitui a regularização e as informações exigidas na oferta eletrônica. |
| 16. Conformidade LGPD | Melhorias técnicas aplicadas. Cumprimento integral também exige atendimento de direitos, regras internas de retenção, contratos com fornecedores e mecanismos de transferência internacional adequados. |
| 17. Outros riscos | Pendências e rotina abaixo. Não há garantia de que um site com políticas não possa ser questionado judicialmente. |

## Dados que Mateus precisa fornecer

- Nome empresarial/razão social ou identificação civil aplicável do fornecedor. “Mateus” é o nome usado no atendimento, não uma razão social confirmada.
- CNPJ ou identificação fiscal aplicável. Não publicar um número fictício, mascarado ou de terceiros.
- Endereço físico completo para localização do fornecedor, incluindo CEP e complemento quando houver. “Mooca, São Paulo” é somente uma região.

Cadastre os dados reais em **Painel → Dados**, sem editar o código. Ao publicar a identificação, o servidor a entrega em `/informacoes/` mesmo sem JavaScript; o rodapé também a consulta. O local de atendimento pode ser diferente do endereço físico divulgado do fornecedor.

O art. 2º do Decreto nº 7.962/2013 exige identificação e endereço físico e eletrônico nos meios usados para oferta ou conclusão de contratação. Enviar o local em particular não é uma dispensa dessa obrigação. O site pronto não resolve a falta dos dados reais, não regulariza a atividade e não garante ausência de questionamentos.

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
- Confirmação de orçamento permanece pendente e não dá ao cliente acesso de aceite; o fluxo é atribuído pelo servidor, mesmo se o cliente informar outro. Falhas de conexão conservam a tentativa para reenvio; confirmações removem o conteúdo temporário de sessão. Reenvios de registros antigos continuam idempotentes.
- Build repetido em diretório isolado remove avisos antigos de abertura e mantém um rodapé por página, sem duplicações.
- Testes de privacidade do endereço, origem, CSRF, concorrência, cópia por pedido, retirada, HTML tratado como texto, mapa seguro e informações públicas sem JavaScript.
- Build dos assets e empacotamento do Worker em modo `wrangler deploy --dry-run`.
- Publicação pela integração Workers Builds já conectada ao GitHub; conferir o resultado do commit e as novas páginas na URL de produção.

## Fontes oficiais consultadas

- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), especialmente arts. 6, 7, 8, 9, 18, 19, 33 e seguintes e 46.
- [Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm), especialmente arts. 20, 30, 37 e 49.
- [Decreto nº 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm).
- [Guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) e [teclado](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).
- [Licença Unsplash](https://unsplash.com/license).
