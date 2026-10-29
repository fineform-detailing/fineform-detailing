import {fixturePlate,vehicleFixture} from './helpers/plates.mjs';
// DOM + API tests; this checks behavior, not visual browser rendering.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {todaySP} from '../dist/assets/catalog.mjs';
import {Miniflare,Log,LogLevel} from 'miniflare';
let mf,db,ip=100,bundles={},windows=[];
import {applyMigrations} from './helpers/database.mjs';
import {digest,REAUTH_SECONDS} from '../worker/security.mjs';
const csrfByCookie=new Map();
const key='test-only-frontend-integration-access-key-more-than-32-chars';
const pause=()=>new Promise(resolve=>setTimeout(resolve,20));
async function until(fn){const end=Date.now()+5000;while(Date.now()<end){if(fn())return;await pause();}assert.fail('A interface não chegou ao estado esperado.');}
async function request(path,body,cookie,cap,method=body?'POST':'GET'){
 await vehicleFixture(db,path,body);
 const r=await mf.dispatchFetch('http://localhost'+path,{method,headers:{Origin:'http://localhost',...(cookie&&csrfByCookie.has(cookie)?{'X-FF-CSRF':csrfByCookie.get(cookie)}:{}),'CF-Connecting-IP':'192.0.2.'+ip++,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(cap?{Authorization:'Bearer '+cap}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();const set=r.headers.get('Set-Cookie');if(set&&data.csrfToken)csrfByCookie.set(set.split(';')[0],data.csrfToken);return {r,data};
}
before(async()=>{
 const result=await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false});
 mf=new Miniflare({modules:true,script:result.outputFiles[0].text,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'fine-form-dom-test'},durableObjects:{LIVE:{className:'LiveUpdates',useSQLite:true}},log:new Log(LogLevel.ERROR)});
 db=await mf.getD1Database('DB');await applyMigrations(db);
 for(const name of ['booking','admin','membership','tracking']){const out=await build({entryPoints:['dist/assets/'+name+'.mjs'],bundle:true,format:'iife',write:false});bundles[name]=out.outputFiles[0].text;}
});
after(async()=>{windows.forEach(w=>{w.dispatchEvent(new w.Event('pagehide'));w.close();});await mf?.dispose();});
async function open(page,module,url='http://localhost/'+page+'/',setup=()=>{}){
 const html=await readFile('dist/'+page+'/index.html','utf8');const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;windows.push(w);let cookie='';
 w.HTMLDialogElement.prototype.showModal??=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close??=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.AbortController=globalThis.AbortController;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.ff={toast(){},contact(){},emailContact(){}};w.confirm=()=>true;w.prompt=()=>null;w.WebSocket=class{constructor(){throw Error('DOM test uses manual refresh');}};
 w.fetch=async(path,options={})=>{const headers=new Headers(options.headers);headers.set('Origin',w.location.origin);if(cookie)headers.set('Cookie',cookie);headers.set('CF-Connecting-IP','192.0.2.'+ip++);const r=await mf.dispatchFetch(new URL(path,w.location).href,{...options,headers});const set=r.headers.get('Set-Cookie');if(set)cookie=set.split(';')[0];return r;};
 w.__testCookie=()=>cookie;setup(w);w.eval(bundles[module]);return w;
}
function input(w,name,value){const el=w.document.querySelector('[name="'+name+'"]');assert.ok(el,'Campo '+name+' existe');el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));return el;}
function submit(w,id){w.document.getElementById(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
let quoteId,quoteToken,subId,portalToken;
test('painel filtra pela etapa do gráfico, busca no topo e abre as áreas do menu compacto',async()=>{
 const w=await open('painel','admin');await until(()=>w.document.getElementById('access-form'));
 input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('.ff-overview-hero'));
 const firstDate=w.document.querySelector('[data-agenda-date]').dataset.agendaDate;
 w.document.querySelector('[data-week="1"]').click();assert.notEqual(w.document.querySelector('[data-agenda-date]').dataset.agendaDate,firstDate);
 w.document.querySelector('[data-week="-1"]').click();assert.equal(w.document.querySelector('[data-agenda-date]').dataset.agendaDate,firstDate);
 w.document.querySelector('[data-agenda-date]').click();await until(()=>w.document.getElementById('agenda-form'));
 assert.equal(w.document.querySelector('#agenda-form [name="date"]').value,firstDate);
 w.document.querySelector('.admin-nav [data-tab="dashboard"]').click();await until(()=>w.document.querySelector('.ff-statistics-link'));
 w.document.querySelector('.ff-statistics-link').click();await until(()=>w.document.querySelector('.ff-chart'));
 w.document.querySelector('.ff-chart-stages [data-status="completed"]').click();
 await until(()=>w.document.getElementById('filter-form'));
 assert.equal(w.document.querySelector('#filter-form [name="status"]').value,'completed');
 w.document.getElementById('admin-search').elements.q.value='busca-sem-registro-qa';submit(w,'admin-search');
 await until(()=>w.document.querySelector('#filter-form [name="q"]')?.value==='busca-sem-registro-qa');
 assert.equal(w.document.querySelector('#filter-form [name="status"]').value,'');
 assert.match(w.document.getElementById('admin-view').textContent,/Nenhum pedido/);
 const more=w.document.querySelector('[data-action="more"]'),menu=w.document.getElementById('admin-more-menu');
 more.click();assert.equal(menu.hidden,false);assert.equal(more.getAttribute('aria-expanded'),'true');
 menu.querySelector('[data-tab="customers"]').click();await until(()=>w.document.getElementById('customers-form'));
 assert.equal(menu.hidden,true);assert.equal(more.getAttribute('aria-current'),'page');
 more.click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(menu.hidden,true);assert.equal(more.getAttribute('aria-expanded'),'false');assert.equal(w.document.activeElement,more);
});
test('cliente envia pedido pelo assistente e recebe total e acompanhamento',async()=>{
 const w=await open('atendimento','booking');input(w,'model','Honda Civic');submit(w,'care-form');
 await until(()=>w.document.getElementById('step-count').textContent.includes('02'));
 w.document.querySelector('[data-action="mode"][data-value="plan"]').click();submit(w,'care-form');submit(w,'care-form');submit(w,'care-form');
 input(w,'name','Cliente DOM');input(w,'phone','11900000100');const ack=w.document.querySelector('[name="ack"]');ack.checked=true;ack.dispatchEvent(new w.Event('change',{bubbles:true}));submit(w,'care-form');
 await until(()=>!w.document.getElementById('summary-result').hidden);
 const text=w.document.getElementById('summary-result').textContent;assert.match(text,/Sua solicitação/);assert.match(text,/260/);assert.match(text,/Acompanhar pedido/);
 const url=new URL(w.document.querySelector('.tracking-link').href);quoteId=url.searchParams.get('id');quoteToken=new URLSearchParams(url.hash.slice(1)).get('t');
 const saved=await request('/api/quotes/'+quoteId,null,null,quoteToken);assert.equal(saved.data.quote.selection.phone,'5511900000100');assert.equal(saved.data.quote.kind,'plan');
 assert.equal(saved.data.quote.status,'pending');assert.equal(saved.data.quote.selection.requestStage,'appointment');
 assert.equal(w.sessionStorage.getItem('ff-pending-submission'),null);
});
test('painel autentica, aceita pedido e ativa assinatura com pagamento confirmado',async()=>{
 const w=await open('painel','admin');await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');
 await until(()=>w.document.querySelector('[data-quote="'+quoteId+'"]'));
 assert.deepEqual([...w.document.querySelectorAll('.admin-metric>span')].map(el=>el.textContent),['Aguardando resposta','Agenda de hoje']);
 assert.doesNotMatch(w.document.getElementById('admin-view').textContent,/Pagamentos Care registrados no mês|O valor acima registra|histórico financeiro/);
 w.document.querySelector('[data-quote="'+quoteId+'"]').click();await until(()=>w.document.getElementById('quote-edit'));
 input(w,'status','accepted');input(w,'message','Care aprovado.');const editing=w.document.getElementById('quote-edit');submit(w,'quote-edit');await until(()=>w.document.getElementById('quote-edit')!==editing&&w.document.querySelector('#quote-edit [name="status"]')?.value==='accepted');const vehicle=w.document.getElementById('register-vehicle');vehicle.elements.plate.value='DOM1A23';vehicle.elements.confirm.checked=true;submit(w,'register-vehicle');await until(()=>w.document.getElementById('activate-plan'));
 const paid=w.document.querySelector('#activate-plan [name="paidConfirmed"]');paid.checked=true;submit(w,'activate-plan');await until(()=>w.document.getElementById('generated-link'));
 const url=new URL(w.document.querySelector('#generated-link a').href);subId=url.searchParams.get('id');portalToken=new URLSearchParams(url.hash.slice(1)).get('t');
 assert.match(w.document.getElementById('admin-detail').textContent,/1.*disponíveis/);assert.ok(!w.localStorage.getItem('key'));
});
test('portal mostra saldo e permite pedir uma visita com preço zero para lavagem inclusa',async()=>{
 const w=await open('assinatura','membership','http://localhost/assinatura/?id='+subId+'#t='+portalToken);await until(()=>w.document.getElementById('visit-request'));
 assert.match(w.document.getElementById('care-overview').textContent,/Essencial/);assert.match(w.document.getElementById('visit-total').textContent,/Adicionais desta visita: R\$\s*0/);
 w.document.querySelector('#visit-request [name="ack"]').checked=true;submit(w,'visit-request');await until(()=>w.document.querySelector('#visit-receipt a'));
 const link=new URL(w.document.querySelector('#visit-receipt a').href),token=new URLSearchParams(link.hash.slice(1)).get('t');
 const saved=await request('/api/quotes/'+link.searchParams.get('id'),null,null,token);assert.equal(saved.data.quote.kind,'subscription_visit');assert.equal(saved.data.quote.budget.total,0);
 assert.equal(w.sessionStorage.getItem('ff-care-request-'+subId),null);
});
test('acompanhamento mostra o pedido e abre Care pelo token do pedido de origem',async()=>{
 const w=await open('acompanhar','tracking','http://localhost/acompanhar/?id='+quoteId+'#t='+quoteToken);await until(()=>w.document.getElementById('refresh-order'));
 assert.match(w.document.getElementById('tracking-content').textContent,/Aceito/);const portal=w.document.querySelector('a[href*="/assinatura/?id="]');assert.ok(portal);const url=new URL(portal.href);
 assert.equal(url.searchParams.get('id'),subId);assert.equal((await request('/api/subscriptions/'+subId,null,null,quoteToken)).r.status,200);
});

async function createCare(extra={}){
 const login=await request('/api/admin/session',{key}),cookie=login.r.headers.get('Set-Cookie').split(';')[0];
 const result=await request('/api/admin/subscriptions',{name:'Teste do botão',phone:'11900000'+String(ip).padStart(3,'0'),model:'Veículo de teste',planId:'careEssential',paidConfirmed:true,startsOn:todaySP(),...extra},cookie);
 assert.equal(result.r.status,201);return {...result.data,cookie};
}
const careUrl=c=>'http://localhost/assinatura/?id='+c.subscription.id+'#t='+c.portalToken;
const closeWindow=w=>{w.dispatchEvent(new w.Event('pagehide'));w.close();};
test('botão disponível mostra orientação de autorização e não espera a conexão ao vivo',async()=>{
 const care=await createCare();const w=await open('assinatura','membership',careUrl(care),w=>{w.WebSocket=class{close(){}};const original=w.setTimeout.bind(w);w.setTimeout=(callback,delay,...args)=>original(callback,delay===8000?10:delay,...args);});
 await until(()=>w.document.getElementById('visit-request'));
 await until(()=>w.document.getElementById('live-state').textContent.includes('periódica'));
 const button=w.document.getElementById('request-visit-button');assert.equal(button.disabled,false);assert.equal(button.getAttribute('aria-busy'),'false');
 assert.match(w.document.getElementById('visit-status').textContent,/Marque a autorização/);
 submit(w,'visit-request');assert.match(w.document.getElementById('visit-error').textContent,/Marque a autorização/);assert.equal(w.document.activeElement.name,'ack');
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM quotes WHERE subscription_id=?').bind(care.subscription.id).first()).n,0);closeWindow(w);
});
test('Care pausado explica o bloqueio perto do botão',async()=>{
 const care=await createCare();await request('/api/admin/subscriptions/'+care.subscription.id,{version:1,status:'paused'},care.cookie,null,'PATCH');
 const w=await open('assinatura','membership',careUrl(care));await until(()=>w.document.getElementById('visit-request'));
 const button=w.document.getElementById('request-visit-button');assert.equal(button.disabled,true);assert.equal(button.textContent,'Visita indisponível');assert.equal(button.getAttribute('aria-busy'),'false');
 assert.match(w.document.getElementById('visit-status').textContent,/pausado/);assert.equal(w.document.getElementById('visit-support').hidden,false);closeWindow(w);
});
test('ciclo futuro informa a data em vez de parecer um envio travado',async()=>{
 const future=new Date(new Date(todaySP()+'T12:00:00Z').getTime()+86400000).toISOString().slice(0,10),care=await createCare({startsOn:future});
 const w=await open('assinatura','membership',careUrl(care));await until(()=>w.document.getElementById('visit-request'));
 assert.equal(w.document.getElementById('request-visit-button').disabled,true);assert.match(w.document.getElementById('visit-status').textContent,/ciclo começa/);assert.equal(w.document.querySelector('[name="date"]').min,future);closeWindow(w);
});
test('saldo atualizado escolhe a lavagem disponível e preserva observações',async()=>{
 const care=await createCare(),w=await open('assinatura','membership',careUrl(care));await until(()=>w.document.getElementById('visit-request'));
 input(w,'notes','Não apagar esta observação.');
 const result=await request('/api/admin/subscriptions/'+care.subscription.id+'/visits',{kind:'premium',status:'completed',date:todaySP(),operationId:crypto.randomUUID()},care.cookie);assert.equal(result.r.status,201);
 w.document.getElementById('refresh-care').click();await until(()=>w.document.querySelector('[name="creditKind"]').value==='essential');
 assert.equal(w.document.querySelector('[name="notes"]').value,'Não apagar esta observação.');assert.equal(w.document.getElementById('request-visit-button').disabled,false);
 const premium=w.document.querySelector('option[value="premium"]');assert.equal(premium.disabled,true);closeWindow(w);
});
test('nenhum saldo mostra o motivo e não indica carregamento',async()=>{
 const care=await createCare();for(const kind of ['premium','essential'])await request('/api/admin/subscriptions/'+care.subscription.id+'/visits',{kind,status:'completed',date:todaySP(),operationId:crypto.randomUUID()},care.cookie);
 const w=await open('assinatura','membership',careUrl(care));await until(()=>w.document.getElementById('visit-request'));
 assert.equal(w.document.getElementById('request-visit-button').disabled,true);assert.match(w.document.getElementById('visit-status').textContent,/utilizadas ou reservadas/);assert.equal(w.document.getElementById('request-visit-button').getAttribute('aria-busy'),'false');closeWindow(w);
});
test('falha de envio libera o botão e permite repetir sem perder o preenchimento',async()=>{
 const care=await createCare(),w=await open('assinatura','membership',careUrl(care));await until(()=>w.document.getElementById('visit-request'));
 const original=w.fetch;let release;w.fetch=(path,options)=>String(path).endsWith('/requests')?new Promise((_,reject)=>{release=()=>reject(Error('Falha de conexão de teste'));}):original(path,options);
 input(w,'notes','Observação antes do envio');w.document.querySelector('[name="ack"]').checked=true;submit(w,'visit-request');await until(()=>release);
 const button=w.document.getElementById('request-visit-button');assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');assert.match(button.textContent,/Enviando/);
 release();await until(()=>button.getAttribute('aria-busy')==='false');assert.equal(button.disabled,false);assert.match(w.document.getElementById('visit-error').textContent,/Falha de conexão/);assert.equal(w.document.querySelector('[name="notes"]').value,'Observação antes do envio');
 w.fetch=original;submit(w,'visit-request');await until(()=>w.document.querySelector('#visit-receipt a'));assert.equal(w.document.getElementById('visit-request').hidden,true);
 w.document.getElementById('another-visit').click();assert.equal(w.document.getElementById('visit-request').hidden,false);assert.equal(w.document.querySelector('[name="ack"]').checked,false);closeWindow(w);
});

async function adminWindow(){
 const w=await open('painel','admin');await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('[data-tab="quotes"]'));return w;
}
async function newSingleQuote(phone){
 const body={plate:fixturePlate(),vehicle:'car',mode:'single',service:'essential',model:'Veículo para excluir',name:'Cliente exclusão DOM',phone,flexibleDate:true,date:'',time:'',treatments:[],extras:[],ack:true,submissionToken:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')};
 const result=await request('/api/quotes',body);assert.equal(result.r.status,201);return result.data.quote;
}
test('pedido tem botão na lista e no registro; cancelar mantém dados e confirmar remove a linha',async()=>{
 const q=await newSingleQuote('11900000801'),w=await adminWindow();w.document.querySelector('[data-tab="quotes"]').click();await until(()=>w.document.querySelector('[data-delete-quote="'+q.id+'"]'));
 let confirmations=[];w.confirm=message=>{confirmations.push(message);return false;};
 const button=w.document.querySelector('[data-delete-quote="'+q.id+'"]');button.click();await until(()=>confirmations.length===1);await until(()=>!button.disabled);
 assert.match(confirmations[0],new RegExp(q.reference));assert.equal((await db.prepare('SELECT COUNT(*) n FROM quotes WHERE id=?').bind(q.id).first()).n,1);
 w.document.querySelector('[data-quote="'+q.id+'"]').click();await until(()=>w.document.getElementById('quote-edit'));
 assert.ok(w.document.querySelector('#admin-detail [data-delete-quote="'+q.id+'"]'));
 w.confirm=()=>true;w.document.querySelector('#admin-detail [data-delete-quote="'+q.id+'"]').click();
 await until(()=>w.document.getElementById('admin-toast').textContent==='Pedido excluído.');assert.equal(w.document.getElementById('admin-dialog').open,false);
 assert.equal(w.document.querySelector('[data-quote="'+q.id+'"]'),null);assert.equal((await db.prepare('SELECT COUNT(*) n FROM quotes WHERE id=?').bind(q.id).first()).n,0);closeWindow(w);
});
test('excluir cliente mostra quantidade de registros, permite cancelar e apaga só o cliente confirmado',async()=>{
 const care=await createCare();const w=await adminWindow();w.document.querySelector('[data-tab="customers"]').click();
 const selector='[data-delete-customer="'+care.subscription.customerId+'"]';await until(()=>w.document.querySelector(selector));w.document.querySelector(selector).click();await until(()=>w.document.querySelector('[data-action="delete-customer"]'));
 assert.match(w.document.getElementById('admin-detail').textContent,/1 assinatura\(s\)/);assert.match(w.document.getElementById('admin-detail').textContent,/1 ciclo\(s\)/);
 w.document.querySelector('#admin-detail [data-close-dialog]').click();assert.equal(w.document.getElementById('admin-dialog').open,false);
 assert.equal((await request('/api/subscriptions/'+care.subscription.id,null,null,care.portalToken)).r.status,200);
 w.document.querySelector(selector).click();await until(()=>w.document.querySelector('[data-action="delete-customer"]')&&w.document.getElementById('admin-dialog').open);
 w.document.querySelector('[data-action="delete-customer"]').click();await until(()=>w.document.getElementById('admin-toast').textContent==='Cliente e registros vinculados excluídos.');
 assert.equal(w.document.querySelector(selector),null);assert.equal((await request('/api/subscriptions/'+care.subscription.id,null,null,care.portalToken)).r.status,404);closeWindow(w);
});
test('confirmação de exclusão do cliente é renovada se uma lavagem chegar enquanto está aberta',async()=>{
 const care=await createCare(),w=await adminWindow();w.document.querySelector('[data-tab="customers"]').click();const selector='[data-delete-customer="'+care.subscription.customerId+'"]';await until(()=>w.document.querySelector(selector));w.document.querySelector(selector).click();await until(()=>w.document.querySelector('[data-action="delete-customer"]'));
 assert.match(w.document.getElementById('admin-detail').textContent,/0 registro\(s\)/);
 await request('/api/admin/subscriptions/'+care.subscription.id+'/visits',{kind:'premium',date:todaySP(),status:'completed'},care.cookie);
 w.document.querySelector('[data-action="delete-customer"]').click();await until(()=>w.document.getElementById('dialog-error')?.textContent.includes('mudaram'));
 assert.match(w.document.getElementById('admin-detail').textContent,/1 registro\(s\)/);assert.equal((await request('/api/subscriptions/'+care.subscription.id,null,null,care.portalToken)).r.status,200);
 w.document.querySelector('[data-action="delete-customer"]').click();await until(()=>w.document.getElementById('admin-toast').textContent==='Cliente e registros vinculados excluídos.');assert.equal(w.document.querySelector(selector),null);closeWindow(w);
});
test('painel exige confirmação recente e retoma a ativação uma única vez',async()=>{
 const w=await open('painel','admin');await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('[data-action="new-sub"]'));
 const oldCookie=w.__testCookie(),id=await digest(oldCookie.split('=')[1]);await db.prepare('UPDATE admin_sessions SET authenticated_at=? WHERE id=?').bind(Math.floor(Date.now()/1000)-REAUTH_SECONDS-1,id).run();
 w.document.querySelector('[data-action="new-sub"]').click();input(w,'name','Confirmacao recente DOM');input(w,'phone','11900000981');input(w,'model','Toyota confirmacao');input(w,'plate',fixturePlate());w.document.querySelector('#manual-sub [name="paidConfirmed"]').checked=true;w.document.querySelector('#manual-sub [name="confirmVehicle"]').checked=true;submit(w,'manual-sub');
 await until(()=>w.document.getElementById('admin-auth-dialog')?.open);assert.equal((await db.prepare('SELECT COUNT(*) n FROM customers WHERE phone=?').bind('5511900000981').first()).n,0);
 const form=w.document.getElementById('reauth-form');form.elements.key.value=key;submit(w,'reauth-form');
 await until(()=>w.document.getElementById('admin-detail').textContent.includes('Toyota confirmacao'));assert.notEqual(w.__testCookie(),oldCookie);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM subscriptions s JOIN customers c ON c.id=s.customer_id WHERE c.phone=?').bind('5511900000981').first()).n,1);
 assert.equal((await request('/api/admin/dashboard',null,oldCookie)).r.status,401);
});
test('conteúdo enviado pelo cliente é texto no painel e expiração limpa registros abertos',async()=>{
 const name='<img src=x onerror=alert(1)>',payload={plate:fixturePlate(),vehicle:'car',mode:'single',service:'premium',name,phone:'11900000982',model:'Veiculo <script>malicioso</script>',ack:true,submissionToken:Buffer.alloc(32,82).toString('base64url'),treatments:[],extras:[]};
 const q=(await request('/api/quotes',payload)).data.quote;
 const w=await open('painel','admin');await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('[data-tab="quotes"]'));
 w.document.querySelector('[data-tab="quotes"]').click();await until(()=>w.document.querySelector('[data-quote="'+q.id+'"]'));w.document.querySelector('[data-quote="'+q.id+'"]').click();await until(()=>w.document.getElementById('admin-detail').textContent.includes(name));
 assert.equal(w.document.querySelector('#admin-detail img'),null);assert.equal(w.document.querySelector('#admin-detail script'),null);
 const id=await digest(w.__testCookie().split('=')[1]);await db.prepare('DELETE FROM admin_sessions WHERE id=?').bind(id).run();
 w.document.querySelector('[data-action="reload-quote"]').click();await until(()=>w.document.getElementById('access-form'));assert.equal(w.document.getElementById('admin-dialog').open,false);assert.equal(w.document.getElementById('admin-detail').textContent,'');assert.equal(w.document.body.textContent.includes(name),false);
});

