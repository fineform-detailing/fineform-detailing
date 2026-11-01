import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const css=()=>readFile('dist/assets/booking-layout-fix.css','utf8');
test('cards de contexto e formulário voltam nas cinco etapas',async()=>{
 const s=await css();
 assert.match(s,/not\(\.is-booking-complete\) \.booking-aside\{[\s\S]*?background:#f2f1ec!important/);
 assert.match(s,/not\(\.is-booking-complete\) \.booking-panel\{[\s\S]*?background:#fff!important/);
 assert.match(s,/not\(\.is-booking-complete\) \.booking-panel\{[\s\S]*?border:1px solid/);
 assert.match(s,/not\(\.is-booking-complete\) \.booking-panel\{[\s\S]*?border-radius:27px!important/);
});
test('comprovante continua sem card maior e sem navegação das etapas',async()=>{
 const s=await css();
 assert.match(s,/is-booking-complete \.booking-panel\{[\s\S]*?background:transparent!important/);
 assert.match(s,/is-booking-complete \.booking-panel\{[\s\S]*?border:0!important/);
 const html=await readFile('dist/atendimento/index.html','utf8');
 assert.ok(html.includes('booking-layout-fix.css'));
 assert.ok(html.lastIndexOf('booking-layout-fix.css')>html.indexOf('receipt-ticket.css'));
 assert.ok(html.includes('Voltar ao início'));
});
test('botões secundários ficam recolhidos, sem expor link privado por padrão',async()=>{
 const src=await readFile('dist/assets/booking.mjs','utf8');
 const a=src.indexOf("'<details class=\"result-tools\"");
 const b=src.indexOf("</details>'",a);
 assert.ok(a>=0);
 assert.ok(b>a);
 const fragment=src.slice(a,b+10);
 assert.match(fragment,/<summary>Mais opções de compartilhamento<\/summary>/);
 assert.match(fragment,/<pre class="summary-pre/);
 assert.match(fragment,/id="send-whatsapp/);
 assert.match(fragment,/id="edit-summary/);
 assert.doesNotMatch(fragment,/<details[^>]*open/);
 assert.doesNotMatch(src,/O atendimento será confirmado após análise e conversa. Não há cobrança nem reserva automática/);
});
test('espaçamentos evitam legendas coladas e reduzem o branco final',async()=>{
 const s=await css();
 assert.match(s,/#wizard-content>\.wizard-title\{[\s\S]*?margin:0 0 14px!important/);
 assert.match(s,/#wizard-content>\.wizard-lead\{[\s\S]*?margin:0 0 29px!important/);
 assert.match(s,/is-booking-complete \.booking-layout\{[\s\S]*?margin-bottom:5px!important/);
 assert.match(s,/is-booking-complete \.booking-panel\{[\s\S]*?min-height:0!important/);
 assert.match(s,/@media\(max-width:800px\)/);
 assert.match(s,/@media\(prefers-reduced-motion:reduce\)/);
});
