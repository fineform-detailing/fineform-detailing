import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {services,extras} from '../dist/assets/catalog.mjs';

test('catálogo conserva preços, detalhes e ações sem legendas redundantes nos cards',async()=>{
 const [html,script,css]=await Promise.all([
  readFile('dist/index.html','utf8'),
  readFile('dist/assets/app.mjs','utf8'),
  readFile('dist/assets/studio.css','utf8')
 ]);
 const doc=new JSDOM(html).window.document;
 const subtitle=doc.querySelector('#cuidados .menu-heading > p');
 assert.equal(subtitle?.textContent,'Compare opções, conheça as etapas e escolha com confiança.');
 const menu=script.slice(script.indexOf('function renderMenu('),script.indexOf("$$('[data-menu-vehicle]').forEach"));
 assert.ok(menu.includes('data-service='));
 assert.ok(menu.includes('data-extra='));
 assert.ok(menu.includes('data-all-details'));
 assert.ok(menu.includes('data-plan-index')===false);
 assert.ok(menu.includes("money(s.price)"));
 assert.ok(menu.includes("money(extraPrice(x,vehicle))"));
 assert.ok(menu.includes('service-positioning'),'identificação curta do serviço restaurada');
 assert.ok(menu.includes('escape(s.description)'),'cards de lavagem preservam descrição');
 assert.ok(menu.includes('escape(x.description)'),'cuidados por área preservam descrição');
 assert.ok(menu.includes("findService('fullClean').description"),'higienização preserva descrição');
 assert.ok(menu.includes('Duas lavagens Moto Premium por mês'),'Care Moto mantém explicação');
 assert.ok(menu.includes('Plásticos, rodas e pintura: tratamentos específicos'),'cuidados de moto preservados');
 assert.ok(script.includes('function openExtra(id)'));
 assert.ok(script.includes('escape(item.description)'));
 assert.ok(script.includes('serviceDetails(s)'));
 const serviceModal=script.slice(script.indexOf('function openService('),script.indexOf('function openExtra('));
 const extraModal=script.slice(script.indexOf('function openExtra('),script.indexOf("let menuVehicle='car'"));
 assert.ok(serviceModal.includes("'+s.description+'"),'a descrição completa continua dentro do modal');
 assert.ok(serviceModal.includes('serviceDetails(s)'),'a lista de serviços incluídos permanece');
 assert.ok(!serviceModal.includes('notice-box'),'sem caixa de aviso redundante');
 assert.ok(!serviceModal.includes('Duração e agenda confirmadas'),'sem legenda antes do botão');
 assert.ok(!serviceModal.includes('Valor do serviço:'),'sem legenda de preço repetida');
 assert.ok(!extraModal.includes('<small>'),'sem legenda extra antes do botão');
 assert.ok(extraModal.includes('escape(item.description)'),'descrição de cuidado complementar preservada');
 assert.ok(script.includes('showDialog('));
 for(const item of services){assert.ok(item.includes.length>0,'escopo detalhado mantido: '+item.id);assert.ok(item.description.length>30,'descrição do serviço preservada: '+item.id)}
 for(const item of extras)assert.ok(item.description,'detalhamento preservado: '+item.id);
 assert.ok(css.includes('Catálogo Fine Form: destaque nos nomes'));
 assert.ok(doc.querySelector('#plan-grid'),'assinaturas seguem disponíveis');
});