async function notificationMock(w,{permission='default',grant='granted',failRegistration=false,enabled=false,label='Meu aparelho'}={}){
 const {generateVapid}=await import('../scripts/notifications-setup.mjs');
 const keys=await generateVapid('https://fine-form.test');const endpoint='https://fcm.googleapis.com/fcm/send/local-ui-test';
 const id=await digest(endpoint),state={configured:true,publicKey:keys.publicKey,maximum:5,devices:enabled?[{id,label,createdAt:new Date().toISOString(),lastSentAt:null,lastError:null}]:[]};
 const calls={permission:0,register:0,subscribe:0,unsubscribe:0,enroll:0,test:0,revoke:0},listeners=new Map();let subscription=null,registered=enabled;
 w.TextEncoder=globalThis.TextEncoder;w.TextDecoder=globalThis.TextDecoder;Object.defineProperty(w,'crypto',{value:globalThis.crypto});Object.defineProperty(w,'isSecureContext',{value:true});
 w.PushManager=class{};w.Notification=class{};w.Notification.permission=permission;w.Notification.requestPermission=()=>{calls.permission++;w.Notification.permission=grant;return Promise.resolve(grant);};
 function makeSubscription(applicationServerKey){return {endpoint,options:{applicationServerKey},toJSON:()=>({endpoint,expirationTime:null,keys:{p256dh:'ui-test-only',auth:'ui-test-only'}}),unsubscribe:async()=>{calls.unsubscribe++;subscription=null;return true;}};}
 if(enabled)subscription=makeSubscription(Buffer.from(keys.publicKey,'base64url'));
 const registration={active:{},pushManager:{getSubscription:async()=>subscription,subscribe:async options=>{calls.subscribe++;subscription=makeSubscription(options.applicationServerKey);return subscription;}}};
 const serviceWorker={getRegistration:async()=>registered?registration:undefined,register:async(path,options)=>{assert.equal(path,'/painel/sw.js');assert.equal(options.scope,'/painel/');calls.register++;registered=true;return registration;},addEventListener:(name,handler)=>listeners.set(name,handler)};
 Object.defineProperty(w.navigator,'serviceWorker',{value:serviceWorker});const original=w.fetch;
 w.fetch=async(path,options={})=>{
  if(!String(path).startsWith('/api/admin/notifications'))return original(path,options);
  const body=options.body?JSON.parse(options.body):{};let data=state,status=200;
  if(String(path).endsWith('/subscription')&&options.method==='POST'){calls.enroll++;if(failRegistration){data={error:'Cadastro de teste recusado.'};status=403;}else{state.devices=[{id,label:body.label,createdAt:new Date().toISOString(),lastSentAt:null,lastError:null}];data={id,enabled:true};status=201;}}
  if(String(path).endsWith('/test')){calls.test++;data={sent:true};}
  if(String(path).endsWith('/subscription')&&options.method==='DELETE'){calls.revoke++;state.devices=state.devices.filter(device=>device.id!==body.id);data={ok:true};}
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 };
 return {calls,state,listeners,id};
}
async function notificationWindow(options={}){
 let mock;const w=await open('painel','admin','http://localhost/painel/',w=>{w.__notificationSetup=notificationMock(w,options);});await w.__notificationSetup;mock=await w.__notificationSetup;
 await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('[data-tab="notifications"]'));
 w.document.querySelector('[data-tab="notifications"]').click();await until(()=>w.document.getElementById('push-state'));return {w,mock};
}
test('notificações só pedem permissão no clique e permitem ativar, testar e desativar',async()=>{
 const {w,mock}=await notificationWindow();assert.equal(mock.calls.permission,0);assert.equal(mock.calls.enroll,0);
 w.document.getElementById('push-enable').click();await until(()=>w.document.getElementById('push-test'));assert.equal(mock.calls.permission,1);assert.equal(mock.calls.register,1);assert.equal(mock.calls.enroll,1);
 w.document.getElementById('push-test').click();await until(()=>mock.calls.test===1);await until(()=>!w.document.getElementById('push-test').disabled);
 w.document.getElementById('push-disable').click();await until(()=>w.document.getElementById('push-enable'));assert.equal(mock.calls.revoke,1);assert.equal(mock.calls.unsubscribe,1);closeWindow(w);
});
test('permissão recusada não registra aparelho nem assina push',async()=>{
 const {w,mock}=await notificationWindow({grant:'denied'});w.document.getElementById('push-enable').click();await until(()=>!w.document.getElementById('push-error').hidden);
 assert.match(w.document.getElementById('push-error').textContent,/permissão/);assert.equal(mock.calls.register,0);assert.equal(mock.calls.subscribe,0);assert.equal(mock.calls.enroll,0);closeWindow(w);
});
test('falha no cadastro desfaz assinatura recém-criada e permite nova tentativa',async()=>{
 const {w,mock}=await notificationWindow({failRegistration:true});w.document.getElementById('push-enable').click();await until(()=>!w.document.getElementById('push-error').hidden);
 assert.equal(mock.calls.unsubscribe,1);assert.equal(w.document.getElementById('push-enable').disabled,false);assert.match(w.document.getElementById('push-error').textContent,/recusado/);closeWindow(w);
});
test('nomes dos aparelhos são texto e aparelhos revogados não se reativam sozinhos',async()=>{
 const {w,mock}=await notificationWindow({permission:'granted',enabled:true,label:'<img src=x onerror=alert(1)>'});assert.equal(w.document.querySelector('.admin-push-device img'),null);
 assert.match(w.document.querySelector('.admin-push-device').textContent,/<img src=x/);mock.state.devices=[];w.document.querySelector('[data-action="refresh"]').click();await until(()=>w.document.getElementById('push-enable'));
 assert.equal(mock.calls.enroll,0);assert.equal(mock.calls.subscribe,0);closeWindow(w);
});
test('link de notificação aguarda login e abre o pedido pelo acesso administrativo',async()=>{
 const quote=await newSingleQuote('11900000986');let reads=0;
 const w=await open('painel','admin','http://localhost/painel/?pedido='+quote.id,w=>{const original=w.fetch;w.fetch=(path,options)=>{if(String(path)==='/api/admin/quotes/'+quote.id)reads++;return original(path,options);};});
 await until(()=>w.document.getElementById('access-form'));assert.equal(reads,0);input(w,'key',key);submit(w,'access-form');await until(()=>w.document.getElementById('quote-edit'));
 assert.match(w.document.getElementById('admin-detail').textContent,new RegExp(quote.reference));assert.equal(reads,1);assert.equal(new URL(w.location.href).searchParams.has('pedido'),false);closeWindow(w);
});
test('toque em notificação preserva edição aberta e só aceita mensagem do service worker do painel',async()=>{
 const first=await newSingleQuote('11900000987'),next=await newSingleQuote('11900000988');let listeners;
 const w=await open('painel','admin','http://localhost/painel/',w=>{listeners=new Map();Object.defineProperty(w.navigator,'serviceWorker',{value:{addEventListener:(name,handler)=>listeners.set(name,handler)}});});
 await until(()=>w.document.getElementById('access-form'));input(w,'key',key);submit(w,'access-form');await until(()=>w.document.querySelector('[data-quote="'+first.id+'"]'));w.document.querySelector('[data-quote="'+first.id+'"]').click();await until(()=>w.document.getElementById('quote-edit'));input(w,'internalNote','Manter esta edição.').focus();
 listeners.get('message')({data:{type:'ff-open-order',quoteId:next.id},source:{scriptURL:'https://evil.test/painel/sw.js'}});assert.equal(new URL(w.location.href).searchParams.has('pedido'),false);
 listeners.get('message')({data:{type:'ff-open-order',quoteId:next.id},source:{scriptURL:'http://localhost/painel/sw.js'}});assert.equal(w.document.querySelector('[name="internalNote"]').value,'Manter esta edição.');assert.match(w.document.getElementById('admin-detail').textContent,new RegExp(first.reference));
 w.document.getElementById('admin-dialog').close();await until(()=>w.document.getElementById('admin-detail').textContent.includes(next.reference));closeWindow(w);
});


