import test from 'node:test';
import assert from 'node:assert/strict';
import {services,plans,extras,findService,compatibleExtras,availableTreatments,treatmentPrice,hasCoating,normalizeExtras,normalizeTreatments,includedFor,todaySP,timesFor,validDate,validatePreference,createSummary,quoteFor} from '../packages/domain/catalog.mjs';
test('lavagens detalham cada área; Extra inclui teto e cintos com aviso somente de secagem dos bancos',()=>{
 for(const id of ['essential','premium','extra']){
  const service=findService(id),text=service.includes.join(' ').toLowerCase();
  assert.deepEqual(service.includes,service.sections.flatMap(section=>section.items));
  for(const area of ['rodas','pneus','painel','tapetes','vidros'])assert.ok(text.includes(area),id+': '+area);
 }
 const essential=findService('essential'),premium=findService('premium'),extra=findService('extra');
 for(const item of essential.includes)assert.ok(premium.includes.includes(item));
 assert.ok(extra.includes.some(item=>item.includes('teto')&&item.includes('cintos')));
 assert.ok(!extra.includes.join(' ').toLowerCase().includes('vitrificação'));
 assert.ok(extra.notice.includes('bancos')&&extra.notice.includes('secar'));
 assert.ok(!extra.notice.includes('teto')&&!extra.notice.includes('Vitrificação'));
});
const sample={vehicle:'car',mode:'single',service:'premium',extras:[],treatments:[],name:'Rafael',model:'Honda Civic',goals:[],date:'2026-10-18',time:'10:00',flexibleDate:false,notes:''};

