import {fixturePlate,vehicleFixture} from './helpers/plates.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {applyMigrations} from './helpers/database.mjs';
import {totpCode,totpStep,SESSION_SECONDS,IDLE_SECONDS,REAUTH_SECONDS,digest} from '../services/api/src/infrastructure/security.mjs';
import {todaySP} from '../services/api/src/domain/model.mjs';
const key='integration-security-only-random-admin-key-64-characters-long-01',secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',origin='https://fine-form.test';
let mf,db,cookie,csrf,ip=1,bundle;
async function call(path,{method='GET',body,auth=true,headers={},raw,urlOrigin=origin}={}){
 await vehicleFixture(db,path,body);
 const res=await mf.dispatchFetch(urlOrigin+path,{method,headers:{Origin:urlOrigin,'User-Agent':'fine-form-security-test','CF-Connecting-IP':'192.0.2.'+(ip++%250),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie||'','X-FF-CSRF':csrf||''}:{}),...headers},body:raw??(body===undefined?undefined:JSON.stringify(body))});
 if(res.status===101)return {res,status:101,data:null};const data=await res.json();return {res,status:res.status,data};
}
function keepSession(result){cookie=result.res.headers.get('Set-Cookie').split(';')[0];csrf=result.data.csrfToken;}
before(async()=>{
 bundle=(await build({entryPoints:['services/api/src/http/worker.mjs'],bundle:true,format:'esm',write:false})).outputFiles[0].text;
 mf=new Miniflare({modules:true,script:bundle,compatibilityDate:'2026-07-30',cf:{country:'BR'},bindings:{ADMIN_KEY:key,ADMIN_TOTP_SECRET:secret},d1Databases:{DB:'security-test'},durableObjects:{LIVE:{className:'LiveUpdates',useSQLite:true}},log:new Log(LogLevel.ERROR)});
 db=await mf.getD1Database('DB');await applyMigrations(db);
 const login=await call('/api/admin/session',{method:'POST',auth:false,body:{key,code:await totpCode(secret,Math.floor(Date.now()/30000)-1)}});assert.equal(login.status,200);keepSession(login);
});
after(async()=>{await mf?.dispose();});
test('TOTP matches published RFC 6238 vectors and rejects old, malformed codes',async()=>{
 for(const [seconds,code] of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']])assert.equal(await totpCode(secret,Math.floor(seconds/30)),code);
 assert.equal(await totpStep(secret,'287082',59000),1);assert.equal(await totpStep(secret,'287082',200000),null);assert.equal(await totpStep(secret,'12345'),null);
});
test('production login enforces two factors and rejects replayed OTP',async()=>{
 assert.equal((await call('/api/admin/session',{method:'POST',auth:false,body:{key}})).status,401);
 assert.equal((await call('/api/admin/session',{method:'POST',auth:false,body:{key:'wrong',code:await totpCode(secret)}})).status,401);
 const repeated=await totpCode(secret,Math.floor(Date.now()/30000)-1);assert.equal((await call('/api/admin/session',{method:'POST',auth:false,body:{key,code:repeated}})).status,401);
 assert.match(cookie,/^__Host-ff_admin=[A-Za-z0-9_-]{43}$/);
 const check=await call('/api/admin/session');assert.equal(check.status,200);assert.equal(check.data.csrfToken,csrf);assert.equal(check.data.mfaRequired,true);
});
test('all administrative routes reject guests and private customer links',async()=>{
 for(const path of ['/api/admin/dashboard','/api/admin/quotes','/api/admin/subscriptions','/api/admin/customers','/api/admin/agenda','/api/admin/export']){
  assert.equal((await call(path,{auth:false})).status,401);assert.equal((await call(path,{auth:false,headers:{Authorization:'Bearer '+Buffer.alloc(32,1).toString('base64url')}})).status,401);
 }
 const forged=await call('/api/admin/dashboard',{headers:{Cookie:'__Host-ff_admin='+Buffer.alloc(32,2).toString('base64url')}});assert.equal(forged.status,401);
});
test('origin, fetch metadata and CSRF token are required for every privileged mutation',async()=>{
 const opts={method:'POST',body:{name:'Ataque',phone:'11900009000',model:'Civic',planId:'careEssential',paidConfirmed:true}};
 assert.equal((await call('/api/admin/subscriptions',{...opts,headers:{Origin:''}})).status,403);
 assert.equal((await call('/api/admin/subscriptions',{...opts,headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await call('/api/admin/subscriptions',{...opts,headers:{'Sec-Fetch-Site':'same-site'}})).status,403);
 assert.equal((await call('/api/admin/subscriptions',{...opts,headers:{'X-FF-CSRF':''}})).status,403);
 assert.equal((await call('/api/admin/subscriptions',{...opts,headers:{'X-FF-CSRF':'forged'}})).status,403);
 assert.equal((await call('/api/admin/session',{method:'DELETE',headers:{'X-FF-CSRF':''}})).status,403);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM subscriptions').first()).n,0);
});
test('session is bound to host and browser and has idle and absolute expiration',async()=>{
 assert.equal((await call('/api/admin/dashboard',{headers:{'User-Agent':'another-browser'}})).status,401);
 assert.equal((await call('/api/admin/dashboard',{urlOrigin:'https://another-host.test'})).status,401);
 const id=await digest(cookie.split('=')[1]),stamp=Math.floor(Date.now()/1000);
 await db.prepare('UPDATE admin_sessions SET last_seen=? WHERE id=?').bind(stamp-IDLE_SECONDS-1,id).run();assert.equal((await call('/api/admin/dashboard')).status,401);
 await db.prepare('UPDATE admin_sessions SET last_seen=?,expires_at=? WHERE id=?').bind(stamp,stamp-1,id).run();assert.equal((await call('/api/admin/dashboard')).status,401);
 await db.prepare('UPDATE admin_sessions SET expires_at=? WHERE id=?').bind(stamp+SESSION_SECONDS,id).run();assert.equal((await call('/api/admin/dashboard')).status,200);
});
test('sensitive operations require recent reauthentication and rotate session',async()=>{
 const old=cookie,id=await digest(old.split('=')[1]),stamp=Math.floor(Date.now()/1000);
 await db.prepare('UPDATE admin_sessions SET authenticated_at=? WHERE id=?').bind(stamp-REAUTH_SECONDS-1,id).run();
 const blocked=await call('/api/admin/export');assert.equal(blocked.status,428);assert.equal(blocked.data.code,'reauth_required');
 assert.equal((await call('/api/admin/subscriptions',{method:'POST',body:{paidConfirmed:true}})).status,428);
 const result=await call('/api/admin/reauth',{method:'POST',body:{key,code:await totpCode(secret)}});assert.equal(result.status,200);keepSession(result);assert.notEqual(cookie,old);assert.notEqual(csrf,'');
 assert.equal((await call('/api/admin/dashboard',{headers:{Cookie:old}})).status,401);assert.equal((await call('/api/admin/export')).status,200);
 assert.match(result.res.headers.get('Set-Cookie'),/Secure/);assert.match(result.res.headers.get('Set-Cookie'),/HttpOnly/);assert.match(result.res.headers.get('Set-Cookie'),/SameSite=Strict/);assert.match(result.res.headers.get('Set-Cookie'),/Path=\//);assert.match(result.res.headers.get('Set-Cookie'),/Max-Age=7200/);
});
test('JSON rejects oversized, deeply nested, prototype and incorrectly typed money payloads',async()=>{
 assert.equal((await call('/api/quotes',{method:'POST',auth:false,body:{notes:'x'.repeat(17000)}})).status,413);
 assert.equal((await call('/api/quotes',{method:'POST',auth:false,body:{},headers:{'Content-Type':'application/jsonp'}})).status,415);
 assert.equal((await call('/api/quotes',{method:'POST',auth:false,raw:'{"__proto__":{"x":true}}',headers:{'Content-Type':'application/json'}})).status,400);
 assert.equal((await call('/api/quotes',{method:'POST',auth:false,raw:'{"x":'+ '['.repeat(20)+'0'+']'.repeat(20)+'}',headers:{'Content-Type':'application/json'}})).status,400);
 const payload={plate:fixturePlate(),vehicle:'car',mode:'guidance',model:'Test',name:'Teste',phone:'11900009980',ack:true,submissionToken:Buffer.alloc(32,19).toString('base64url'),treatments:[],extras:[]};
 const q=(await call('/api/quotes',{method:'POST',auth:false,body:payload})).data.quote;
 for(const amount of [true,'1.50',-1,1.234,100001])assert.equal((await call('/api/admin/quotes/'+q.id,{method:'PATCH',body:{version:q.version,confirmedTotal:amount}})).status,400);
});
test('server prices and append-only receipts preserve balance after customer deletion',async()=>{
 const receiptTotal=async()=>(await db.prepare('SELECT COALESCE(SUM(amount_cents),0) cents FROM payment_receipts').first()).cents;
 const before=await receiptTotal();
 const active=await call('/api/admin/subscriptions',{method:'POST',body:{name:'Cliente financeiro',phone:'11900009990',model:'Carro financeiro',planId:'careEssential',paidConfirmed:true,startsOn:todaySP(),price:0,price_cents:1,monthlyPayments:999999}});assert.equal(active.status,201);
 const sub=active.data.subscription,cycle=sub.cycle;
 assert.equal(cycle.price_cents,26000);const receipt=await db.prepare('SELECT * FROM payment_receipts WHERE cycle_id=?').bind(cycle.id).first();assert.equal(receipt.amount_cents,26000);assert.equal(receipt.actor_id,await digest(cookie.split('=')[1]));
 assert.equal(await receiptTotal(),before+26000);
 assert.equal(Object.hasOwn((await call('/api/admin/dashboard')).data,'monthlyPayments'),false);
 await assert.rejects(()=>db.prepare('UPDATE payment_receipts SET amount_cents=1 WHERE id=?').bind(receipt.id).run(),/append-only/);
 await assert.rejects(()=>db.prepare('DELETE FROM payment_receipts WHERE id=?').bind(receipt.id).run(),/append-only/);
 await assert.rejects(()=>db.prepare('UPDATE cycles SET price_cents=1 WHERE id=?').bind(cycle.id).run(),/cannot be rewritten/);
 await assert.rejects(()=>db.prepare('DELETE FROM audit_events').run(),/append-only/);
 const preview=await call('/api/admin/customers/'+sub.customerId);assert.equal((await call('/api/admin/customers/'+sub.customerId,{method:'DELETE',body:{confirm:true,snapshot:preview.data.snapshot}})).status,200);
 assert.equal(await receiptTotal(),before+26000);assert.ok(await db.prepare('SELECT id FROM payment_receipts WHERE cycle_id=?').bind(cycle.id).first());
 assert.equal(Object.hasOwn((await call('/api/admin/dashboard')).data,'monthlyPayments'),false);
 const exported=(await call('/api/admin/export')).data;assert.ok(exported.payment_receipts.some(r=>r.id===receipt.id));assert.equal(exported.admin_sessions,undefined);assert.equal(exported.mfa_counters,undefined);
});
test('API and sensitive pages enforce browser headers, HTTPS and no-store',async()=>{
 const response=await call('/api/admin/dashboard');
 for(const [name,pattern] of [['Strict-Transport-Security',/31536000/],['Cache-Control',/no-store/],['Content-Security-Policy',/frame-ancestors 'none'/],['X-Frame-Options',/DENY/],['Cross-Origin-Resource-Policy',/same-origin/]])assert.match(response.res.headers.get(name),pattern);
 const page=await mf.dispatchFetch(origin+'/painel/');assert.match(page.headers.get('Content-Security-Policy'),/script-src 'self'/);assert.doesNotMatch(page.headers.get('Content-Security-Policy'),/unsafe-inline/);assert.match(page.headers.get('Content-Security-Policy'),/wss:\/\/fine-form.test/);assert.match(page.headers.get('Cache-Control'),/no-store/);
 const redirect=await mf.dispatchFetch('http://fine-form.test/painel/',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),origin+'/painel/');
 assert.equal((await call('/api/admin/session',{method:'POST',urlOrigin:'http://fine-form.test',body:{key}})).status,403);
});
test('realtime tickets are single-use, tied to host and session, and revoked on logout',async()=>{
 const ticket=(await call('/api/realtime-ticket',{method:'POST',body:{scope:'admin'}})).data.ticket;
 const wrong=await call('/api/realtime?ticket='+encodeURIComponent(ticket),{urlOrigin:'https://another-host.test',headers:{Upgrade:'websocket'}});assert.equal(wrong.status,401);
 const connected=await call('/api/realtime?ticket='+encodeURIComponent(ticket),{headers:{Upgrade:'websocket'}});assert.equal(connected.status,101);const ws=connected.res.webSocket;ws.accept();
 assert.equal((await call('/api/realtime?ticket='+encodeURIComponent(ticket),{headers:{Upgrade:'websocket'}})).status,401);
 const pending=(await call('/api/realtime-ticket',{method:'POST',body:{scope:'admin'}})).data.ticket;
 const old=cookie;assert.equal((await call('/api/admin/session',{method:'DELETE'})).status,200);assert.equal((await call('/api/admin/dashboard',{headers:{Cookie:old}})).status,401);
 assert.equal((await call('/api/realtime?ticket='+encodeURIComponent(pending),{headers:{Cookie:old,Upgrade:'websocket'}})).status,401);ws.close();
});
test('second-factor guessing is limited across different IP addresses',async()=>{
 for(let i=0;i<15;i++)assert.equal((await call('/api/admin/session',{method:'POST',auth:false,headers:{'CF-Connecting-IP':'198.51.100.'+(i+1)},body:{key:'invalid-first-factor',code:'invalid'}})).status,401);
 let last;for(let i=0;i<20;i++)last=await call('/api/admin/session',{method:'POST',auth:false,headers:{'CF-Connecting-IP':'203.0.113.'+(i+1)},body:{key,code:'invalid'}});assert.equal(last.status,429);
});
test('migration imports prior paid cycles without changing customers or subscriptions',async()=>{
 const legacy=new Miniflare({modules:true,script:bundle,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'legacy-migration-test'},log:new Log(LogLevel.ERROR)});
 try{
  const database=await legacy.getD1Database('DB');await applyMigrations(database,{files:['0001_initial.sql']});
  const customer=crypto.randomUUID(),sub=crypto.randomUUID(),cycle=crypto.randomUUID(),stamp=new Date().toISOString();
  await database.batch([
   database.prepare('INSERT INTO customers(id,name,phone,vehicle,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(customer,'Cliente preservado','5511900000991','car','Carro preservado',stamp,stamp),
   database.prepare('INSERT INTO subscriptions(id,customer_id,plan_id,vehicle,model,viewer_hash,billing_day,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(sub,customer,'careEssential','car','Carro preservado','legacy-test-hash',1,stamp,stamp),
   database.prepare('INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(cycle,sub,'2026-09-01','2026-10-01',26000,1,1,0,stamp)
  ]);
  await applyMigrations(database,{files:['0002_security.sql']});const receipt=await database.prepare('SELECT * FROM payment_receipts WHERE cycle_id=?').bind(cycle).first();assert.equal(receipt.amount_cents,26000);assert.equal(receipt.source,'legacy_import');assert.equal(receipt.actor_id,'legacy');
  assert.equal((await database.prepare('SELECT name FROM customers WHERE id=?').bind(customer).first()).name,'Cliente preservado');assert.equal((await database.prepare('SELECT price_cents FROM cycles WHERE id=?').bind(cycle).first()).price_cents,26000);
  await database.prepare('DELETE FROM subscriptions WHERE id=?').bind(sub).run();assert.ok(await database.prepare('SELECT id FROM payment_receipts WHERE cycle_id=?').bind(cycle).first());
 }finally{await legacy.dispose();}
});
test('expired realtime sockets close without repeatedly scheduling an alarm in the past',async()=>{
 const {LiveUpdates}=await import('../services/api/src/infrastructure/realtime.mjs');let scheduled=null,deleted=false;
 const expired={readyState:1,deserializeAttachment:()=>({expiresAt:Date.now()-1}),close(){this.readyState=2;}},futureTime=Date.now()+60000,future={readyState:1,deserializeAttachment:()=>({expiresAt:futureTime})};
 const sockets=[expired,future],ctx={getWebSockets:()=>sockets,storage:{async setAlarm(t){scheduled=t;},async deleteAlarm(){deleted=true;}}};const live=new LiveUpdates(ctx);await live.alarm();assert.equal(expired.readyState,2);assert.equal(scheduled,futureTime);
 sockets.pop();await live.schedule();assert.equal(deleted,true);
});