test('orçamento online não tem campo de placa e descarta a placa de rascunhos anteriores',async()=>{
 const w=await open('atendimento','booking','http://localhost/atendimento/',w=>w.localStorage.setItem('ff-care-draft-v1',JSON.stringify({vehicle:'car',model:'Civic',plate:'FAL1A23',plateVerified:true,mode:'single',service:'essential'})));
 assert.equal(w.document.querySelector('[name="plate"]'),null);assert.match(w.document.getElementById('wizard-content').textContent,/cadastrada por Mateus/);submit(w,'care-form');assert.match(w.document.getElementById('step-count').textContent,/02/);assert.equal(w.document.querySelector('[name="plate"]'),null);closeWindow(w);
});
test('painel recebe o veículo e atualiza a placa no mesmo link do cliente',async()=>{
 const cap=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),body={vehicle:'car',mode:'single',service:'essential',model:'Civic presencial',name:'Recebimento DOM',phone:'11900001610',ack:true,flexibleDate:true,treatments:[],extras:[],submissionToken:cap};const q=(await request('/api/quotes',body)).data.quote;
 const client=await open('acompanhar','tracking','http://localhost/acompanhar/?id='+q.id+'#t='+cap);await until(()=>client.document.getElementById('refresh-order'));assert.match(client.document.getElementById('tracking-content').textContent,/Aguardando cadastro presencial/);
 const w=await adminWindow();w.document.querySelector('[data-tab="quotes"]').click();await until(()=>w.document.querySelector('[data-quote="'+q.id+'"]'));w.document.querySelector('[data-quote="'+q.id+'"]').click();await until(()=>w.document.getElementById('register-vehicle'));
 let form=w.document.getElementById('register-vehicle');form.elements.plate.value='DOM2B34';submit(w,'register-vehicle');await until(()=>!w.document.getElementById('dialog-error').hidden);assert.match(w.document.getElementById('dialog-error').textContent,/pessoalmente/);
 form.elements.confirm.checked=true;submit(w,'register-vehicle');await until(()=>w.document.getElementById('admin-detail').textContent.includes('Veículo cadastrado neste pedido.'));
 client.document.getElementById('refresh-order').click();await until(()=>client.document.getElementById('tracking-content').textContent.includes('DOM2B34'));assert.equal(new URL(client.location).searchParams.get('id'),q.id);assert.equal(new URLSearchParams(client.location.hash.slice(1)).get('t'),cap);closeWindow(w);closeWindow(client);
});
test('portal mantém saldo e bloqueia novos usos quando a placa anterior ainda não foi conferida',async()=>{
 const c=await createCare();await db.prepare('UPDATE subscriptions SET plate_verified_at=NULL,plate_verified_by=NULL WHERE id=?').bind(c.subscription.id).run();const w=await open('assinatura','membership',careUrl(c));await until(()=>w.document.getElementById('visit-request'));assert.equal(w.document.querySelector('[name="plate"]'),null);assert.match(w.document.querySelector('.plate-lock').textContent,/Aguardando cadastro presencial/);assert.match(w.document.getElementById('care-availability').textContent,/cadastro presencial/);assert.equal(w.document.getElementById('request-visit-button').disabled,true);assert.match(w.document.getElementById('care-overview').textContent,/1.*disponíveis/);closeWindow(w);
});
test('vitrificação de plásticos no Extra mostra complemento e substitui a revitalização na interface',async()=>{
 const w=await open('atendimento','booking','http://localhost/atendimento/?service=extra');input(w,'model','Civic');submit(w,'care-form');submit(w,'care-form');const coating=w.document.querySelector('[name="extra"][value="plasticCoating"]');assert.ok(coating);assert.match(coating.closest('label').textContent,/150/);coating.checked=true;coating.dispatchEvent(new w.Event('change',{bubbles:true}));const maintenance=w.document.querySelector('[name="extra"][value="exteriorPlastic"]');assert.equal(maintenance.disabled,true);assert.equal(maintenance.checked,false);assert.match(maintenance.closest('label').textContent,/SUBSTITUÍDO/);assert.match(w.document.querySelector('.quote-total').textContent,/1.740/);closeWindow(w);
});

