import {fixturePlate,vehicleFixture} from './helpers/plates.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Miniflare,Log,LogLevel,createFetchMock} from 'miniflare';
import {build} from 'esbuild';
import worker from '../worker/index.mjs';
import {applyMigrations} from './helpers/database.mjs';
import {generateVapid,notificationOrigin,notificationCron} from '../scripts/notifications-setup.mjs';
import {pushSettings,pushEndpoint,validatePushSubscription,dispatchPush,testPush} from '../worker/push.mjs';
import {totpCode,digest,REAUTH_SECONDS} from '../worker/security.mjs';

const origin='https://fine-form.test',key='test-only-notifications-admin-key-more-than-thirty-two-characters',secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const encode=bytes=>Buffer.from(bytes).toString('base64url'),decode=value=>Buffer.from(value,'base64url');
const originalFetch=globalThis.fetch;let currentFetcher;
before(()=>{globalThis.fetch=(...args)=>currentFetcher(...args);});
after(()=>{globalThis.fetch=originalFetch;});
async function browserSubscription(suffix='one'){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),auth=crypto.getRandomValues(new Uint8Array(16));
 return {privateKey:pair.privateKey,publicKey,auth,subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/test-'+suffix,expirationTime:null,keys:{p256dh:encode(publicKey),auth:encode(auth)}}};
}
async function fixture(t,{legacy=false}={}){
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-07-30',cf:false,d1Databases:{DB:'push-'+crypto.randomUUID()},log:new Log(LogLevel.ERROR)});
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');await applyMigrations(db,legacy?{files:['0001_initial.sql','0002_security.sql','0004_vehicle_plates.sql','0005_in_person_vehicle_registration.sql']}:{});
 const vapid=await generateVapid(origin),env={DB:db,ADMIN_KEY:key,ADMIN_TOTP_SECRET:secret,...(!legacy?{PUSH_VAPID:JSON.stringify(vapid)}:{})};
 let cookie='',csrf='',ip=1;const deliveries=[];let status=201;
 const fetcher=async(endpoint,options)=>{assert.ok(endpoint.startsWith('https://fcm.googleapis.com/'));assert.equal(options.redirect,'manual');deliveries.push({endpoint,options});return new Response(null,{status});};
 currentFetcher=fetcher;
 async function call(path,{method='GET',body,auth=true,headers={},ctx}={}){
  await vehicleFixture(db,path,body);
  const req=new Request(origin+path,{method,headers:{Origin:origin,'User-Agent':'fine-form-push-test','CF-Connecting-IP':'192.0.2.'+(ip++%250),...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,'X-FF-CSRF':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const response=await worker.fetch(req,env,ctx),data=await response.json();return {status:response.status,data,response,req};
 }
 const login=await call('/api/admin/session',{method:'POST',auth:false,body:{key,code:await totpCode(secret)}});assert.equal(login.status,200);cookie=login.response.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
 const selection=(overrides={})=>({plate:fixturePlate(),vehicle:'car',mode:'single',service:'premium',model:'Veículo privado',name:'Cliente que não deve aparecer no alerta',phone:'11900009932',date:'',time:'',flexibleDate:true,treatments:[],extras:[],ack:true,submissionToken:encode(crypto.getRandomValues(new Uint8Array(32))),...overrides});
 async function enroll(browser,label='Meu teste'){
  const result=await call('/api/admin/notifications/subscription',{method:'POST',body:{subscription:browser.subscription,label}});assert.equal(result.status,201);return result.data.id;
 }
 return {db,env,vapid,call,fetcher,deliveries,selection,enroll,setStatus:value=>status=value};
}
async function decryptDelivery(delivery,browser){
 let body=delivery.options.body;
 if(body?.getReader){const reader=body.getReader(),chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);size+=value.byteLength;}body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}}
 const bytes=new Uint8Array(body),salt=bytes.slice(0,16),keySize=bytes[20],sender=bytes.slice(21,21+keySize);
 assert.equal(keySize,65);assert.equal(new DataView(bytes.buffer,bytes.byteOffset).getUint32(16),4096);
 const senderKey=await crypto.subtle.importKey('raw',sender,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=await crypto.subtle.deriveBits({name:'ECDH',public:senderKey},browser.privateKey,256);
 const hkdf=async(material,salt,info,length)=>crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',material,'HKDF',false,['deriveBits']),length*8);
 const info=Buffer.concat([Buffer.from('WebPush: info\0'),browser.publicKey,sender]);
 const ikm=await hkdf(shared,browser.auth,info,32),contentKey=await hkdf(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const aes=await crypto.subtle.importKey('raw',contentKey,'AES-GCM',false,['decrypt']);
 const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},aes,bytes.slice(21+keySize)));
 let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);
 return JSON.parse(new TextDecoder().decode(plain.slice(0,end)));
}

