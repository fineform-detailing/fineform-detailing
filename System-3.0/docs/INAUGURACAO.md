# Página de inauguração

O Worker `fine-form-3-0` mostra somente a apresentação de inauguração enquanto `PRELAUNCH_MODE` for a string `"true"`.

- A página utiliza a identidade atual: laranja `#FF8000`, preto e tons claros, fontes locais e a marca existente.
- Instagram e WhatsApp usam os contatos já presentes no site. Não há formulário, cadastro de interessados, analytics ou scripts externos nesta apresentação.
- A imagem de estúdio é identificada como ilustração. Não há data ou contagem regressiva sem confirmação de Mateus.
- O bloqueio ocorre no servidor antes de consultar a API ou os Assets. Links diretos, painel e módulos antigos também são interceptados. Não existe parâmetro ou senha de prévia que contorne a regra.
- Somente imagens e fontes da apresentação, seu CSS e `robots.txt` são permitidos. A página inicial responde 200; páginas internas e APIs indisponíveis respondem 503. Todas as páginas ficam com `no-store` e `noindex`.
- A restrição geográfica existente ao Brasil e o redirecionamento para HTTPS continuam anteriores ao bloqueio.
- O banco, as credenciais, as tarefas agendadas e a aplicação original são preservados. Nenhuma migração ou remoção de registro faz parte desta alteração.

## Abrir na inauguração

1. Em `wrangler.jsonc`, altere `vars.PRELAUNCH_MODE` de `"true"` para `"false"`.
2. Execute as verificações e publique pela integração de produção existente.
3. Confira a página inicial, o catálogo, o painel e `/api/health`. Revise também os contatos e documentos antes de receber solicitações.

Não basta esconder a apresentação pelo navegador. A abertura precisa atualizar a configuração do servidor e o arquivo versionado para que o próximo deploy não reative o bloqueio.

## Arquivos

`worker/prelaunch.mjs` contém a apresentação e a lista restrita de assets. `worker/index.mjs` aciona o bloqueio. `tests/prelaunch.test.mjs` verifica rotas diretas, APIs, métodos HTTP, segurança e reabertura.
