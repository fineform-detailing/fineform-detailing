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
 assert.equal(subtitle?.textContent,'Veja o que cada cuidado inclui e escolha o ideal para seu veículo.');
 const menu=script.slice(script.indexOf('function renderMenu('),script.indexOf("$$('[data-menu-vehicle]').forEach"));
 assert.ok(menu.includes('data-service='));
 assert.ok(menu.includes('data-extra='));
 assert.ok(menu.includes('data-all-details'));
 assert.ok(menu.includes('data-plan-index')===false);
 assert.ok(menu.includes("money(s.price)"));
 assert.ok(menu.includes("money(extraPrice(x,vehicle))"));
 assert.ok(!menu.includes('service-positioning'));
 assert.ok(!menu.includes("s.description"));
 assert.ok(!menu.includes("x.description"));
 assert.ok(!menu.includes("findService('fullClean').description"));
 assert.ok(!menu.includes('Duas visitas Moto Premium por mês'));
 assert.ok(script.includes('function openExtra(id)'));
 assert.ok(script.includes('escape(item.description)'));
 assert.ok(script.includes('serviceDetails(s)'));
 assert.ok(script.includes('showDialog('));
 for(const item of services)assert.ok(item.includes.length>0,'escopo detalhado mantido: '+item.id);
 for(const item of extras)assert.ok(item.description,'detalhamento preservado: '+item.id);
 assert.ok(css.includes('Catálogo Fine Form: destaque nos nomes'));
 assert.ok(doc.querySelector('#plan-grid'),'assinaturas seguem disponíveis');
});
