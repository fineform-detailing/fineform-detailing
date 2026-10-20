import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import worker from '../worker/index.mjs';
import {applyMigrations} from './helpers/database.mjs';
import {vehicleFixture} from './helpers/plates.mjs';
import {generateVapid} from '../scripts/notifications-setup.mjs';
import {digest,randomToken,sign,totpCode} from '../worker/security.mjs';
import {dispatchReviewPush} from '../worker/reviews.mjs';
import {todaySP} from '../worker/domain.mjs';

const origin='https://fine-form.test',key='reviews-test-only-admin-key-at-least-thirty-two-characters',secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const encode=bytes=>Buffer.from(bytes).toString('base64url');
async function browser(){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),auth=crypto.getRandomValues(new Uint8Array(16));
 return {privateKey:pair.privateKey,publicKey,auth,subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/'+crypto.randomUUID(),expirationTime:null,keys:{p256dh:encode(publicKey),auth:encode(auth)}}};
}
async function fixture(t){
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-07-30',cf:false,d1Databases:{DB:crypto.randomUUID()},log:new Log(LogLevel.ERROR)});
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');await applyMigrations(db);
 const vapid=await generateVapid(origin),env={DB:db,ADMIN_KEY:key,ADMIN_TOTP_SECRET:secret,PUSH_VAPID:JSON.stringify(vapid)};
 let cookie='',csrf='',ip=0;
 async function call(path,{method='GET',body,token,headers={}}={}){
  await vehicleFixture(db,path,body);
  const req=new Request(origin+path,{method,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.'+(++ip%250),'User-Agent':'reviews-test',...(cookie?{Cookie:cookie,'X-FF-CSRF':csrf}:{}),...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const response=await worker.fetch(req,env);return {status:response.status,data:await response.json(),response};
 }
 const login=await call('/api/admin/session',{method:'POST',body:{key,code:await totpCode(secret)}});assert.equal(login.status,200);cookie=login.response.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
 async function quote(){
  const token=randomToken(),result=await call('/api/quotes',{method:'POST',body:{vehicle:'car',mode:'single',service:'premium',model:'Modelo privado',name:'Mariana Sobrenome Privado',phone:'11900009922',date:'',time:'',flexibleDate:true,treatments:[],extras:[],ack:true,submissionToken:token}});
  assert.equal(result.status,201);return {...result.data.quote,token};
 }
 async function update(q,status){
  const version=(await db.prepare('SELECT version FROM quotes WHERE id=?').bind(q.id).first()).version;
  return call('/api/admin/quotes/'+q.id,{method:'PATCH',body:{version,status}});
 }
 async function deliver(q){assert.equal((await update(q,'accepted')).status,200);assert.equal((await update(q,'ready')).status,200);return update(q,'completed');}
 const review=(q,body={rating:5,comment:'Cuidado excelente.',consent:true},token=q.token)=>call('/api/quotes/'+q.id+'/review',{method:'POST',body,token});
 const enroll=(q,b)=>call('/api/quotes/'+q.id+'/notifications',{method:'POST',token:q.token,body:{subscription:b.subscription,consent:true}});
 return {db,env,vapid,call,quote,update,deliver,review,enroll};
}
async function decrypt(delivery,b){
 const bytes=new Uint8Array(await new Response(delivery.options.body).arrayBuffer()),salt=bytes.slice(0,16),keySize=bytes[20],sender=bytes.slice(21,21+keySize);
 const shared=await crypto.subtle.deriveBits({name:'ECDH',public:await crypto.subtle.importKey('raw',sender,{name:'ECDH',namedCurve:'P-256'},false,[])},b.privateKey,256);
 const hkdf=async(material,salt,info,length)=>crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',material,'HKDF',false,['deriveBits']),length*8);
 const ikm=await hkdf(shared,b.auth,Buffer.concat([Buffer.from('WebPush: info\0'),b.publicKey,sender]),32);
 const contentKey=await hkdf(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const aes=await crypto.subtle.importKey('raw',contentKey,'AES-GCM',false,['decrypt']),plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},aes,bytes.slice(21+keySize)));
 let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);return JSON.parse(new TextDecoder().decode(plain.slice(0,end)));
}