test('configuração usa uma chave VAPID própria e preserva bindings e cron existentes',async()=>{
 const vapid=await generateVapid(origin);assert.equal(pushSettings({PUSH_VAPID:JSON.stringify(vapid)}).origin,origin);
 assert.equal(pushSettings({PUSH_VAPID:'invalid'}),null);assert.equal(pushSettings({PUSH_VAPID:JSON.stringify({...vapid,privateKey:'invalid'})}),null);
 const cfg={name:'fine-form',d1_databases:[{binding:'DB',database_id:'existing'}],durable_objects:{bindings:[{name:'LIVE'}]},triggers:{crons:['0 5 * * *']}};
 const updated=notificationCron(cfg);assert.deepEqual(updated.d1_databases,cfg.d1_databases);assert.deepEqual(updated.durable_objects,cfg.durable_objects);assert.deepEqual(updated.triggers.crons,['0 5 * * *','* * * * *']);assert.deepEqual(notificationCron(updated),updated);assert.deepEqual(cfg.triggers.crons,['0 5 * * *']);
 assert.throws(()=>notificationOrigin('https://fine-form.test/painel'));assert.throws(()=>notificationOrigin('http://fine-form.test'));assert.throws(()=>notificationOrigin('https://user:pass@fine-form.test'));
});
test('endereços push recusam SSRF, credenciais, portas e domínios que imitam provedores',async()=>{
 for(const endpoint of ['http://fcm.googleapis.com/fcm/send/x','https://127.0.0.1/x','https://[::1]/x','https://169.254.169.254/x','https://fcm.googleapis.com.evil.test/x','https://evil.test/?url=fcm.googleapis.com','https://fcm.googleapis.com@evil.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x','https://fcm.googleapis.com/x#fragment'])assert.throws(()=>pushEndpoint(endpoint),error=>error.status===400);
 for(const endpoint of ['https://fcm.googleapis.com/fcm/send/x','https://updates.push.services.mozilla.com/wpush/v2/x','https://web.push.apple.com/x','https://wns2.notify.windows.com/x'])assert.equal(pushEndpoint(endpoint),endpoint);
 const browser=await browserSubscription();await validatePushSubscription({subscription:browser.subscription,label:'Meu Android'});
 for(const keys of [{auth:'invalid',p256dh:browser.subscription.keys.p256dh},{auth:browser.subscription.keys.auth,p256dh:encode(new Uint8Array(65))}])await assert.rejects(()=>validatePushSubscription({subscription:{...browser.subscription,keys},label:'Meu teste'}),error=>error.status===400);
});
test('somente administrador com sessão, CSRF, mesma origem e autenticação recente autoriza aparelho',async t=>{
 const f=await fixture(t),browser=await browserSubscription(),body={subscription:browser.subscription,label:'Meu Android'};
 for(const [path,method,payload] of [['/api/admin/notifications','GET'],['/api/admin/notifications/subscription','POST',body],['/api/admin/notifications/test','POST',{id:'x'}],['/api/admin/notifications/subscription','DELETE',{id:'x'}]])assert.equal((await f.call(path,{method,body:payload,auth:false,headers:{Authorization:'Bearer '+encode(new Uint8Array(32))}})).status,401);
 assert.equal((await f.call('/api/admin/notifications/subscription',{method:'POST',body,headers:{'X-FF-CSRF':'invalid'}})).status,403);
 assert.equal((await f.call('/api/admin/notifications/subscription',{method:'POST',body,headers:{Origin:'https://evil.test'}})).status,403);
 await f.db.prepare('UPDATE admin_sessions SET authenticated_at=?').bind(Math.floor(Date.now()/1000)-REAUTH_SECONDS-1).run();
 assert.equal((await f.call('/api/admin/notifications/subscription',{method:'POST',body})).status,428);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM admin_push_subscriptions').first()).n,0);
});
test('cadastro é idempotente, tem limite de aparelhos e não revela endpoints nem chaves privadas',async t=>{
 const f=await fixture(t),browser=await browserSubscription();const id=await f.enroll(browser,'<img src=x onerror=alert(1)>');assert.equal(await f.enroll(browser),id);
 const state=(await f.call('/api/admin/notifications')).data;assert.equal(state.configured,true);assert.equal(state.devices.length,1);assert.equal(state.publicKey,f.vapid.publicKey);
 const serialized=JSON.stringify(state);for(const secretValue of [browser.subscription.endpoint,browser.subscription.keys.p256dh,browser.subscription.keys.auth,f.vapid.privateKey])assert.ok(!serialized.includes(secretValue));
 for(let i=1;i<state.maximum;i++)await f.enroll(await browserSubscription('limit-'+i));
 const excess=await browserSubscription('too-many');assert.equal((await f.call('/api/admin/notifications/subscription',{method:'POST',body:{subscription:excess.subscription,label:'Excesso'}})).status,409);
 assert.equal((await f.call('/api/admin/notifications')).data.devices.length,state.maximum);
});
test('pedido cria fila na transação; reenvio e processamento concorrente produzem um só aviso',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);const body=f.selection();
 const responses=await Promise.all([f.call('/api/quotes',{method:'POST',body,auth:false}),f.call('/api/quotes',{method:'POST',body,auth:false})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM admin_push_jobs').first()).n,1);
 await Promise.all([dispatchPush(f.env,{fetcher:f.fetcher}),dispatchPush(f.env,{fetcher:f.fetcher})]);assert.equal(f.deliveries.length,1);
 assert.equal((await f.db.prepare('SELECT state FROM admin_push_jobs').first()).state,'sent');
 await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);
});
test('Web Push é criptografado com aes128gcm, tem VAPID válido e exclui dados pessoais e valores',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);
 const quote=await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});assert.equal(quote.status,201);
 await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);const delivery=f.deliveries[0],headers=delivery.options.headers;
 assert.equal(headers['content-encoding'],'aes128gcm');assert.equal(headers.urgency,'high');assert.ok(Number(headers.ttl)>0);
 assert.deepEqual(await decryptDelivery(delivery,browser),{type:'order.created',quoteId:quote.data.quote.id});
 const authorization=headers.authorization.match(/^vapid t=([^,]+), k=(.+)$/);assert.ok(authorization);assert.equal(authorization[2],f.vapid.publicKey);
 const [head,payload,signature]=authorization[1].split('.'),jwt=JSON.parse(decode(payload));assert.equal(jwt.aud,'https://fcm.googleapis.com');assert.equal(jwt.sub,origin+'/');assert.ok(jwt.exp-jwt.iat<=86400);
 const publicKey=await crypto.subtle.importKey('raw',decode(f.vapid.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,decode(signature),Buffer.from(head+'.'+payload)),true);
 assert.ok(!Buffer.from(delivery.options.body).includes(Buffer.from('Cliente que não deve aparecer')));
});
test('VAPID mantém o mesmo token por provedor e não vaza em exportação do painel',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);
 for(let i=0;i<2;i++){assert.equal((await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()})).status,201);await dispatchPush(f.env,{fetcher:f.fetcher});}
 assert.equal(f.deliveries.length,2);assert.equal(f.deliveries[0].options.headers.authorization,f.deliveries[1].options.headers.authorization);
 const exported=(await f.call('/api/admin/export')).data;assert.equal(exported.admin_push_subscriptions,undefined);assert.equal(exported.admin_push_vapid_tokens,undefined);
 assert.ok(!JSON.stringify(exported).includes(browser.subscription.endpoint));
});
test('falha temporária permanece na fila e nova tentativa consegue entregar',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});
 f.setStatus(503);await dispatchPush(f.env,{fetcher:f.fetcher});let job=await f.db.prepare('SELECT * FROM admin_push_jobs').first();assert.equal(job.state,'pending');assert.equal(job.attempts,1);assert.ok(job.next_attempt_at>Math.floor(Date.now()/1000));
 await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);
 await f.db.prepare('UPDATE admin_push_jobs SET next_attempt_at=0').run();f.setStatus(201);await dispatchPush(f.env,{fetcher:f.fetcher});job=await f.db.prepare('SELECT * FROM admin_push_jobs').first();assert.equal(job.state,'sent');assert.equal(job.attempts,2);
});
test('redirecionamento do provedor é recusado sem reenviar credenciais ou seguir outro destino',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});f.setStatus(302);
 await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);assert.equal(f.deliveries[0].options.redirect,'manual');
 const job=await f.db.prepare('SELECT * FROM admin_push_jobs').first();assert.equal(job.state,'failed');assert.equal(job.last_error,'http-302');
 await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);
});
test('tentativas são limitadas e endpoints expirados são removidos automaticamente',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});f.setStatus(503);
 for(let i=0;i<5;i++){await f.db.prepare('UPDATE admin_push_jobs SET next_attempt_at=0').run();await dispatchPush(f.env,{fetcher:f.fetcher});}
 assert.equal((await f.db.prepare('SELECT state FROM admin_push_jobs').first()).state,'failed');assert.equal(f.deliveries.length,5);
 await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});f.setStatus(410);await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal((await f.call('/api/admin/notifications')).data.devices.length,0);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM admin_push_jobs').first()).n,0);
});
test('revogação, troca de credenciais e pedidos já respondidos interrompem os avisos pendentes',async t=>{
 const f=await fixture(t),browser=await browserSubscription();const id=await f.enroll(browser);await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});
 assert.equal((await f.call('/api/admin/notifications/subscription',{method:'DELETE',body:{id}})).status,200);await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,0);
 await f.enroll(browser);const quote=await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});await dispatchPush({...f.env,ADMIN_KEY:key+'-rotated'},{fetcher:f.fetcher});assert.equal(f.deliveries.length,0);
 assert.equal((await f.call('/api/admin/quotes/'+quote.data.quote.id,{method:'PATCH',body:{version:1,status:'declined',message:'Sem disponibilidade.'}})).status,200);await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,0);
});
test('saída do painel preserva aviso discreto; expiração de entrega e remoção do pedido encerram a fila',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);const quote=await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});
 assert.equal((await f.call('/api/admin/session',{method:'DELETE',body:{}})).status,200);await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);
 await f.db.prepare("UPDATE admin_push_jobs SET state='pending',expires_at=?").bind(Math.floor(Date.now()/1000)-1).run();await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);assert.equal((await f.db.prepare('SELECT state FROM admin_push_jobs').first()).state,'failed');
 await f.db.prepare('DELETE FROM quotes WHERE id=?').bind(quote.data.quote.id).run();assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM admin_push_jobs').first()).n,0);
});
test('teste de aparelho usa entrega criptografada e limita envio abusivo',async t=>{
 const f=await fixture(t),browser=await browserSubscription();const id=await f.enroll(browser),req=new Request(origin+'/api/admin/notifications/test',{method:'POST'});
 assert.deepEqual(await testPush(req,f.env,{id},{fetcher:f.fetcher}),{sent:true});assert.deepEqual(await decryptDelivery(f.deliveries[0],browser),{type:'notification.test'});
 for(let i=0;i<4;i++)await testPush(req,f.env,{id},{fetcher:f.fetcher});await assert.rejects(()=>testPush(req,f.env,{id},{fetcher:f.fetcher}),error=>error.status===429);
});
test('nova visita Care também avisa; falha na fila não deixa pedido parcialmente salvo',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);
 const care=await f.call('/api/admin/subscriptions',{method:'POST',body:{name:'Teste Care',phone:'11900008872',model:'Teste',planId:'careEssential',paidConfirmed:true}});assert.equal(care.status,201);
 const saved=await f.call('/api/subscriptions/'+care.data.subscription.id+'/requests',{method:'POST',auth:false,headers:{Authorization:'Bearer '+care.data.portalToken},body:f.selection({creditKind:'premium'})});assert.equal(saved.status,201);await dispatchPush(f.env,{fetcher:f.fetcher});assert.equal(f.deliveries.length,1);
 await f.db.prepare("CREATE TRIGGER block_push_insert BEFORE INSERT ON admin_push_jobs BEGIN SELECT RAISE(ABORT,'test'); END").run();const body=f.selection();assert.equal((await f.call('/api/quotes',{method:'POST',auth:false,body})).status,500);
 assert.equal(await f.db.prepare('SELECT id FROM quotes WHERE viewer_hash=?').bind(await digest(body.submissionToken)).first(),null);
 await f.db.prepare('DROP TRIGGER block_push_insert').run();assert.equal((await f.call('/api/quotes',{method:'POST',auth:false,body})).status,201);
});
test('aviso imediato funciona em segundo plano e o agendamento recupera a fila sem painel aberto',async t=>{
 const f=await fixture(t),browser=await browserSubscription();await f.enroll(browser);const background=[];
 const quote=await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection(),ctx:{waitUntil:promise=>background.push(promise)}});assert.equal(quote.status,201);await Promise.all(background);assert.equal(f.deliveries.length,1);
 await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()});await worker.scheduled({},f.env);assert.equal(f.deliveries.length,2);
});
test('migração de notificações preserva clientes, ciclos, recibos e estrutura existente',async t=>{
 const f=await fixture(t,{legacy:true});
 const care=await f.call('/api/admin/subscriptions',{method:'POST',body:{name:'Cliente preservado',phone:'11900008873',model:'Veículo preservado',planId:'careEssential',paidConfirmed:true}});assert.equal(care.status,201);
 assert.equal((await f.call('/api/quotes',{method:'POST',auth:false,body:f.selection()})).status,201);
 const tables=['customers','subscriptions','cycles','quotes','quote_events','payment_receipts','audit_events'];
 const before=await Promise.all(tables.map(table=>f.db.prepare('SELECT * FROM '+table+' ORDER BY id').all()));
 await applyMigrations(f.db,{files:['0003_admin_notifications.sql']});
 const after=await Promise.all(tables.map(table=>f.db.prepare('SELECT * FROM '+table+' ORDER BY id').all()));assert.deepEqual(after.map(value=>value.results),before.map(value=>value.results));
 const schema=(await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(row=>row.name);for(const name of ['admin_push_subscriptions','admin_push_jobs','admin_push_vapid_tokens'])assert.ok(schema.includes(name));
 assert.equal((await f.db.prepare('SELECT amount_cents FROM payment_receipts WHERE cycle_id=?').bind(care.data.subscription.cycle.id).first()).amount_cents,26000);
 assert.equal(Object.hasOwn((await f.call('/api/admin/dashboard')).data,'monthlyPayments'),false);
});

async function serviceWorkerHarness(windows=[]){
 const listeners=new Map(),notifications=[],opened=[],self={location:{origin},skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>windows,openWindow:async url=>opened.push(url)},registration:{showNotification:async(title,options)=>notifications.push({title,options})},addEventListener:(name,handler)=>listeners.set(name,handler)};
 vm.runInNewContext(await readFile('dist/painel/sw.js','utf8'),{self,URL});
 const run=async(name,event)=>{let promise;listeners.get(name)({...event,waitUntil:p=>promise=p});await promise;};return {listeners,notifications,opened,run};
}
test('service worker mostra aviso com vibração sem página aberta e ignora links ou nomes do payload',async()=>{
 const sw=await serviceWorkerHarness(),quoteId=crypto.randomUUID();
 await sw.run('push',{data:{json:()=>({type:'order.created',quoteId,title:'Nome privado',url:'https://evil.test/'})}});
 assert.equal(sw.notifications.length,1);assert.equal(sw.notifications[0].title,'Fine Form · Novo pedido');assert.deepEqual(Array.from(sw.notifications[0].options.vibrate),[200,100,200]);assert.ok(!JSON.stringify(sw.notifications[0]).includes('Nome privado'));assert.equal(sw.listeners.has('fetch'),false);
 await sw.run('notificationclick',{notification:{close(){},data:{quoteId,url:'https://evil.test/'}}});assert.equal(sw.opened[0],origin+'/painel/?pedido='+quoteId);
 await sw.run('notificationclick',{notification:{close(){},data:{quoteId:'https://evil.test/'}}});assert.equal(sw.opened[1],origin+'/painel/');
});
test('toque no aviso reaproveita painel aberto sem navegar fora do site',async()=>{
 let focused=false,message;const sw=await serviceWorkerHarness([{url:origin+'/painel/',focus:async()=>focused=true,postMessage:value=>message=value}]),quoteId=crypto.randomUUID();
 await sw.run('notificationclick',{notification:{close(){},data:{quoteId}}});assert.equal(focused,true);assert.equal(message.type,'ff-open-order');assert.equal(message.quoteId,quoteId);assert.equal(sw.opened.length,0);
});

