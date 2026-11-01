import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {buildDigitalReceipt,startQuoteJourney} from '../dist/assets/quote-journey.mjs';

const quote={
 id:'server-returned-id',reference:'FF-ABCD1234',createdAt:'2026-11-01T14:00:00.000Z',
 model:'Civic 2020',vehicle:'car',selection:{mode:'single',date:'2026-11-04',time:'10:30',notes:'Lavagem e cuidado',goals:['Pintura']},
 budget:{hasBase:true,total:180,items:[{label:'Premium',price:180}]}
};
test('comprovante usa exclusivamente referencia, data e itens retornados da API',()=>{
 const html=buildDigitalReceipt(quote,'https://fineform.example/acompanhar/?id=id#t=private-token');
 assert.match(html,/FF-ABCD1234/);
 assert.match(html,/Civic 2020/);
 assert.match(html,/Premium/);
 assert.match(html,/04\/11\/2026/);
 assert.match(html,/R\$\s*180/);
 assert.match(html,/Acompanhar solicitação/);
 assert.match(html,/Solicitação recebida/);
 assert.doesNotMatch(html,/barcode|código de barras|pagamento confirmado/i);
});
test('comprovante omite campos não informados e neutraliza HTML de entrada',()=>{
 const markup=buildDigitalReceipt({...quote,reference:null,createdAt:null,model:'<script>teste</script>',selection:{mode:'guidance'},budget:{hasBase:false,items:[]}},'https://fineform.example/');
 assert.doesNotMatch(markup,/<script>/);
 assert.match(markup,/&lt;script&gt;/);
 assert.doesNotMatch(markup,/FF-ABCD1234/);
 assert.doesNotMatch(markup,/R\$\s*180/);
 assert.match(markup,/Orientação técnica solicitada/);
});
test('estado inicial de envio jamais mostra sucesso antecipado; erro permite nova tentativa',()=>{
 const dom=new JSDOM('<!doctype html><html><body><p id="form-error"></p></body></html>',{url:'https://fineform.example/'});
 const oldDocument=global.document,oldWindow=global.window;
 global.document=dom.window.document;
 global.window=dom.window;
 dom.window.matchMedia=()=>({matches:true});
 try{
  const journey=startQuoteJourney();
  const dialog=dom.window.document.getElementById('ff-quote-journey');
  assert.ok(dialog);
  assert.match(dialog.textContent,/Organizando sua solicitação/);
  assert.doesNotMatch(dialog.textContent,/Solicitação recebida/);
  let retries=0;
  journey.fail('Falha de teste',()=>{retries++});
  assert.equal(dialog.querySelector('.ff-journey-error').hidden,false);
  assert.match(dialog.textContent,/Falha de teste/);
  dialog.querySelector('[data-journey-retry]').click();
  assert.equal(retries,1);
  assert.equal(dom.window.document.getElementById('ff-quote-journey'),null);
 }finally{
  global.document=oldDocument;
  global.window=oldWindow;
  dom.window.close();
 }
});
test('integração aguarda a API e preserva exclusão de envios duplicados',async()=>{
 const [booking,html,css]=await Promise.all([
  readFile('dist/assets/booking.mjs','utf8'),
  readFile('dist/atendimento/index.html','utf8'),
  readFile('dist/assets/quote-journey.css','utf8')
 ]);
 assert.ok(booking.indexOf("if(!state.ack)")<booking.indexOf("const journey=startQuoteJourney()"));
 assert.match(booking,/if\(sending\)return/);
 assert.ok(booking.indexOf("await api('/api/quotes'")<booking.indexOf("journey.complete(quote"));
 assert.ok(booking.includes("journey.fail(e.message,()=>form.requestSubmit())"));
 assert.ok(booking.includes('saveBookmark(quote.id,token,quote.reference'));
 assert.ok(booking.includes("buildDigitalReceipt(quote,link)"));
 assert.ok(booking.includes("downloadDigitalReceipt(quote,link)"));
 assert.ok(html.includes('quote-journey.css'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('.ff-journey.is-handoff'));
});
