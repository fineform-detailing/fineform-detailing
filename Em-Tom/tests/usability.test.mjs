import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
let bundle;const windows=[];
before(async()=>{
 const result=await build({entryPoints:['public/app.js'],bundle:true,format:'iife',write:false,plugins:[{name:'controlled-microphone',setup(build){build.onLoad({filter:/audio-capture\.js$/},()=>({contents:'export class AudioCapture {constructor(options){window.captureTest=options;}async start(){}stop(){}dispose(){}}',loader:'js'}));}}]});
 bundle=result.outputFiles[0].text;
});
after(()=>windows.forEach(w=>w.close()));
const pause=()=>new Promise(resolve=>setTimeout(resolve,10));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await pause();}assert.fail('Interface did not reach the expected state');}
async function open(url='https://em-tom.test/'){
 const dom=new JSDOM(await readFile('public/index.html','utf8'),{url,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;windows.push(w);
 w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.AbortSignal=globalThis.AbortSignal;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},beginPath(){},roundRect(){},fill(){}});
 const sent=[];let failNext=false;const events=[];
 const state={room:{id:'room-test',name:'Ensaio de teste'},members:['bateria','teclado','baixo','violao'].map((instrument,slot)=>({id:'member-'+slot,slot,instrument,name:'QA '+slot,state:'active'})),events,acknowledgements:[]};
 w.fetch=async(path,options={})=>{
  if(path==='/api/session')return Response.json({member:{id:'member-1',name:'QA',slot:1,instrument:'teclado',room_id:'room-test'},admin:false,csrf:'test-only',vapidPublicKey:null});
  if(path==='/api/state')return Response.json(state);
  if(path==='/api/events'&&options.method==='POST'){const body=JSON.parse(options.body);sent.push(body);if(failNext){failNext=false;return Response.json({error:'Falha temporária de teste.'},{status:503});}events.unshift({...body,author:'QA',created_at:Date.now()/1000,read_count:0});return Response.json({ok:true});}
  throw Error('Unexpected request '+path);
 };
 w.eval(bundle);await until(()=>w.document.getElementById('profile-name').textContent==='QA');
 return {w,sent,fail:()=>{failNext=true;}};
}
async function analyze(w){
 w.document.getElementById('capture-button').click();await until(()=>w.document.getElementById('capture-status').textContent.includes('Ouvindo'));
 w.captureTest.onProgress(8.8);
 assert.equal(w.document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),'8');
 w.captureTest.onResult({candidates:[{tonic:0,mode:'major',label:'C'},{tonic:9,mode:'minor',label:'Am'}],reliable:false,confidence:62,reason:'Confirme a tonalidade.',duration:10});
}
test('análise pendente pode ser retomada e falha de envio conserva texto, candidato e id',async()=>{
 const {w,sent,fail}=await open();await analyze(w);const d=w.document;
 assert.equal(d.querySelector('[data-flow-step="1"]').getAttribute('aria-current'),'step');
 assert.equal(d.getElementById('capture-button').classList.contains('primary'),false);
 d.getElementById('result-details').open=true;
 for(const [id,value]of[['result-title','Música de teste'],['result-singer','Voz de teste']]){d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
 d.querySelector('[data-candidate="1"]').click();assert.equal(d.getElementById('result-title').value,'Música de teste');assert.equal(d.querySelector('[data-candidate="1"]').getAttribute('aria-pressed'),'true');
 d.querySelector('.nav-item[data-view="history"]').click();assert.equal(d.getElementById('pending-analysis').hidden,false);assert.match(w.location.search,/tela=history/);
 d.getElementById('resume-analysis').click();assert.equal(d.getElementById('pending-analysis').hidden,true);assert.equal(d.getElementById('result-singer').value,'Voz de teste');
 fail();d.getElementById('share-result').click();await until(()=>d.getElementById('share-result').textContent.includes('Tentar'));
 assert.equal(d.querySelector('[data-flow-step="1"]').getAttribute('aria-current'),'step');
 d.getElementById('share-result').click();await until(()=>d.getElementById('share-result').textContent.includes('Tom compartilhado'));
 assert.equal(sent.length,2);assert.equal(sent[0].id,sent[1].id);assert.equal(sent[1].title,'Música de teste');assert.equal(sent[1].tonic,9);
 assert.equal(d.querySelectorAll('.task-flow .done').length,3);assert.equal(d.querySelector('.task-flow [aria-current]'),null);
 d.querySelector('.nav-item[data-view="history"]').click();assert.equal(d.getElementById('pending-analysis').hidden,true);
});
test('navegação respeita Voltar e diálogo recupera campos manuais sem guardar áudio',async()=>{
 const {w}=await open();const d=w.document;
 d.querySelector('.nav-item[data-view="history"]').click();d.querySelector('.nav-item[data-view="guide"]').click();w.history.back();
 await until(()=>d.getElementById('view-history').hidden===false);
 assert.equal(d.querySelector('.nav-item[data-view="history"]').getAttribute('aria-current'),'page');
 d.querySelector('.nav-item[data-view="capture"]').click();d.getElementById('manual-button').focus();d.getElementById('manual-button').click();
 const title=d.getElementById('manual-title');title.value='Rascunho da música';title.dispatchEvent(new w.Event('input',{bubbles:true}));
 d.getElementById('close-dialog').click();assert.equal(d.activeElement,d.getElementById('manual-button'));
 d.getElementById('manual-button').click();assert.equal(d.getElementById('manual-title').value,'Rascunho da música');
 assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);
});
