# Fine Form 3.0 — retirar o total recebido do painel

Atualização preparada sobre `Fine-Form-3.0-Projeto-Completo.zip`, criado em 13/10/2026.

O cartão **Pagamentos Care registrados no mês** foi removido da Visão geral. A API do dashboard deixa de consultar e retornar o total de recebimentos. O texto explicativo desse total também sai. A Visão geral fica com três indicadores: pedidos aguardando resposta, atendimentos de hoje e assinaturas com ciclo vigente.

O layout usa três cartões por linha no desktop. No layout de duas colunas, o terceiro ocupa a linha inteira.

Os recibos `payment_receipts`, as tabelas, as migrações e os dados existentes continuam preservados. A gestão de pedidos, os preços dos serviços, a ativação e a renovação Care continuam funcionando. Esta alteração dispensa migração do banco.

1. Abra no VS Code a pasta do seu projeto Fine Form 3.0, aquela que contém `package.json` e `wrangler.jsonc`.
2. Extraia o conteúdo deste ZIP **diretamente nessa pasta**, mantendo as pastas `dist`, `worker` e `tests`. Aceite substituir os arquivos correspondentes. Se o extrator criar uma pasta com o nome do ZIP, copie o conteúdo dela para a raiz do projeto.
3. No terminal do VS Code, com a raiz do projeto aberta, execute:

```sh
npm ci
npm run check
```

O comando `check` executa os testes, gera o build e simula a publicação.

4. Para publicar a atualização no Worker já configurado no seu `wrangler.jsonc`, execute:

```sh
npx wrangler deploy
```

5. Recarregue `/painel/`. Confira que os três indicadores aparecem e que o cartão de pagamentos desapareceu. Os valores dos pedidos continuam disponíveis na gestão de atendimento.

Arquivos incluídos:

| Arquivo | Alteração |
| --- | --- |
| `dist/assets/admin.mjs` | Retira o cartão e o texto do total; atualiza a mensagem de acompanhamento ao vivo. |
| `dist/assets/system.css` | Ajusta o layout para os três cartões restantes. |
| `worker/index.mjs` | Remove a soma de recebimentos e o campo `monthlyPayments` do dashboard. |
| `tests/frontend.test.mjs` | Confere os três indicadores e a ausência do cartão financeiro. |
| `tests/system.test.mjs` | Confere os contadores de pedidos e atendimentos e a preservação dos recibos. |
| `tests/security.test.mjs` | Confere a integridade dos recibos diretamente no banco, com a API sem total financeiro. |

Validação concluída: **83 testes aprovados**, build aprovado e `wrangler deploy --dry-run` aprovado. A validação de interface dos testes usa DOM/API; ela não é uma renderização visual de navegador. Nenhuma publicação foi feita nesta entrega.
