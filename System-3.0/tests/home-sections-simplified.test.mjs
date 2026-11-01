import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('home remove galeria, pasta e etapas sem remover avaliações ou atalhos de serviços',async()=>{
 const doc=new JSDOM(await readFile('dist/index.html','utf8')).window.document;
 for(const selector of ['.explorer-section','#react-gallery','.explorer-guidance','.process-section','#react-folder','.process-steps','.process-next','.personal-actions','#human-title']){
  assert.equal(doc.querySelector(selector),null,selector+' precisa estar ausente');
 }
 for(const selector of ['#cuidados #service-grid','#care #plan-grid','#avaliacoes #reviews-list','#react-velocity','#react-closing','.closing-panel','[data-footer]']){
  assert.ok(doc.querySelector(selector),selector+' preservado');
 }
 const main=doc.querySelector('main');
 const sections=[...main.children].filter(n=>n.tagName==='SECTION');
 const idx=id=>sections.findIndex(n=>n.id===id);
 assert.ok(idx('cuidados')>=0&&idx('avaliacoes')===idx('cuidados')+1,'avaliações logo após cuidados');
 assert.ok(idx('horarios')===idx('avaliacoes')+1,'horários logo após avaliações');
 assert.ok(idx('duvidas')===idx('horarios')+1,'FAQ após os horários');
});
test('horários são apresentados sozinhos e FAQ mantém primeira, segunda e última',async()=>{
 const doc=new JSDOM(await readFile('dist/index.html','utf8')).window.document;
 const sec=doc.querySelector('#horarios');
 assert.ok(sec);
 assert.equal(sec.querySelectorAll('.hours-panel').length,1);
 assert.equal(sec.querySelectorAll('.personal-layout>div').length,0);
 assert.ok(sec.textContent.includes('Segunda a sábado'));
 assert.ok(sec.textContent.includes('Domingo'));
 assert.ok(sec.querySelector('.hours-heading h2'));
 assert.equal(sec.querySelector('.hours-panel>img'),null);
 assert.ok(sec.textContent.includes('Com agendamento'));
 assert.ok(sec.textContent.includes('9h — 17h30'));
 assert.ok(sec.textContent.includes('9h — 12h'));
 for(const removed of ['É comigo','que você fala','Prefiro e-mail','Conversar no WhatsApp'])assert.ok(!sec.textContent.includes(removed));
 const questions=[...doc.querySelectorAll('#duvidas .faq-list>details>summary')].map(x=>x.textContent.replace('+','').trim());
 assert.deepEqual(questions,[
  'Escolher um horário confirma minha reserva?',
  'Quanto tempo leva o serviço?',
  'Como funciona o Care mensal?'
 ]);
 const links=await readFile('dist/links/index.html','utf8');
 const app=await readFile('dist/assets/app.mjs','utf8');
 assert.ok(!app.includes("href=\"'+root+'#sobre\""));
 assert.ok(app.includes("href=\"'+root+'#horarios\""));
 assert.ok(!links.includes('href="../#experiencia"'));
 assert.ok(links.includes('href="../atendimento/?mode=guidance"'));
});
test('mobile e desktop unem seções sem eliminar os horários',async()=>{
 const css=await readFile('dist/assets/studio.css','utf8');
 const segment=css.slice(css.indexOf('/* Página inicial mais direta'));
 assert.ok(segment.startsWith('/* Página inicial mais direta'));
 for(const v of ['.reviews-section','.personal-section','.personal-layout','.hours-panel','.faq-section','@media(max-width:600px)']){
  assert.ok(segment.includes(v),v+' precisa de ajuste');
 }
});
