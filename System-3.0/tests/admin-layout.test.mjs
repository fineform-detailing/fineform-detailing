import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {organizeQuoteView,revealQuoteSection} from '../dist/assets/admin-layout.mjs';

function fixture(reference){
 const dom=new JSDOM('<div id="detail"></div>',{pretendToBeVisual:true});
 const detail=dom.window.document.getElementById('detail');
 const render=ref=>{detail.innerHTML='<div class="ff-quote-view"><header class="ff-quote-head"><span class="ff-quote-kicker">Pedido</span><h2>'+ref+'</h2><span class="status-badge">Pendente</span></header><section class="ff-quote-quick"><button type="button">Aceitar</button></section><section class="ff-quote-facts">Cliente e veículo</section><details class="ff-quote-services"><summary>Valores</summary><p>Serviço contratado</p></details><details id="ff-quote-vehicle"><summary>Placa</summary><input name="plate"></details><details id="ff-quote-edit"><summary>Agendamento</summary><form id="quote-edit"><input name="message"><button type="submit">Salvar</button></form></details><div class="ff-quote-security">Link privado</div><details class="ff-quote-history"><summary>Histórico</summary><p>Pedido recebido</p></details></div>';organizeQuoteView(detail);};
 render(reference);return {dom,detail,render};
}
const select=(detail,id)=>detail.querySelector('[data-order-section="'+id+'"]').click();
const visible=detail=>[...detail.querySelectorAll('[role="tabpanel"]')].filter(panel=>!panel.hidden);

test('pedido apresenta uma área por vez e mantém cada formulário em uma única instância',()=>{
 const {dom,detail}=fixture('LAYOUT-1');
 assert.equal(visible(detail).length,1);
 assert.equal(visible(detail)[0].dataset.quotePanel,'summary');
 assert.equal(detail.querySelectorAll('#quote-edit').length,1);
 assert.equal(detail.querySelectorAll('[data-close-dialog]').length,1);
 assert.equal(detail.querySelector('.ff-quote-services').open,true);
 assert.ok(detail.querySelector('[data-quote-panel="history"] .ff-quote-security'));
 assert.ok(detail.querySelector('[data-quote-panel="customer"] #ff-quote-vehicle'));
 organizeQuoteView(detail);assert.equal(detail.querySelectorAll('[role="tablist"]').length,1);
 dom.window.close();
});

test('alternar áreas preserva o que foi digitado e os listeners dos campos',()=>{
 const {dom,detail}=fixture('LAYOUT-2');
 const input=detail.querySelector('[name="message"]');let changes=0;
 input.addEventListener('change',()=>changes++);
 select(detail,'service');input.value='Confirmar horário com o cliente';
 select(detail,'customer');select(detail,'summary');select(detail,'service');
 assert.equal(detail.querySelector('[name="message"]'),input);
 assert.equal(input.value,'Confirmar horário com o cliente');
 input.dispatchEvent(new dom.window.Event('change'));assert.equal(changes,1);
 assert.equal(visible(detail).length,1);dom.window.close();
});

test('navegação por teclado move foco e mantém somente uma aba na ordem de Tab',()=>{
 const {dom,detail}=fixture('LAYOUT-3');
 const current=()=>detail.querySelector('[role="tab"][aria-selected="true"]');
 function key(value){current().dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));}
 current().focus();key('ArrowRight');
 assert.equal(current().dataset.orderSection,'service');assert.equal(dom.window.document.activeElement,current());
 key('End');assert.equal(current().dataset.orderSection,'history');
 key('ArrowRight');assert.equal(current().dataset.orderSection,'summary');
 key('ArrowLeft');assert.equal(current().dataset.orderSection,'history');
 key('Home');assert.equal(current().dataset.orderSection,'summary');
 assert.equal(detail.querySelectorAll('[role="tab"][tabindex="0"]').length,1);
 for(const tab of detail.querySelectorAll('[role="tab"]')){
  const panel=detail.querySelector('#'+tab.getAttribute('aria-controls'));
  assert.equal(panel.getAttribute('aria-labelledby'),tab.id);
 }
 dom.window.close();
});

test('recarregar o mesmo pedido mantém a área e outro pedido começa pelo resumo',()=>{
 const {dom,detail,render}=fixture('LAYOUT-4');
 select(detail,'customer');render('LAYOUT-4');
 assert.equal(visible(detail)[0].dataset.quotePanel,'customer');
 render('LAYOUT-5');assert.equal(visible(detail)[0].dataset.quotePanel,'summary');
 dom.window.close();
});

test('atalhos e validação de formulário revelam a área que contém o campo',()=>{
 const {dom,detail}=fixture('LAYOUT-6');
 const plate=detail.querySelector('[name="plate"]');
 revealQuoteSection(plate);assert.equal(visible(detail)[0].dataset.quotePanel,'customer');
 const message=detail.querySelector('[name="message"]');
 message.dispatchEvent(new dom.window.Event('invalid',{bubbles:false}));
 assert.equal(visible(detail)[0].dataset.quotePanel,'service');
 dom.window.close();
});
