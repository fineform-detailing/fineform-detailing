import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {readOrders,rememberOrder,readDraft,clearSavedData,DRAFT_TTL,LINK_TTL} from '../dist/assets/privacy-storage.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const id='7baf190e-60d5-43a1-b456-3705af141bb4',token='A'.repeat(43);

test('links privados exigem escolha explícita, expiram e não renovam silenciosamente',()=>{
 const s=storage(),timestamp=1700000000000;
 assert.equal(rememberOrder(s,id,token,'FF-EXEMPLO',{timestamp}),false);
 assert.equal(s.getItem('ff-orders-v2'),null);
 assert.equal(rememberOrder(s,id,token,'FF-EXEMPLO',{remember:true,timestamp}),true);
 assert.equal(readOrders(s,timestamp)[0].expiresAt,timestamp+LINK_TTL);
 assert.equal(rememberOrder(s,id,token,'FF-EXEMPLO',{timestamp:timestamp+1000}),true);
 assert.equal(readOrders(s,timestamp+1000)[0].expiresAt,timestamp+LINK_TTL);
 assert.deepEqual(readOrders(s,timestamp+LINK_TTL),[]);
 assert.equal(s.getItem('ff-orders-v2'),null);
});
test('dados locais antigos ganham prazo e rascunhos expirados são removidos',()=>{
 const s=storage(),timestamp=1700000000000;
 s.setItem('ff-orders-v2',JSON.stringify([{id,token,reference:'FF-ANTIGO',phone:'não deve permanecer'}]));
 assert.equal(readOrders(s,timestamp)[0].expiresAt,timestamp+LINK_TTL);
 assert.ok(!s.getItem('ff-orders-v2').includes('phone'));
 s.setItem('ff-care-draft-v1',JSON.stringify({model:'Civic'}));
 assert.equal(readDraft(s,timestamp).model,'Civic');
 assert.equal(JSON.parse(s.getItem('ff-care-draft-v1')).expiresAt,timestamp+DRAFT_TTL);
 assert.equal(readDraft(s,timestamp+DRAFT_TTL),null);
 assert.equal(clearSavedData(s),true);assert.equal(s.getItem('ff-orders-v2'),null);
});
test('documentos legais abrem sem JS, têm navegação, alternativas de imagem e links locais válidos',async()=>{
 for(const slug of ['privacidade','termos','cancelamento-e-reembolso','cookies','acessibilidade','informacoes','creditos']){
  const dom=new JSDOM(await readFile('dist/'+slug+'/index.html','utf8'),{url:'https://fine-form.test/'+slug+'/'}),d=dom.window.document;
  assert.equal(d.documentElement.lang,'pt-BR');assert.equal(d.querySelectorAll('h1').length,1);
  assert.equal(d.querySelector('main').getAttribute('tabindex'),'-1');
  assert.ok(d.querySelector('nav a[aria-current=page]'));assert.ok(d.querySelector('footer a[href="/privacidade/"]'));
  assert.equal(d.querySelectorAll('img:not([alt])').length,0);
  for(const a of d.querySelectorAll('a[href^="/"]')){const url=new URL(a.href);await access('dist'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));}
  dom.window.close();
 }
});
test('preferências removem rascunhos e links sem consentimento fictício de publicidade',async()=>{
 const html='<body data-page="legal"><button data-cookie-settings>Cookies e dados</button></body>';
 const dom=new JSDOM(html,{url:'https://fine-form.test/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.localStorage.setItem('ff-care-draft-v1','{}');w.localStorage.setItem('ff-orders-v2','[]');
 const result=await build({entryPoints:['dist/assets/privacy.mjs'],bundle:true,format:'iife',write:false});w.eval(result.outputFiles[0].text);
 w.document.querySelector('[data-cookie-settings]').click();assert.ok(w.document.getElementById('privacy-settings').hasAttribute('open'));
 assert.equal(w.document.querySelectorAll('#privacy-settings input').length,0);
 w.document.querySelector('[data-clear-saved]').click();
 assert.equal(w.localStorage.getItem('ff-care-draft-v1'),null);assert.equal(w.localStorage.getItem('ff-orders-v2'),null);
 assert.match(w.document.getElementById('privacy-settings-status').textContent,/removidos/);
 w.document.querySelector('.privacy-banner button').click();assert.equal(w.document.querySelector('.privacy-banner'),null);
 w.close();
});
test('texto e foco da camada de privacidade têm contraste AA nas superfícies utilizadas',()=>{
 const lum=hex=>{const rgb=hex.match(/[0-9a-f]{2}/gi).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const [foreground,background] of [['0b0d0c','53c3b1'],['37483f','e9f6f2'],['4e5848','ffffff'],['17594f','ffffff']])assert.ok(ratio(foreground,background)>=4.5,foreground+' / '+background);
 assert.ok(ratio('176359','ffffff')>=3);
});
