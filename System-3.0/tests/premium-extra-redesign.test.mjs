import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findService,availableTreatments,normalizeTreatments,quoteFor,treatmentPrice,createSummary} from '../dist/assets/catalog.mjs';

const state={vehicle:'car',mode:'single',service:'extra',extras:[],treatments:[]};
test('Premium dos carros e Care Moto recebem destaque, Extra continua sem polimento',async()=>{
 const [js,css,html]=await Promise.all([
  readFile('dist/assets/app.mjs','utf8'),
  readFile('dist/assets/studio.css','utf8'),
  readFile('dist/index.html','utf8')
 ]);
 assert.ok(!js.includes("(vehicle==='moto'&&id==='motoPremium'?'service-featured':'')"));
 assert.ok(js.includes("grid.innerHTML=ids.map"));
 assert.ok(js.includes('service-featured care-moto-featured'));
 assert.ok(js.includes("(id==='premium'&&vehicle==='car'?'service-featured':'')"));
 assert.ok(!js.includes("(id==='extra'?'service-complete':'')"));
 assert.ok(css.includes('.service-row.service-featured'));
 assert.ok(css.includes('background:#171b1a'));
 assert.ok(!css.includes('background:linear-gradient(130deg'));
 assert.ok(css.includes('.service-row.service-featured::before{content:none}'));
 const extra=findService('extra');
 assert.equal(extra.price,1290);
 assert.ok(extra.includes.every(x=>!/polimento/i.test(x)));
 assert.ok(!/polimento/i.test(extra.description));
 assert.equal(extra.covered.includes('polishLight'),false);
 for (const id of ['polishLight','polishPremium'])
  assert.ok(availableTreatments(state).some(x=>x.id===id),'polimento independente '+id);
 assert.ok(!availableTreatments(state).some(x=>x.id==='polishMedium'),'Polimento Médio não deve estar à venda');
 assert.equal(quoteFor(state).total,1290);
 assert.equal(treatmentPrice('coating',state),1390);
 assert.equal(quoteFor({...state,treatments:['coating']}).total,2680);
 assert.equal(quoteFor({...state,treatments:['polishLight']}).total,1680);
 assert.equal(quoteFor({...state,treatments:['polishPremium']}).total,2280);
 assert.ok(normalizeTreatments({...state,treatments:['polishPremium']}).includes('polishPremium'));
 assert.ok(createSummary(state).includes('1.290'),'resumo deve apresentar o preço R$ 1.290');
 assert.ok(html.includes('id="react-velocity"'),'animação mantida');
});
test('linhas separadoras soltas removidas sem eliminar estrutura de preços',async()=>{
 const css=await readFile('dist/assets/studio.css','utf8');
 const tail=css.slice(css.indexOf('/* Retira linhas soltas de separação'));
 for(const selector of ['.velocity-band','.care-section','.menu-section','.explorer-section','.process-section','.personal-section','.faq-section','.site-footer','.footer-bottom','.paint-treatments','.area-menu']){
  assert.ok(tail.includes(selector),'sem linha: '+selector);
 }
 assert.match(tail,/border-top:0/);
 assert.ok(!tail.includes('.care-facts{border-top:0}'),'a linha da economia permanece');
});