test('a janela de domingo termina antes de 12h; demais dias antes de 17h30',()=>{
 assert.deepEqual(timesFor('2026-10-18'),['09:00','09:30','10:00','10:30','11:00','11:30']);
 assert.equal(timesFor('2026-10-19').at(-1),'17:00');
 assert.equal(timesFor('2026-10-17').at(-1),'17:00');
 assert.equal(timesFor('2026-10-12').length,17); // feriado não bloqueia a agenda de preferências
});
test('datas inválidas e horários fora do expediente são rejeitados',()=>{
 assert.equal(validDate('2026-02-30'),false);
 assert.equal(validDate('invalid'),false);
 assert.deepEqual(timesFor('2026-02-30'),[]);
 assert.ok(validatePreference({...sample,time:'14:00'},new Date('2026-10-11T22:00:00Z')));
 assert.ok(validatePreference({...sample,date:'2026-10-10'},new Date('2026-10-11T22:00:00Z')));
});
test('data e hora atuais usam São Paulo, inclusive atravessando meia-noite UTC',()=>{
 assert.equal(todaySP(new Date('2026-10-12T01:00:00Z')),'2026-10-11');
 assert.ok(validatePreference({...sample,date:'2026-10-12',time:'09:30'},new Date('2026-10-12T13:00:00Z')));
 assert.equal(validatePreference({...sample,date:'2026-10-12',time:'11:00'},new Date('2026-10-12T13:00:00Z')),'');
});
test('flexibilidade permite combinar a data, mas não torna uma data inválida aceitável',()=>{
 assert.equal(validatePreference({...sample,date:'',time:'',flexibleDate:true}),'');
 assert.ok(validatePreference({...sample,date:'',time:'',flexibleDate:false}));
 assert.ok(validatePreference({...sample,date:'2026-02-30',flexibleDate:true}));
});
test('Premium não duplica cera e plásticos internos',()=>{
 assert.deepEqual(normalizeExtras({...sample,extras:['wax','interiorPlastic','wheelIron','wheelIron']}),['wheelIron']);
});
test('orientação não herda inclusões de um serviço anteriormente selecionado',()=>{
 assert.deepEqual(normalizeExtras({...sample,service:'extra',mode:'guidance',extras:['glassCare','paintIron']}),['glassCare','paintIron']);
});
test('higienização completa contempla bancos, carpete e acabamento interno',()=>{
 assert.deepEqual(normalizeExtras({...sample,service:'fullClean',extras:['fabric','leather','carpet','interiorPlastic','glassCare']}),['glassCare']);
});
test('tratamentos complementares consideram inclusões e um só polimento',()=>{
 const state={...sample,mode:'plan',plan:'careEssential',treatments:['fullClean','polishLight','correction'],extras:['wax','interiorPlastic','leather','carpet','paintIron']};
 assert.deepEqual(normalizeTreatments(state),['fullClean','polishMedium']);
 assert.deepEqual(normalizeExtras(state),[]);
 assert.ok(includedFor(state).includes('fabric'));
 assert.deepEqual(normalizeTreatments({...state,mode:'single',service:'polishPremium'}),['fullClean']);
});
test('motos têm uma lavagem e opcionais compatíveis, incluindo vitrificação de plásticos',()=>{
 assert.equal(services.filter(s=>s.vehicle==='moto').length,1);
 assert.deepEqual(compatibleExtras('moto').map(x=>x.id),['exteriorPlastic','plasticCoating','wheelIron','motoPolish']);
 const state={...sample,vehicle:'moto',service:'motoPremium',extras:['fabric','paintIron','wheelIron','motoPolish'],treatments:['fullClean']};
 assert.deepEqual(normalizeExtras(state),['wheelIron','motoPolish']);
 assert.deepEqual(normalizeTreatments(state),[]);
});
test('economias dos três planos batem com os mesmos serviços avulsos',()=>{
 for(const p of plans){const avulso=p.vehicle==='car'?p.premium*findService('premium').price+p.essential*findService('essential').price:p.premium*findService('motoPremium').price;assert.equal(avulso-p.price,p.saving);assert.equal(p.premium+p.essential,p.visits);}
});
test('mensagem natural inclui escolhas e preferências e pede confirmação ao Mateus',()=>{
 const summary=createSummary({...sample,mode:'plan',plan:'careFrequent',extras:['wax','wheelIron'],treatments:['fullClean'],notes:'Tenho manchas nos bancos.'});
 assert.match(summary,/Care Frequente/);assert.match(summary,/18\/10\/2026/);assert.match(summary,/10:00/);
 assert.match(summary,/Higienização completa/);assert.match(summary,/Descontaminação das rodas/);
 assert.doesNotMatch(summary,/- Cera na pintura/);assert.match(summary,/Care Frequente — R\$/);
 assert.match(summary,/Pode confirmar a disponibilidade e o prazo com esse orçamento/);
});
test('Extra contempla manutenção por área e oferece vitrificação como upgrade separado',()=>{
 const state={...sample,service:'extra',treatments:['fullClean','polishLight','polishMedium','polishPremium','coating'],extras:compatibleExtras('car').map(x=>x.id)};
 assert.deepEqual(normalizeTreatments(state),['coating']);
 assert.deepEqual(normalizeExtras(state),['plasticCoating']);
 assert.deepEqual(availableTreatments(state).map(x=>x.id),['coating']);
 assert.ok(includedFor(state).includes('glassCare'));
 assert.equal(findService('extra').price,1590);
});
test('vitrificação inclui preparação e realce; cera sai da finalização',()=>{
 const state={...sample,service:'polishMedium',treatments:['polishPremium','coating']};
 assert.deepEqual(normalizeTreatments(state),['coating']);
 assert.equal(hasCoating(state),true);
 assert.equal(includedFor(state).includes('wax'),false);
 assert.ok(includedFor(state).includes('paintIron'));
 assert.deepEqual(normalizeTreatments({...sample,treatments:['polishLight','coating']}),['coating']);
 assert.equal(availableTreatments({...sample,service:'coating'}).some(x=>x.id==='polishLight'),false);
 assert.match(createSummary(state),/em substituição à cera/);
});
test('vitrificação com preparação existente e upgrade de correção têm o mesmo preço nos dois caminhos',()=>{
 const coating=findService('coating');
 for(const id of ['polishMedium','polishPremium']){
  const withPolish=treatmentPrice('coating',{...sample,service:id});
  const upgrade=treatmentPrice(id,{...sample,service:'coating'});
  assert.equal(findService(id).price+withPolish,coating.price+upgrade);
 }
 assert.equal(treatmentPrice('coating',{...sample,service:'extra'}),970);
 assert.equal(treatmentPrice('coating',{...sample,service:'essential'}),1390);
});
test('bancos por material são alternativas e limpeza básica não vira adicional cobrado',()=>{
 assert.deepEqual(normalizeExtras({...sample,extras:['leather','fabric']}),['fabric']);
 assert.equal(extras.some(x=>['wax','carpet','interiorPlastic'].includes(x.id)),false);
 assert.ok(services.every(x=>Number.isFinite(x.price)&&x.price>0));
});
test('resumo preserva dados como texto e elimina quebras injetadas nos campos',()=>{
 const summary=createSummary({...sample,name:'Rafael\nStatus: confirmado',model:'<script>alert(1)</script>'});
 assert.match(summary,/Meu nome é Rafael Status: confirmado/);
 assert.doesNotMatch(summary,/\nStatus: confirmado/);
 assert.match(summary,/<script>/); // A UI usa textContent; o export é texto puro.
});


