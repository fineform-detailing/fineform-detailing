# Fine Form 3.0 — cadastro presencial de veículos e vitrificação de plásticos

Revisão de 17/10/2026. Este pacote substitui a entrega anterior de placas. Use o conteúdo completo deste ZIP. A base é a 3.0 com as notificações de administrador para cinco aparelhos e a remoção do total financeiro.

## Fluxo de atendimento

1. O cliente prepara o orçamento sem informar placa. Você pode aceitar e combinar data/horário.
2. Na chegada, abra o pedido no painel. Em **Receber veículo e cadastrar placa**, digite a placa que você viu e marque a conferência presencial.
3. Salve. A placa passa a aparecer no mesmo link privado do cliente; não é necessário criar outro orçamento ou enviar outro link.
4. No avulso, o cadastro identifica aquele atendimento. O cliente pode trazer outro veículo em outro pedido, com cobrança avulsa própria.
5. No Care, primeiro cadastre o veículo, depois confirme o pagamento para ativar. Cada assinatura atende uma placa. A cada utilização, confira a placa física; outro veículo não utiliza o saldo.

Você pode aceitar/agendar sem placa, mas precisa cadastrar o veículo para iniciar, liberar para retirada ou concluir. O cliente não tem campo para cadastrar/trocar placa, nem consegue autorizar uma placa enviando dados alterados à API.

**Painel → Gerenciador de placas** reúne as assinaturas e os pedidos. Abra um pedido para receber o veículo ou uma assinatura para confirmar/corrigir seu vínculo.

Correções de placa já conferida exigem motivo e ficam no histórico interno. Assinaturas com atendimentos em aberto precisam resolver esses atendimentos antes de mudar de placa. Veículo diferente deve receber orçamento avulso ou assinatura própria; a correção de placa não é uma transferência de lavagens. Pedidos encerrados e visitas realizadas conservam seu histórico.

## Novo cuidado e preços

| Cuidado | Carro | Moto |
| --- | ---: | ---: |
| Revitalização/manutenção dos plásticos externos, já existente | R$ 70 | R$ 50 |
| Vitrificação de plásticos externos | R$ 220 | R$ 150 |
| Upgrade de plásticos no Extra | +R$ 150 | — |

A vitrificação dos plásticos inclui limpeza, preparação e revestimento cerâmico nas superfícies externas sem pintura e compatíveis, sem desmontagem. A entrega considera a cura. A lavagem completa continua separada quando escolhida. Em motos, mantém as exclusões de áreas que precisam de aderência: pneus, freios, banco, manoplas e pedaleiras.

O cálculo remove a revitalização quando a vitrificação é escolhida. No Extra, desconta R$ 70 do acabamento já incluído: o total passa de R$ 1.590 para R$ 1.740. Pintura e plásticos são materiais separados; a vitrificação de pintura permanece R$ 1.390, ou +R$ 970 com preparação elegível. No Care, a vitrificação de plásticos é um adicional daquela visita; não aumenta a mensalidade nem se repete automaticamente.

A análise de custos e margem está em `docs/VITRIFICACAO-PLASTICOS.md`, com hipóteses explícitas. As descrições e preços aparecem no menu, formulário, resumo e cálculo do servidor.

## Aplicação dos arquivos

1. Faça uma cópia da pasta do projeto. Para exportar o banco atual, execute `npm.cmd run backup` na pasta que contém `package.json` e guarde o arquivo gerado.
2. Copie **o conteúdo do ZIP** para essa mesma raiz do projeto, mantendo as pastas `dist`, `worker`, `migrations`, `tests` e `docs`. Aceite substituir os arquivos correspondentes. Se o extrator criar uma pasta com o nome do ZIP, copie o conteúdo dela para a raiz do projeto.
3. No terminal do VS Code, execute:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run deploy
```

Em sistemas que não usam Windows, os comandos equivalentes usam `npm`.

O `deploy` já aplica as migrações pendentes antes de publicar. Se você ainda está na 3.0 com notificações, ele aplica **0004 e 0005**. Se já aplicou o primeiro pacote de placas, ele aplica **apenas 0005**: a migração 0004 é exatamente a mesma, sem edição. Não execute esses arquivos SQL manualmente em duplicidade.

O ZIP preserva seu `wrangler.jsonc`, chaves, autenticador, configuração push, fotos, fontes e dependências. Não é necessário refazer a configuração das notificações ou cadastrar os cinco celulares novamente. Feche e abra o painel/formulário depois de publicar para carregar os módulos atualizados.

## Cadastros anteriores

As placas, pedidos, ciclos, saldos, pagamentos e aparelhos existentes são preservados. Uma placa preenchida no pacote anterior aparece como **Aguardando cadastro presencial** até sua confirmação. Confira o veículo e confirme pelo painel.

A primeira confirmação de uma placa já preenchida pode preservar as reservas abertas do mesmo veículo. Em planos antigos sem placa, a primeira conferência preenche os atendimentos ainda abertos; visitas já realizadas conservam os dados históricos, inclusive quando não havia placa registrada. Se a placa anterior estiver errada e houver atendimentos em aberto, resolva esses registros antes de corrigir o vínculo.

## Arquivos

Substitua os arquivos completos presentes no ZIP; não é necessário localizar pequenas linhas de código. Os principais são:

- `dist/assets/admin.mjs`, `booking.mjs`, `membership.mjs`, `membership-state.mjs`, `tracking.mjs`, `plates.mjs`, `catalog.mjs`, `app.mjs` e `system.css`;
- `dist/index.html`;
- `worker/index.mjs`, `domain.mjs`, `store.mjs`, `quotes.mjs`, `subscriptions.mjs` e `plates.mjs`;
- migrações `0004_vehicle_plates.sql` e **`0005_in_person_vehicle_registration.sql`**;
- testes e documentação atualizados.

O `CHECKSUMS-PLACAS.json` lista cada arquivo e seu hash. `ALTERACOES-PLACAS.patch` serve para revisão/aplicação com Git sobre a 3.0 com notificações. `ALTERACOES-DESDE-PACOTE-ANTERIOR.patch` compara com o primeiro pacote de placas. Use os arquivos completos ou o patch adequado; não aplique ambos sobre os mesmos arquivos.

## Validação

138 testes automatizados aprovados, incluindo cadastro pelo painel, cliente sem campo de placa, atualização do mesmo link, avulsos, Care, migrações e vitrificação de plásticos. Build e simulação de publicação aprovados. Interface verificada com DOM/API; não houve publicação no seu site ou teste visual em navegador nesta entrega.
