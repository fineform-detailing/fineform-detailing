import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('rodapé editorial é exclusivo da Home, mantendo o dock e os links legais acessíveis',async()=>{
 const app=await readFile('dist/assets/app.mjs','utf8');
 assert.ok(app.includes("footer && document.body.dataset.page==='home'"));
 assert.ok(app.includes("footer && document.body.dataset.page!=='home'"));
 assert.ok(app.includes("document.body.append(dock)"));
 assert.ok(app.includes("footer.remove()"));
 const home=new JSDOM(await readFile('dist/index.html','utf8')).window.document;
 const booking=new JSDOM(await readFile('dist/atendimento/index.html','utf8')).window.document;
 assert.ok(home.querySelector('[data-footer]'));
 assert.ok(booking.querySelector('.privacy-note a[href="../privacidade/"]'));
 const styles=await readFile('dist/assets/studio.css','utf8');
 assert.ok(styles.includes('body:not([data-page=home]).has-ff-dock'));
 assert.ok(styles.includes('padding-bottom:calc(94px + env(safe-area-inset-bottom,0px))'));
});
test('horários se tornam um card editorial e destaque Premium deixa o visual decorativo',async()=>{
 const home=new JSDOM(await readFile('dist/index.html','utf8')).window.document;
 const hours=home.querySelector('#horarios .hours-panel');
 assert.ok(hours.querySelector('.hours-heading h2'));
 assert.ok(hours.querySelector('dl'));
 assert.equal(hours.querySelector('img'),null);
 const css=await readFile('dist/assets/studio.css','utf8');
 assert.ok(css.includes('background:#171b1a;border:1px solid #171b1a;box-shadow:none'));
 assert.ok(css.includes('.service-row.service-featured::before{content:none}'));
 assert.ok(css.includes('.hours-panel .hours-heading'));
});
test('orçamento mantém todos os campos e etapas com hierarquia revisada',async()=>{
 const booking=new JSDOM(await readFile('dist/atendimento/index.html','utf8')).window.document;
 assert.ok(booking.querySelector('.booking-intro'));
 assert.ok(booking.querySelector('.booking-aside h1'));
 assert.equal(booking.querySelectorAll('#step-nav li').length,5);
 for(const id of ['step-count','reset-draft','wizard-progress','care-form','wizard-content','previous-step','next-step','remember-draft','summary-result']){
  assert.ok(booking.getElementById(id),id+' preservado');
 }
 const css=await readFile('dist/assets/studio.css','utf8');
 assert.ok(css.includes('body[data-page=booking] .booking-layout{'));
 assert.ok(css.includes('grid-template-columns:minmax(250px,330px) minmax(0,1fr)'));
 assert.ok(css.includes('body[data-page=booking] .wizard-actions #next-step'));
 assert.ok(css.includes('@media(max-width:800px)'));
});