test('orçamento conserva a tentativa durante falha, limpa dados ao confirmar e não concede aceite ao cliente',async()=>{
 const payloads=[];
 const w=await open('atendimento','booking','http://localhost/atendimento/',w=>{
  const original=w.fetch;
  w.fetch=async(path,options={})=>{
   if(path==='/api/quotes'&&options.method==='POST'){
    const body=JSON.parse(options.body);payloads.push(body);
    if(payloads.length===1)throw Error('Falha temporária de teste.');
    options={...options,body:JSON.stringify({...body,requestStage:'open'})};
   }
   return original(path,options);
  };
 });
 input(w,'model','Civic orçamento futuro');submit(w,'care-form');submit(w,'care-form');submit(w,'care-form');submit(w,'care-form');
 input(w,'name','Contato em preparação');input(w,'phone','11900001771');
 const ack=w.document.querySelector('[name="ack"]');ack.checked=true;ack.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.match(w.document.querySelector('.request-disclosure').textContent,/sem|Não há/);
 assert.equal(w.document.querySelector('[name="plate"]'),null);
 submit(w,'care-form');await until(()=>w.document.getElementById('form-error').textContent.includes('Falha temporária'));
 assert.ok(w.sessionStorage.getItem('ff-pending-submission'));
 submit(w,'care-form');await until(()=>!w.document.getElementById('summary-result').hidden);
 assert.equal(payloads[0].submissionToken,payloads[1].submissionToken);
 assert.equal(w.sessionStorage.getItem('ff-pending-submission'),null);
 assert.equal(w.localStorage.getItem('ff-orders-v2'),null);
 const link=new URL(w.document.querySelector('.tracking-link').href),id=link.searchParams.get('id'),token=new URLSearchParams(link.hash.slice(1)).get('t');
 const saved=(await request('/api/quotes/'+id,null,null,token)).data.quote;
 assert.equal(saved.status,'pending');assert.equal(saved.selection.requestStage,'appointment');
 assert.equal(saved.selection.plate,undefined);
 assert.equal((await request('/api/admin/quotes/'+id,{version:saved.version,status:'accepted'},null,token,'PATCH')).r.status,401);
 const tracking=await open('acompanhar','tracking',link.href);await until(()=>tracking.document.querySelector('[data-request-approval]'));
 assert.match(tracking.document.querySelector('[data-request-approval]').textContent,/aguarda a análise e a aceitação/);
 assert.doesNotMatch(tracking.document.body.textContent,/inauguração/i);
 // A retry of a request recorded before the phase metadata existed stays idempotent.
 await db.prepare("UPDATE quotes SET selection_json=json_remove(selection_json,'$.requestStage') WHERE id=?").bind(id).run();
 const retry=await request('/api/quotes',payloads[1]);assert.equal(retry.r.status,200);assert.equal(retry.data.quote.id,id);assert.equal(retry.data.duplicate,true);
 closeWindow(w);closeWindow(tracking);
});