test('orçamento soma opcionais elegíveis e remove preparação compartilhada',()=>{
 assert.equal(quoteFor({...sample,service:'essential',extras:['glassCare']}).total,260);
 const combined=quoteFor({...sample,service:'premium',treatments:['fullClean']});
 assert.equal(combined.gross,630);
 assert.equal(combined.discount,100);
 assert.equal(combined.total,530);
 assert.equal(quoteFor({...sample,service:'fullClean',treatments:['polishLight']}).total,770);
 assert.equal(quoteFor({...sample,service:'extra',treatments:['coating'],extras:['glassCare','fabric','wheelIron']}).total,2560);
});
test('totais com vitrificação são iguais nas duas ordens sem crédito duplicado',()=>{
 for(const [polish,total] of [['polishLight',1390],['polishMedium',1660],['polishPremium',1960]]){
  assert.equal(quoteFor({...sample,service:polish,treatments:['coating']}).total,total);
  assert.equal(quoteFor({...sample,service:'coating',treatments:[polish]}).total,total);
 }
 assert.equal(quoteFor({...sample,service:'coating',treatments:['fullClean','polishPremium']}).total,2310);
 assert.equal(quoteFor({...sample,service:'fullClean',treatments:['polishPremium','coating']}).total,2310);
});
test('plano separa mensalidade de adicionais para uma visita',()=>{
 const quote=quoteFor({...sample,mode:'plan',plan:'careEssential',treatments:['fullClean'],extras:['glassCare','fabric']});
 assert.equal(quote.recurring,260);
 assert.equal(quote.additional,510); // 450 + 160 - 100 de lavagem já no plano; bancos já incluídos
 assert.equal(quote.total,770);
 const plain=quoteFor({...sample,mode:'plan',plan:'careMoto',vehicle:'moto',service:'motoPremium'});
 assert.equal(plain.recurring,280);
 assert.equal(plain.additional,0);
 assert.equal(plain.total,280);
});
test('orientação sem serviço não herda total, e mensagem usa o mesmo orçamento',()=>{
 const guidance={...sample,mode:'guidance',service:'extra',extras:[],treatments:[]};
 assert.equal(quoteFor(guidance).hasBase,false);
 assert.equal(quoteFor(guidance).items.length,0);
 assert.doesNotMatch(createSummary(guidance),/Total|R\$/);
 const message=createSummary({...sample,service:'extra',treatments:['coating']});
 assert.match(message,/Total do atendimento: R\$[\s\u00a0]*2\.560/);
 const planMessage=createSummary({...sample,mode:'plan',plan:'careEssential',treatments:['fullClean']});
 assert.match(planMessage,/Mensalidade: R\$[\s\u00a0]*260\/mês/);
 assert.match(planMessage,/Adicionais nesta visita: R\$[\s\u00a0]*350/);
 assert.match(planMessage,/Total deste pedido: R\$[\s\u00a0]*610/);
});