test('Worker real no Miniflare envia Web Push criptografado com as APIs nativas do Cloudflare',async t=>{
 const vapid=await generateVapid(origin),browser=await browserSubscription('workerd'),deliveries=[],mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://fcm.googleapis.com').intercept({method:'POST',path:'/fcm/send/test-workerd'}).reply(options=>{
  deliveries.push({endpoint:browser.subscription.endpoint,options:{body:options.body,headers:options.headers}});return {statusCode:201,data:''};
 });
 const script=(await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key,ADMIN_TOTP_SECRET:secret,PUSH_VAPID:JSON.stringify(vapid)},d1Databases:{DB:'workerd-push'},fetchMock:mock,log:new Log(LogLevel.ERROR)});t.after(()=>mf.dispose());
 const db=await mf.getD1Database('DB');await applyMigrations(db);let cookie='',csrf='',ip=1;
 async function call(path,body,authenticated=true){
  const response=await mf.dispatchFetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'User-Agent':'workerd-push-test','CF-Connecting-IP':'192.0.2.'+ip++,...(body?{'Content-Type':'application/json'}:{}),...(authenticated?{Cookie:cookie,'X-FF-CSRF':csrf}:{})},body:body?JSON.stringify(body):undefined});return {response,data:await response.json()};
 }
 const login=await call('/api/admin/session',{key,code:await totpCode(secret)},false);assert.equal(login.response.status,200);cookie=login.response.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
 assert.equal((await call('/api/admin/notifications/subscription',{subscription:browser.subscription,label:'Teste Workerd'})).response.status,201);
 const quote=await call('/api/quotes',{plate:fixturePlate(),vehicle:'car',mode:'single',service:'premium',model:'Teste',name:'Cliente teste',phone:'11900008941',flexibleDate:true,treatments:[],extras:[],ack:true,submissionToken:encode(crypto.getRandomValues(new Uint8Array(32)))},false);assert.equal(quote.response.status,201);
 const end=Date.now()+5000;while(Date.now()<end){if((await db.prepare('SELECT state FROM admin_push_jobs').first())?.state==='sent')break;await new Promise(resolve=>setTimeout(resolve,20));}
 assert.equal((await db.prepare('SELECT state FROM admin_push_jobs').first()).state,'sent');assert.equal(deliveries.length,1);assert.deepEqual(await decryptDelivery(deliveries[0],browser),{type:'order.created',quoteId:quote.data.quote.id});
});