test('painel cadastra local, libera para um pedido e prepara WhatsApp; retirada remove do cliente',async()=>{
 const cap=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
 const created=await request('/api/quotes',{vehicle:'car',mode:'single',service:'essential',name:'Cliente endereço',phone:'11900000990',model:'Veículo de teste',date:'',time:'',treatments:[],extras:[],ack:true,submissionToken:cap});
 const q=created.data.quote;
 const admin=await open('painel','admin');await until(()=>admin.document.getElementById('access-form'));input(admin,'key',key);submit(admin,'access-form');
 await until(()=>admin.document.querySelector('[data-tab="settings"]'));
 admin.document.querySelector('[data-tab="settings"]').click();await until(()=>admin.document.getElementById('business-profile-form'));
 input(admin,'visitAddress','Rua de teste <img src=x onerror=alert(1)>, 10');input(admin,'mapsUrl','https://maps.app.goo.gl/ExampleTest');input(admin,'arrivalNote','Aguarde no portão de teste.');
 const form=admin.document.getElementById('business-profile-form');submit(admin,'business-profile-form');
 await until(()=>admin.document.getElementById('business-profile-form')!==form);
 admin.document.querySelector('[data-tab="quotes"]').click();await until(()=>admin.document.querySelector('[data-quote="'+q.id+'"]'));
 admin.document.querySelector('[data-quote="'+q.id+'"]').click();await until(()=>admin.document.querySelector('[data-location-action="share"]'));
 const client=await open('acompanhar','tracking','http://localhost/acompanhar/?id='+q.id+'#t='+cap);
 await until(()=>client.document.querySelector('[data-customer-location]'));
 assert.doesNotMatch(client.document.querySelector('[data-customer-location]').textContent,/Rua de teste/);
 admin.document.querySelector('[data-location-action="share"]').click();await until(()=>admin.document.querySelector('[data-location-whatsapp]'));
 const link=new URL(admin.document.querySelector('[data-location-whatsapp]').href);assert.equal(link.hostname,'wa.me');assert.equal(link.pathname,'/5511900000990');assert.match(link.searchParams.get('text'),/Rua de teste/);assert.match(link.searchParams.get('text'),/precisam estar confirmados/);
 assert.equal(admin.document.querySelector('#quote-location img'),null);
 client.document.querySelector('#refresh-order').click();await until(()=>client.document.querySelector('[data-customer-location]').textContent.includes('Rua de teste'));
 assert.equal(client.document.querySelector('[data-customer-location] img'),null);
 assert.match(client.document.querySelector('[data-customer-location] a').rel,/noreferrer/);
 const saved=(await request('/api/quotes/'+q.id,null,null,cap)).data.quote;assert.equal(saved.status,'pending');assert.equal(saved.scheduledDate,null);
 admin.document.querySelector('[data-location-action="revoke"]').click();await until(()=>!admin.document.querySelector('[data-location-whatsapp]')&&admin.document.querySelector('[data-location-action="share"]'));
 client.document.querySelector('#refresh-order').click();await until(()=>!client.document.querySelector('[data-customer-location]').textContent.includes('Rua de teste'));
 assert.equal((await request('/api/business')).data.location,null);
 closeWindow(admin);closeWindow(client);
});

