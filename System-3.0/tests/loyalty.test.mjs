import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {applyMigrations} from './helpers/database.mjs';
let mf,db,cookie,csrf,seq=10;
async function call(path,{method='GET',body,auth=true,noCsrf=false}={}){
 const res=await mf.dispatchFetch('http://localhost'+path,{method,headers:{Origin:'http://localhost','CF-Connecting-IP':'192.0.2.'+(seq++%250),...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,...(!noCsrf?{'X-FF-CSRF':csrf}:{})}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),res};
}
async function customer(phone){const id=crypto.randomUUID();await db.prepare("INSERT INTO customers VALUES(?,?,?,'car','Carro',?,?)").bind(id,'Cliente teste',phone,new Date().toISOString(),new Date().toISOString()).run();return id;}
async function order(customerId,status='completed'){
 const c=await db.prepare('SELECT * FROM customers WHERE id=?').bind(customerId).first();
 const token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
 const result=await call('/api/quotes',{method:'POST',auth:false,body:{vehicle:'car',mode:'single',service:'essential',name:c.name,phone:c.phone,model:'Carro',date:'',time:'',treatments:[],extras:[],ack:true,submissionToken:token}});
 assert.equal(result.status,201,JSON.stringify(result.data));const q=result.data.quote;
 await db.prepare("UPDATE quotes SET customer_id=?,status=?,plate='ABC1D23',plate_verified_at='2026-01-01',plate_verified_by='test' WHERE id=?").bind(customerId,status,q.id).run();return q.id;
}
const endpoint=id=>'/api/admin/customers/'+id+'/loyalty';
const post=(id,body,options={})=>call(endpoint(id),{method:'POST',body,...options});
before(async()=>{
 const bundle=await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false});
 const key='loyalty-test-admin-secret-with-more-than-32-characters';
 mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'loyalty-test'},log:new Log(LogLevel.ERROR),durableObjects:{LIVE:{className:'LiveUpdates',useSQLite:true}}});db=await mf.getD1Database('DB');await applyMigrations(db);
 const login=await call('/api/admin/session',{method:'POST',auth:false,body:{key}});assert.equal(login.status,200);cookie=login.res.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
},{timeout:30000});
after(async()=>{await mf?.dispose();});
test('cartão exige administrador, CSRF e primeiro serviço entregue',async()=>{
 const id=await customer('5511900000001');
 assert.equal((await call(endpoint(id),{auth:false})).status,401);
 assert.equal((await post(id,{action:'issue',target:2,reward:'Lavagem'},{noCsrf:true})).status,403);
 assert.equal((await post(id,{action:'issue',target:2,reward:'Lavagem'})).status,409);
 await order(id);
 assert.equal((await post(id,{action:'issue',target:99,reward:'Lavagem'})).status,400);
 assert.equal((await post(id,{action:'issue',target:2,reward:'Lavagem'})).status,200);
 assert.equal((await post(id,{action:'issue',target:2,reward:'Lavagem'})).status,409);
});
test('pontos são exclusivos por pedido, cliente e cartão; resgate único e histórico persistente',async()=>{
 const id=await customer('5511900000002'),other=await customer('5511900000003');
 const q1=await order(id),q2=await order(id),pending=await order(id,'accepted'),foreign=await order(other);
 let r=await post(id,{action:'issue',target:2,reward:'Lavagem prêmio'}),card=r.data.cards[0];
 const stamp=quoteId=>post(id,{action:'stamp',cardId:card.id,version:card.version,quoteId});
 assert.equal((await stamp(pending)).status,409);assert.equal((await stamp(foreign)).status,409);
 assert.equal((await post(id,{action:'redeem',cardId:card.id,version:card.version,confirm:true})).status,409);
 const concurrent=await Promise.all([stamp(q1),stamp(q1)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 card=(await call(endpoint(id))).data.cards[0];assert.equal(card.stamps.length,1);
 assert.equal((await stamp(q1)).status,409);
 r=await stamp(q2);assert.equal(r.status,200);card=r.data.cards[0];assert.equal(card.stamps.length,2);
 const body={action:'redeem',cardId:card.id,version:card.version,confirm:true};
 const redemptions=await Promise.all([post(id,body),post(id,body)]);assert.deepEqual(redemptions.map(r=>r.status).sort(),[200,409]);
 card=(await call(endpoint(id))).data.cards[0];assert.equal(card.status,'redeemed');assert.equal(card.events.length,4);assert.ok(card.events.every(e=>e.actor_id&&e.created_at));
 await order(id);r=await post(id,{action:'issue',target:2,reward:'Novo prêmio'});card=r.data.cards.find(c=>c.status==='active');assert.ok(card);assert.equal((await stamp(q1)).status,409);
 await db.prepare('DELETE FROM quotes WHERE id=?').bind(q1).run();
 r=await call(endpoint(id));assert.equal(r.data.cards.find(c=>c.status==='redeemed').stamps.length,2);
});
