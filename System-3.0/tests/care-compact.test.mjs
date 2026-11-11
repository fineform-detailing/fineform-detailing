import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountCarePlans} from '../dist/assets/care-plans.mjs';

test('Care compacto exibe descrição, preço e economia sem legendas e setas extras', async () => {
 const dom=new JSDOM('<main><div id="plans"></div></main>');
 try{
  const plans=[
   {id:'essential',name:'Care Essential',vehicle:'car',price:220,saving:20,visits:2,description:'Cuidado essencial do veículo.'},
   {id:'frequent',name:'Care Premium',vehicle:'car',price:420,saving:0,visits:3,description:'Cuidado frequente do veículo.'},
   {id:'moto',name:'Care Moto',vehicle:'moto',price:280,saving:0,visits:2,description:'Cuidado específico para motos.'}
  ];
  const host=dom.window.document.querySelector('#plans');
  mountCarePlans(host,{plans,money:value=>'R$ '+value,root:'/'});
  assert.equal(host.querySelectorAll('.care-feature').length,3);
  assert.equal(host.querySelectorAll('.care-description').length,3);
  assert.equal(host.querySelectorAll('.care-price').length,3);
  assert.equal(host.querySelectorAll('.care-facts').length,1);
  assert.equal(host.querySelectorAll('.care-interest').length,3);
  assert.equal(host.querySelectorAll('[data-plan-index]').length,3);
  assert.equal(host.querySelectorAll('.care-facts div').length,1,'apenas a economia de cada plano');
  for(const item of host.querySelectorAll('.care-facts')){
   assert.match(item.textContent,/Economia no plano/);
   assert.doesNotMatch(item.textContent,/Visitas|atendimentos/);
  }
  for(const selector of ['.care-photo > span','.care-kind','.care-agreement','.care-dot','.care-arrow','[data-plan-step]']){
   assert.equal(host.querySelector(selector),null,selector+' não deve aparecer');
  }
  const html=await readFile('dist/index.html','utf8');
  assert.doesNotMatch(html,/Sem divisão por porte\. Sujidade excepcional/);
  assert.ok(html.includes('id="react-velocity"'),'animação da home permanece');
 } finally {dom.window.close();}
});