test('assistente retoma etapa autorizada, permite editar e anuncia progresso real',async()=>{
 const w=await open('atendimento','booking','http://localhost/atendimento/',w=>w.localStorage.setItem('ff-care-draft-v1',JSON.stringify({vehicle:'car',model:'Civic',service:'essential',draftStep:3,ack:true,expiresAt:Date.now()+86400000})));
 assert.match(w.document.getElementById('step-count').textContent,/04/);
 assert.equal(w.document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),'3');
 assert.match(w.document.getElementById('draft-status').textContent,/retomado na etapa 4/);
 w.document.querySelector('[data-go-step="0"]').click();
 assert.equal(w.document.querySelector('[name="model"]').value,'Civic');
 assert.equal(w.document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),'0');
 assert.equal(w.document.querySelector('[data-go-step="4"]').disabled,true);
 submit(w,'care-form');submit(w,'care-form');submit(w,'care-form');submit(w,'care-form');
 assert.equal(w.document.querySelector('[name="ack"]').checked,false);
 w.document.querySelector('[data-review-step="1"]').click();
 assert.equal(w.document.querySelector('[data-action="service"][data-value="essential"]').getAttribute('aria-pressed'),'true');
 assert.equal(JSON.parse(w.localStorage.getItem('ff-care-draft-v1')).draftStep,1);
 closeWindow(w);
});
test('rascunho incompleto não pula veículo e erro fica associado ao campo',async()=>{
 const w=await open('atendimento','booking','http://localhost/atendimento/',w=>w.localStorage.setItem('ff-care-draft-v1',JSON.stringify({draftStep:4,model:'',expiresAt:Date.now()+86400000})));
 assert.equal(w.document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),'0');
 submit(w,'care-form');const model=w.document.querySelector('[name="model"]');
 assert.equal(model.getAttribute('aria-invalid'),'true');assert.equal(model.getAttribute('aria-describedby'),'form-error');assert.equal(w.document.activeElement,model);
 input(w,'model','Civic');assert.equal(model.hasAttribute('aria-invalid'),false);submit(w,'care-form');
 assert.equal(w.document.querySelector('.booking-treatments').tagName,'DETAILS');
 assert.equal(w.document.querySelector('.booking-treatments').open,false);closeWindow(w);
});
