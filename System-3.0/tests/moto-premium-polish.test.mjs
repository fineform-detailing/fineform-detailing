import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extras,compatibleExtras,quoteFor,createSummary} from '../dist/assets/catalog.mjs';

const motoPolish=extras.find(x=>x.id==='motoPolish');

test('Polimento Premium de moto substitui o antigo realce e custa R$ 380',()=>{
 assert.ok(motoPolish);
 assert.equal(motoPolish.label,'Polimento Premium');
 assert.equal(motoPolish.price,380);
 assert.equal(motoPolish.vehicle,'moto');
 assert.ok(motoPolish.description.includes('moto'));
 assert.equal(extras.some(x=>x.label==='Realce de uma peça pintada'),false);
 assert.ok(compatibleExtras('moto').some(x=>x.id==='motoPolish'));
 assert.equal(compatibleExtras('car').some(x=>x.id==='motoPolish'),false);
});

test('orçamento moto inclui Polimento Premium 380, com total real e sem duplicar serviço',()=>{
 const model={vehicle:'moto',model:'Honda CB',mode:'single',service:'motoPremium',extras:['motoPolish'],treatments:[],name:'Cliente',goals:[],date:'',time:'',notes:''};
 const sum=quoteFor(model);
 assert.equal(sum.items.find(x=>x.id==='motoPolish').price,380);
 assert.equal(sum.items.find(x=>x.id==='motoPolish').label,'Polimento Premium');
 assert.equal(sum.total,510);
 assert.ok(createSummary(model).includes('Polimento Premium — R$'));
 const selected=quoteFor({...model,mode:'guidance',extras:['motoPolish']});
 assert.equal(selected.total,380);
 assert.equal(selected.hasBase,false);
});

test('home exibe card de polimento de moto em vez de detalhes genéricos',async()=>{
 const app=await readFile('dist/assets/app.mjs','utf8');
 assert.ok(app.includes('<h3>'+ "'+escape(motoPolish.label)+'" +'</h3>'));
 assert.ok(app.includes('data-extra="motoPolish"'));
 assert.ok(app.includes("money(extraPrice(motoPolish,'moto'))"));
 assert.ok(!app.includes('<h3>Detalhes que merecem atenção</h3>'));
 assert.ok(app.includes('?vehicle=moto&mode=guidance&extra=motoPolish'));
});

test('orçamento permite entrar da home com serviço de polimento preselecionado',async()=>{
 const booking=await readFile('dist/assets/booking.mjs','utf8');
 assert.ok(booking.includes("params.get('extra')==='motoPolish'"));
 assert.ok(booking.includes("state.extras=['motoPolish']"));
 assert.ok(booking.includes("state.mode='guidance'"));
});

test('página Pedidos remove espaço vertical duplo sem afetar outros painéis',async()=>{
 const css=await readFile('dist/assets/system.css','utf8');
 assert.match(css,/body\[data-page=tracking\] \.system-page\{[\s\S]*?padding-top:clamp\(12px,2\.2vw,24px\)!important/);
 assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?body\[data-page=tracking\] \.system-page\{padding-top:10px!important\}/);
});
