import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
test('interface de orçamento fica próxima ao header, sem card externo e com campos neutros',async()=>{
 const [css,html]=await Promise.all([readFile('dist/assets/booking-polish.css','utf8'),readFile('dist/atendimento/index.html','utf8')]);
 assert.match(css,/body\[data-page=booking\] \.booking-panel\{[\s\S]*?border:0!important/);
 assert.match(css,/margin:12px auto 40px!important/);
 assert.match(css,/body\[data-page=booking\] \.field :is\(input,select,textarea\)/);
 assert.match(css,/background:#fff!important/);
 assert.ok(html.includes('booking-polish.css'));
 assert.ok(html.includes('receipt-ticket.css'));
});
test('após envio elimina progresso e etapas, mas mantém link de retorno no topo',async()=>{
 const [code,css]=await Promise.all([readFile('dist/assets/booking.mjs','utf8'),readFile('dist/assets/booking-polish.css','utf8')]);
 assert.ok(code.includes("document.body.classList.add('is-booking-complete')"));
 assert.ok(code.includes("document.body.classList.remove('is-booking-complete')"));
 assert.match(css,/is-booking-complete \.booking-aside :is\(h1,\.booking-intro,\.step-nav,\.aside-note\)/);
 assert.match(css,/is-booking-complete \.booking-aside \.back-link/);
 assert.match(css,/is-booking-complete \.booking-panel :is\(\.wizard-top,\.progress-track/);
});
test('comprovante tem divisão de recibo, ações legíveis e protocolo real',async()=>{
 const [js,css]=await Promise.all([readFile('dist/assets/quote-journey.mjs','utf8'),readFile('dist/assets/receipt-ticket.css','utf8')]);
 assert.ok(js.includes('ff-receipt-perforation'));
 assert.ok(js.includes("quote.reference"));
 assert.ok(css.includes('.ff-receipt-perforation:before'));
 assert.ok(css.includes('.ff-receipt-perforation:after'));
 assert.ok(css.includes('color:#fff!important'));
 assert.ok(!js.includes('<barcode'));
});
test('pasta coreografada por cerca de seis segundos sem sucesso antes do POST e com movimento reduzido',async()=>{
 const [js,booking,css]=await Promise.all([
 readFile('dist/assets/quote-journey.mjs','utf8'),
 readFile('dist/assets/booking.mjs','utf8'),
 readFile('dist/assets/receipt-ticket.css','utf8')]);
 assert.ok(js.includes('presentationMs=5100'));
 assert.ok(js.includes("}},4650);"));
 assert.ok(js.includes('Math.max(0,presentationMs-(Date.now()-begunAt))'));
 assert.ok(js.indexOf('confirmed=true')<js.indexOf("stage.classList.add('is-complete'"));
 assert.ok(booking.indexOf("await api('/api/quotes'")<booking.indexOf("journey.complete(quote"));
 assert.ok(booking.includes('journey.fail(e.message,()=>form.requestSubmit())'));
 assert.ok(css.includes('calc(var(--i)*.82s + .35s)'));
 assert.ok(js.includes('if(reduced()){present();return;}'));
});