test('avaliação exige pedido entregue, link correto, nota válida e consentimento',async t=>{
 const f=await fixture(t),q=await f.quote(),path='/api/quotes/'+q.id+'/review';
 assert.equal((await f.call(path)).status,404);assert.equal((await f.call(path,{token:randomToken()})).status,404);
 assert.equal((await f.review(q)).status,409);await f.update(q,'accepted');await f.update(q,'ready');assert.equal((await f.review(q)).status,409);
 assert.equal((await f.update(q,'completed')).status,200);
 for(const body of [{rating:0,comment:'',consent:true},{rating:6,comment:'',consent:true},{rating:2.5,comment:'',consent:true},{rating:5,comment:'x'.repeat(601),consent:true},{rating:5,comment:'',consent:false}])assert.equal((await f.review(q,body)).status,400);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM reviews').first()).n,0);
});
test('reenvios concorrentes criam uma avaliação e a lista pública preserva notas baixas sem dados do pedido',async t=>{
 const f=await fixture(t),q=await f.quote();assert.equal((await f.deliver(q)).status,200);
 const results=await Promise.all([f.review(q,{rating:1,comment:'Pode melhorar.',consent:true}),f.review(q,{rating:1,comment:'Pode melhorar.',consent:true})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM reviews').first()).n,1);
 const result=await f.call('/api/reviews'),serialized=JSON.stringify(result.data);
 assert.equal(result.status,200);assert.equal(result.data.average,1);assert.equal(result.data.items[0].firstName,'Mariana');assert.equal(result.data.items[0].rating,1);
 for(const value of ['Sobrenome','11900009922','Modelo privado',q.id,q.reference,q.token,'viewer_hash'])assert.ok(!serialized.includes(value));
 assert.equal((await f.call('/api/quotes/'+q.id+'/review',{token:q.token})).data.review.rating,1);
});
test('inscrição é consentida, privada, idempotente e limitada por pedido',async t=>{
 const f=await fixture(t),q=await f.quote(),b=await browser(),path='/api/quotes/'+q.id+'/notifications';
 assert.equal((await f.call(path,{method:'POST',body:{subscription:b.subscription,consent:true}})).status,404);
 assert.equal((await f.call(path,{method:'POST',token:q.token,body:{subscription:b.subscription}})).status,400);
 assert.equal((await f.enroll(q,b)).status,201);assert.equal((await f.enroll(q,b)).status,201);
 for(let i=0;i<2;i++)assert.equal((await f.enroll(q,await browser())).status,201);
 assert.equal((await f.enroll(q,await browser())).status,409);
 const state=await f.call(path,{token:q.token});assert.equal(state.data.deviceIds.length,3);
 const serialized=JSON.stringify(state.data);for(const v of [b.subscription.endpoint,b.subscription.keys.auth,b.subscription.keys.p256dh,f.vapid.privateKey])assert.ok(!serialized.includes(v));
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM customer_push_jobs').first()).n,0);
});
test('só a entrega cria convite; processamento concorrente envia um push criptografado com acesso restrito à avaliação',async t=>{
 const f=await fixture(t),q=await f.quote(),b=await browser();await f.enroll(q,b);
 await f.update(q,'accepted');await f.update(q,'ready');assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM customer_push_jobs').first()).n,0);
 await f.update(q,'completed');const deliveries=[],fetcher=async(endpoint,options)=>{deliveries.push({endpoint,options});return new Response(null,{status:201});};
 await Promise.all([dispatchReviewPush(f.env,{fetcher}),dispatchReviewPush(f.env,{fetcher})]);assert.equal(deliveries.length,1);
 const message=await decrypt(deliveries[0],b);assert.equal(message.type,'review.requested');assert.equal(message.quoteId,q.id);
 assert.ok(!JSON.stringify(message).includes(q.token));assert.ok(!JSON.stringify(message).includes('Mariana'));
 assert.equal((await f.call('/api/quotes/'+q.id,{token:message.token})).status,404);
 assert.equal((await f.call('/api/quotes/'+q.id+'/notifications',{token:message.token})).status,404);
 assert.equal((await f.call('/api/quotes/'+q.id+'/review',{token:message.token})).status,200);
 assert.equal((await f.review(q,{rating:4,comment:'Tudo certo.',consent:true},message.token)).status,201);
 await dispatchReviewPush(f.env,{fetcher});assert.equal(deliveries.length,1);
});
test('entrega e fila são atômicas; conflitos de versão não duplicam convites',async t=>{
 const f=await fixture(t),q=await f.quote();await f.enroll(q,await browser());await f.update(q,'accepted');await f.update(q,'ready');
 await f.db.prepare("CREATE TRIGGER reject_review_queue BEFORE INSERT ON customer_push_jobs BEGIN SELECT RAISE(ABORT,'test queue failure'); END").run();
 assert.equal((await f.update(q,'completed')).status,500);assert.equal((await f.db.prepare('SELECT status FROM quotes WHERE id=?').bind(q.id).first()).status,'ready');
 await f.db.prepare('DROP TRIGGER reject_review_queue').run();
 const version=(await f.db.prepare('SELECT version FROM quotes WHERE id=?').bind(q.id).first()).version;
 const results=await Promise.all([f.call('/api/admin/quotes/'+q.id,{method:'PATCH',body:{version,status:'completed'}}),f.call('/api/admin/quotes/'+q.id,{method:'PATCH',body:{version,status:'completed'}})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM customer_push_jobs').first()).n,1);
});
test('inscrição após entrega gera um convite; falha temporária reprocessa e aparelho expirado é removido',async t=>{
 const f=await fixture(t),q=await f.quote();await f.deliver(q);await f.enroll(q,await browser());
 let calls=0;await dispatchReviewPush(f.env,{fetcher:async()=>{calls++;return new Response(null,{status:429});}});
 let job=await f.db.prepare('SELECT * FROM customer_push_jobs').first();assert.equal(job.state,'pending');assert.equal(job.attempts,1);assert.ok(job.next_attempt_at>Math.floor(Date.now()/1000));
 await dispatchReviewPush(f.env,{fetcher:async()=>{calls++;return new Response(null,{status:201});}});assert.equal(calls,1);
 await f.db.prepare('UPDATE customer_push_jobs SET next_attempt_at=0').run();
 await dispatchReviewPush(f.env,{fetcher:async()=>new Response(null,{status:410})});assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM customer_push_subscriptions').first()).n,0);
});
test('conclusão de visita Care vinculada ao pedido também cria um único convite',async t=>{
 const f=await fixture(t);
 const created=await f.call('/api/admin/subscriptions',{method:'POST',body:{name:'Mariana Care',phone:'11900009922',model:'Modelo Care',planId:'careEssential',paidConfirmed:true,startsOn:todaySP()}});
 assert.equal(created.status,201);const s=created.data.subscription,token=randomToken();
 const requested=await f.call('/api/subscriptions/'+s.id+'/requests',{method:'POST',token:created.data.portalToken,body:{creditKind:'premium',date:todaySP(),time:'',flexibleDate:true,ack:true,submissionToken:token}});
 assert.equal(requested.status,201);const q={...requested.data.quote,token};await f.enroll(q,await browser());assert.equal((await f.update(q,'accepted')).status,200);
 const visit=await f.db.prepare('SELECT * FROM visits WHERE quote_id=?').bind(q.id).first();
 const result=await f.call('/api/admin/visits/'+visit.id,{method:'PATCH',body:{version:visit.version,status:'completed'}});assert.equal(result.status,200);
 assert.equal((await f.call('/api/quotes/'+q.id+'/review',{token})).data.eligible,true);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM customer_push_jobs WHERE quote_id=?').bind(q.id).first()).n,1);
});
test('avaliar, revogar aparelho ou reemitir link impede envio pendente',async t=>{
 const f=await fixture(t),q=await f.quote(),b=await browser();await f.enroll(q,b);await f.deliver(q);await f.review(q);
 let calls=0;const fetcher=async()=>{calls++;return new Response(null,{status:201});};await dispatchReviewPush(f.env,{fetcher});assert.equal(calls,0);
 const other=await f.quote(),device=await browser();await f.enroll(other,device);await f.deliver(other);
 assert.equal((await f.call('/api/quotes/'+other.id+'/notifications',{method:'DELETE',token:other.token,body:{endpoint:device.subscription.endpoint}})).status,200);
 await dispatchReviewPush(f.env,{fetcher});assert.equal(calls,0);
 const revoked=await f.quote();await f.enroll(revoked,await browser());await f.deliver(revoked);
 const cap=await sign({type:'review',id:revoked.id,viewerHash:await digest(revoked.token),aud:origin,exp:Date.now()+60000},f.env);
 assert.equal((await f.call('/api/admin/quotes/'+revoked.id+'/link',{method:'POST',body:{}})).status,200);
 await dispatchReviewPush(f.env,{fetcher});assert.equal(calls,0);assert.equal((await f.call('/api/quotes/'+revoked.id+'/review',{token:cap})).status,404);
});
test('convite rejeita expiração, outra origem, outro pedido e assinatura adulterada; exclusão remove avaliação e aparelhos',async t=>{
 const f=await fixture(t),q=await f.quote();await f.deliver(q);
 const data={type:'review',id:q.id,viewerHash:await digest(q.token),aud:origin,exp:Date.now()+60000};
 for(const fields of [{exp:Date.now()-1},{aud:'https://evil.test'},{id:crypto.randomUUID()}])assert.equal((await f.call('/api/quotes/'+q.id+'/review',{token:await sign({...data,...fields},f.env)})).status,404);
 assert.equal((await f.call('/api/quotes/'+q.id+'/review',{token:(await sign(data,f.env))+'tampered'})).status,404);
 await f.enroll(q,await browser());await f.review(q);
 const version=(await f.db.prepare('SELECT version FROM quotes WHERE id=?').bind(q.id).first()).version;
 assert.equal((await f.call('/api/admin/quotes/'+q.id,{method:'DELETE',body:{version,confirm:true}})).status,200);
 for(const table of ['reviews','customer_push_subscriptions','customer_push_jobs'])assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM '+table).first()).n,0);
});
test('service worker abre somente avaliação na própria origem e não intercepta páginas privadas',async()=>{
 const source=await readFile('dist/acompanhar/sw.js','utf8'),handlers={},opened=[],notifications=[];
 const self={location:{origin},clients:{openWindow:async url=>opened.push(url),claim:async()=>{}},registration:{showNotification:async(title,options)=>notifications.push({title,options})},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(source,{self,URL});assert.equal(handlers.fetch,undefined);
 let pending;const id=crypto.randomUUID(),token='eyJ0ZXN0IjoxfQ.c2lnbmF0dXJl';
 handlers.push({data:{json:()=>({type:'review.requested',quoteId:id,token})},waitUntil:p=>pending=p});await pending;
 handlers.notificationclick({notification:{data:notifications[0].options.data,close(){}},waitUntil:p=>pending=p});await pending;
 const target=new URL(opened[0]);assert.equal(target.origin,origin);assert.equal(target.pathname,'/avaliar/');assert.equal(target.searchParams.get('id'),id);assert.equal(new URLSearchParams(target.hash.slice(1)).get('t'),token);
 handlers.notificationclick({notification:{data:{quoteId:'https://evil.test',token:'malicious'},close(){}},waitUntil:p=>pending=p});await pending;assert.equal(new URL(opened[1]).pathname,'/acompanhar/');
});
test('formulário permite nota baixa, preserva comentário após falha e escapa conteúdo ao confirmar',async()=>{
 const out=await build({entryPoints:['dist/assets/review-form.mjs'],bundle:true,format:'iife',write:false});
 const dom=new JSDOM(await readFile('dist/avaliar/index.html','utf8'),{url:origin+'/avaliar/?id='+crypto.randomUUID()+'#t='+randomToken(),runScripts:'outside-only'}),w=dom.window;
 w.AbortController=globalThis.AbortController;let fail=true;
 w.fetch=async(path,options)=>new Response(JSON.stringify(options.method==='POST'?(fail?{error:'Falha temporária'}:{review:{firstName:'Mariana',rating:1,comment:'<img src=x onerror=alert(1)>'}}):{eligible:true,firstName:'Mariana',review:null}),{status:options.method==='POST'&&fail?503:200,headers:{'Content-Type':'application/json'}});
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Interface indisponível');};
 try{
  w.eval(out.outputFiles[0].text);await until(()=>w.document.getElementById('review-form'));
  const form=w.document.getElementById('review-form');form.querySelector('[value="1"]').checked=true;form.querySelector('[name=consent]').checked=true;form.querySelector('[name=comment]').value='<img src=x onerror=alert(1)>';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.getElementById('review-error').textContent.includes('Falha temporária'));
  assert.equal(form.querySelector('[name=comment]').value,'<img src=x onerror=alert(1)>');assert.equal(form.querySelector('button').disabled,false);
  fail=false;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.querySelector('.review-thanks'));
  assert.equal(w.document.querySelector('.review-thanks img'),null);assert.match(w.document.querySelector('.review-thanks blockquote').textContent,/<img/);
 }finally{w.close();}
});
test('galeria nativa navega por botão, teclado e swipe, preserva foco e a pasta abre por toque',async()=>{
 const out=await build({entryPoints:['src/studio-motion.mjs'],bundle:true,format:'iife',outfile:'/tmp/fineform-motion-test.js',write:false});
 const dom=new JSDOM(await readFile('dist/index.html','utf8'),{url:origin,runScripts:'outside-only'}),w=dom.window;
 w.matchMedia=()=>({matches:false});
 try{
  w.eval(out.outputFiles.find(f=>f.path.endsWith('.js'))?.text||out.outputFiles[0].text);
  const gallery=w.document.getElementById('react-gallery'),first=gallery.querySelector('[data-card="0"]');
  first.focus();first.click();assert.equal(gallery.querySelector('[data-card="1"]').getAttribute('tabindex'),'0');assert.equal(w.document.activeElement,gallery.querySelector('[data-card="1"]'));
  gallery.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.match(gallery.querySelector('.explorer-counter').textContent,/Moto/);
  gallery.querySelector('[data-dot="0"]').click();assert.match(gallery.querySelector('.explorer-counter').textContent,/Pintura/);
  const event=(name,x,y)=>{const value=new w.Event(name,{bubbles:true});Object.assign(value,{clientX:x,clientY:y,pointerId:1});first.dispatchEvent(value);};
  event('pointerdown',200,100);event('pointerup',100,105);assert.match(gallery.querySelector('.explorer-counter').textContent,/Interior/);
  const folder=w.document.querySelector('.folder-float');folder.click();assert.equal(folder.getAttribute('aria-expanded'),'true');folder.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(folder.getAttribute('aria-expanded'),'false');
 }finally{w.close();}
});
