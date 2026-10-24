# Segurança da Fine Form 3.0

## Restrição geográfica ao Brasil — 23/10/2026

Toda requisição pública passa pelo Worker antes de qualquer página ou arquivo estático (`assets.run_worker_first: true`). O Worker permite apenas `request.cf.country === 'BR'`, metadado fornecido pela borda Cloudflare. Outros países, Tor e localização ausente/desconhecida recebem HTTP 403 com `Cache-Control: no-store` antes de acessar assets, D1 ou novas conexões WebSocket. A API retorna o código `country_restricted`. Não há exceção por User-Agent, cookie, cabeçalhos enviados pelo visitante ou alegação de país. O desenvolvimento continua disponível em localhost, 127.0.0.1 e [::1]. As tarefas internas agendadas não dependem da geolocalização HTTP.

A restrição considera o IP de saída, não nacionalidade ou localização física garantida. Uma VPN com saída no Brasil pode acessar; uma VPN com saída no exterior será bloqueada. Robôs legítimos e prévias de links que consultam de fora do Brasil também serão bloqueados. O bloqueio não substitui autenticação, autorização, limites de tentativas e demais proteções existentes.

As cidades dos datacenters (`colo`) indicam onde a Cloudflare atende a requisição e são diferentes do país do visitante (`country`). Uma requisição aparecer no painel não comprova invasão; as recusadas podem continuar aparecendo nas métricas. Referências: [metadados da requisição](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties) e [Worker antes dos assets](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

Os testes de geografia exercitam páginas e assets reais no Miniflare, Brasil, países externos, localização desconhecida, cabeçalhos falsificados, escritas, HEAD, OPTIONS, HTTP e WebSocket. A revisão histórica abaixo mantém o contexto da entrega inicial.

## Revisão inicial

A revisão usa o System-2.0.zip enviado em 13/10/2026. O GitHub indicado não ficou acessível pela conexão disponível; o ZIP é a fonte efetivamente revisada. Nenhuma alteração foi aplicada à sua conta Cloudflare ou ao repositório remoto nesta entrega.

## Acesso ao painel

O painel publicado exige uma chave de 256 bits gerada por `security:setup` e um autenticador TOTP (SHA-1, seis dígitos, trinta segundos). A configuração aceita apenas segredo Base32 de vinte bytes. Há uma janela de um passo para diferença de relógio; um código já aceito não pode ser reutilizado. O algoritmo foi verificado com os vetores oficiais do RFC 6238.

Tentativas de login/reauth são limitadas a oito por IP em uma janela de quinze minutos. Após validar a chave, o segundo fator tem também limite global de doze tentativas por quinze minutos, entre IPs diferentes. Tentativas com chave errada não gastam essa cota global. O IP utilizado é o `CF-Connecting-IP` fornecido pela borda Cloudflare.

O cookie HTTPS `__Host-ff_admin` não contém a chave nem dados de clientes. Tem Secure, HttpOnly, SameSite Strict e Path=/, sem Domain. O D1 recebe apenas o hash do identificador. A sessão é vinculada ao host, à assinatura do navegador e à configuração atual dos secrets. Logout remove a sessão no servidor; a troca de um secret invalida as sessões anteriores.

Validade máxima: duas horas. Inatividade: vinte minutos sem requisição de atividade. A consulta automática de sessão não renova a validade. Depois de dez minutos, alterações administrativas e exportação exigem nova confirmação da chave e do autenticador. A confirmação gira o cookie e o token CSRF. A tela limpa dados internos ao encerrar a sessão e ao sair da página.

Origem exata é exigida em operações de escrita; cookies sozinhos não autorizam alterações. São exigidos token CSRF e sessão válida. Requisições de outros sites e de subdomínios diferentes são rejeitadas. O servidor impede envio de credenciais por HTTP remoto.

## Recebimentos e crédito Care

Os preços de planos vêm do catálogo do servidor. O cliente não define o preço, a quota ou o total do painel. Recebimentos são inteiros em centavos, com validação no SQL e na API. Ativação e renovação exigem confirmação explícita de pagamento pelo administrador.

A migração importa os ciclos pagos existentes e novas confirmações criam recibos na mesma transação do ciclo. Um recibo guarda valor, data, identificadores do ciclo/plano e identificador da sessão que confirmou; não copia nomes ou telefones. O total mensal é calculado no servidor a partir desses recibos, no horário de São Paulo (UTC−3), e continua existindo se o cliente/plano for excluído. Ciclos pagos não podem ter valor ou confirmação reescritos por um UPDATE normal.

Recibos e eventos de auditoria são protegidos contra UPDATE e DELETE por triggers. A API não oferece métodos para editar/apagar esses registros. Isso não é prova bancária nem assinatura de documento: o valor é uma confirmação manual e um administrador direto do banco pode remover triggers ou trocar o código. Confirmações equivocadas, pagamentos avulsos, lucro e estornos não têm um fluxo financeiro nesta versão.

Saldo de lavagens continua separado em disponível, reservado e concluído. Validação no banco e controle de versão impedem reservar o mesmo crédito em operações concorrentes. Excluir registros de visitas mantém o comportamento anterior de devolver crédito; isso não remove os recibos financeiros.

## Navegador, cliente e conexão ao vivo

A política de scripts permite apenas scripts da própria aplicação, sem scripts inline/eval. No painel também não são permitidos estilos inline. Dados enviados pelo cliente são escapados antes de aparecer como HTML. Responses dinâmicas recebem headers no Worker; `_headers` cobre assets estáticos. Páginas/API privadas usam no-store e noindex, sem referrer e sem incorporação por iframe.

Links de cliente usam tokens aleatórios de 256 bits no fragmento; somente hashes ficam no D1. A API autoriza exclusivamente o pedido/plano correspondente e não fornece direitos administrativos a esses links. IDs sozinhos não autorizam consulta. Links podem ser reemitidos no painel.

Tickets de WebSocket duram sessenta segundos, têm uso único e são vinculados ao host, ao registro e, no painel, à sessão. Novas conexões validam novamente a autorização. As conexões expiram em até cinco minutos para renovar a autorização; logout/reauth solicita fechamento das conexões da sessão revogada. Mensagens ao vivo informam apenas que houve mudança; os dados continuam exigindo autorização na API.

## Instalação e manutenção

Produção e Preview devem usar D1 separados. Os scripts de preview conferem os IDs antes de aplicar migrações e publicar. Secrets nunca entram no Git nem no pacote. Para mudar a chave/autenticador, use `security:setup` no computador autorizado. Guarde a recuperação do autenticador em local privado.

Os testes locais cobrem fluxos, ataques, migração e empacotamento. Esta entrega não inclui pentest externo, teste de carga na sua conta, configuração de WAF/Access pela sua conta nem garantia de bloqueio absoluto. O deploy real e a configuração de secrets precisam ser feitos pelo passo a passo; a revisão não acessou o banco de produção.

## Referências

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html)
- [Headers dos Assets Cloudflare](https://developers.cloudflare.com/workers/static-assets/headers/)
