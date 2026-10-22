import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {applyMigrations} from './helpers/database.mjs';
import {safeMapUrl,locationMessage} from '../dist/assets/business-profile.mjs';
import worker from '../worker/index.mjs';
import {JSDOM} from 'jsdom';

let mf,db,cookie,csrf,ip=1,legacy;
const key='test-business-profile-admin-key-with-more-than-32-characters';
const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
async function call(path,{method='GET',body,auth=false,cap,origin='http://localhost',noCsrf=false}={}){
 const res=await mf.dispatchFetch('http://localhost'+path,{method,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.'+(ip++%250),...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,...(!noCsrf?{'X-FF-CSRF':csrf}:{})}:{}),...(cap?{Authorization:'Bearer '+cap}:{})},body:body?JSON.stringify(body):undefined});
 return {status:res.status,data:await res.json(),res};
}
async function create(){
 const cap=token(),result=await call('/api/quotes',{method:'POST',body:{vehicle:'car',mode:'single',service:'essential',name:'Cliente local',phone:'11900000991',model:'Veículo de teste',date:'',time:'',treatments:[],extras:[],ack:true,submissionToken:cap}});
 assert.equal(result.status,201);return {q:result.data.quote,cap};
}
const profile=overrides=>({legalName:'Empresa de teste',cnpj:'AA.AAA.AAA/0001-00',registeredAddress:'Endereço cadastral de teste',visitAddress:'Local privado A, número 10',mapsUrl:'https://maps.app.goo.gl/ExampleTest',arrivalNote:'Portão de teste <sem HTML>',publishIdentity:false,publishVisitAddress:false,...overrides});
async function save(overrides={}){
 const current=(await call('/api/admin/business',{auth:true})).data.profile;
 return call('/api/admin/business',{method:'PUT',auth:true,body:{...profile(),version:current.version,...overrides}});
}
before(async()=>{
 const bundle=await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false});
 mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'business-test'},log:new Log(LogLevel.ERROR),durableObjects:{LIVE:{className:'LiveUpdates',useSQLite:true}}});
 db=await mf.getD1Database('DB');
 await applyMigrations(db,{files:(await readdir('migrations')).filter(n=>n.endsWith('.sql')&&!n.startsWith('0007'))});
 legacy=await create();
 await applyMigrations(db,{files:['0007_business_profile.sql']});
 const login=await call('/api/admin/session',{method:'POST',body:{key}});assert.equal(login.status,200);
 cookie=login.res.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
},{timeout:30000});
after(async()=>{await mf?.dispose();});

test('migração preserva pedidos e inicia cadastro vazio sem dados públicos',async()=>{
 const existing=await call('/api/quotes/'+legacy.q.id,{cap:legacy.cap});assert.equal(existing.status,200);assert.equal(existing.data.quote.location,null);
 assert.deepEqual((await call('/api/business')).data,{supplier:null,location:null});
 assert.equal((await call('/api/health')).data.locationSharing,true);
});

test('cadastro exige sessão, CSRF, origem e campos consistentes',async()=>{
 const body={...profile(),version:1};
 assert.equal((await call('/api/admin/business')).status,401);
 assert.equal((await call('/api/admin/business',{method:'PUT',body,cap:legacy.cap})).status,401);
 assert.equal((await call('/api/admin/business',{method:'PUT',body,auth:true,noCsrf:true})).status,403);
 assert.equal((await call('/api/admin/business',{method:'PUT',body,auth:true,origin:'https://outro.example'})).status,403);
 assert.equal((await save({mapsUrl:'javascript:alert(1)'})).status,400);
 assert.equal((await save({publishIdentity:true,cnpj:''})).status,400);
 assert.equal((await save({visitAddress:'a'.repeat(501)})).status,400);
 assert.equal((await save({publishIdentity:'false'})).status,400);
 assert.equal((await save({cnpj:'123'})).status,400);
});

test('endereço e mapa nunca são públicos, mesmo com opções antigas de publicação',async()=>{
 const saved=await save();assert.equal(saved.status,200);assert.equal(saved.data.profile.cnpj,'AA.AAA.AAA/0001-00');
 let visible=(await call('/api/business')).data;assert.deepEqual(visible,{supplier:null,location:null});
 assert.equal((await save({publishIdentity:true})).status,200);
 visible=(await call('/api/business')).data;assert.equal(visible.supplier.legalName,'Empresa de teste');assert.equal(visible.location,null);assert.ok(!JSON.stringify(visible).includes('Local privado A'));assert.ok(!JSON.stringify(visible).includes('maps.app'));
 assert.equal((await save({publishVisitAddress:true})).status,200);
 assert.equal((await call('/api/admin/business',{auth:true})).data.profile.publishVisitAddress,false);
 // Simulate a stored profile saved by the previous version before this deployment.
 await db.prepare("UPDATE business_profile SET data_json=json_set(data_json,'$.publishIdentity',json('true'),'$.publishVisitAddress',json('true')) WHERE id=1").run();
 visible=(await call('/api/business')).data;
 assert.deepEqual(visible,{supplier:{legalName:'Empresa de teste',cnpj:'AA.AAA.AAA/0001-00'},location:null});
 for(const privateValue of ['Endereço cadastral','Local privado A','maps.app','Portão de teste'])assert.ok(!JSON.stringify(visible).includes(privateValue));
 assert.equal((await save()).status,200);assert.deepEqual((await call('/api/business')).data,{supplier:null,location:null});
});

test('liberação é por pedido, mantém status e não muda ao editar endereço padrão',async()=>{
 const a=await create(),b=await create(),p=(await call('/api/admin/business',{auth:true})).data.profile;
 assert.equal((await call('/api/admin/quotes/'+a.q.id+'/location',{method:'PUT',body:{action:'share',version:1,profileVersion:p.version},cap:a.cap})).status,401);
 const shared=await call('/api/admin/quotes/'+a.q.id+'/location',{method:'PUT',auth:true,body:{action:'share',version:1,profileVersion:p.version}});
 assert.equal(shared.status,200);assert.equal(shared.data.quote.status,'pending');assert.equal(shared.data.quote.location.address,p.visitAddress);
 assert.equal((await call('/api/quotes/'+a.q.id)).status,404);
 assert.equal((await call('/api/quotes/'+a.q.id,{cap:b.cap})).status,404);
 assert.equal((await call('/api/quotes/'+b.q.id,{cap:b.cap})).data.quote.location,null);
 assert.equal((await call('/api/quotes/'+a.q.id,{cap:a.cap})).data.quote.location.address,p.visitAddress);
 await save({visitAddress:'Local privado B, número 20'});
 assert.equal((await call('/api/quotes/'+a.q.id,{cap:a.cap})).data.quote.location.address,p.visitAddress);
 const stale=await call('/api/admin/quotes/'+a.q.id+'/location',{method:'PUT',auth:true,body:{action:'share',version:2,profileVersion:p.version}});assert.equal(stale.status,409);
 const revoked=await call('/api/admin/quotes/'+a.q.id+'/location',{method:'PUT',auth:true,body:{action:'revoke',version:2}});assert.equal(revoked.status,200);
 const view=(await call('/api/quotes/'+a.q.id,{cap:a.cap})).data;assert.equal(view.quote.location,null);assert.ok(!JSON.stringify(view.events).includes('Local privado A'));
 const audit=await db.prepare("SELECT action FROM audit_events WHERE entity_id=? AND action LIKE 'location_%' ORDER BY created_at").bind(a.q.id).all();assert.deepEqual(audit.results.map(v=>v.action),['location_shared','location_revoked']);
});

test('edições concorrentes não sobrescrevem cadastro nem duplicam auditoria',async()=>{
 const p=(await call('/api/admin/business',{auth:true})).data.profile;
 const before=(await db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='profile_updated'").first()).n;
 const results=await Promise.all(['C','D'].map(suffix=>call('/api/admin/business',{method:'PUT',auth:true,body:{...profile({visitAddress:'Local '+suffix}),version:p.version}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='profile_updated'").first()).n,before+1);
});

test('informações públicas são servidas sem JavaScript e escapam texto cadastrado',async()=>{
 await save({legalName:'Nome de teste <img src=x onerror=alert(1)>',publishIdentity:true});
 const html=await readFile('dist/informacoes/index.html','utf8');
 const res=await worker.fetch(new Request('https://fine-form.test/informacoes/'),{DB:db,ASSETS:{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html','ETag':'old-static'}})}});
 assert.equal(res.status,200);assert.equal(res.headers.get('ETag'),null);assert.match(res.headers.get('Cache-Control'),/no-store/);
 const dom=new JSDOM(await res.text()),block=dom.window.document.querySelector('[data-public-business]');
 assert.equal(dom.window.document.querySelectorAll('[data-public-business]').length,1);
 assert.match(block.textContent,/Nome de teste <img/);assert.equal(block.querySelector('img'),null);assert.ok(!block.textContent.includes('Local privado'));assert.ok(!block.textContent.includes('Endereço cadastral'));
 dom.window.close();await save();
});

test('mapas bloqueiam domínios semelhantes e mensagens não afirmam confirmação de agenda',()=>{
 for(const url of ['https://maps.app.goo.gl.evil.example/x','https://www.google.com/url?q=x','data:text/html,x','http://maps.google.com','https://user:pass@maps.google.com/','https://waze.com.evil.example/ul','https://www.google.com:8443/maps'])assert.equal(safeMapUrl(url),'');
 assert.match(safeMapUrl('https://www.google.com/maps?q=test'),/^https:/);
 assert.match(safeMapUrl('https://waze.com/ul?ll=0,0'),/^https:/);
 const message=locationMessage({name:'Teste',reference:'FF-TESTE',location:{address:'Local teste'}});assert.match(message,/precisam estar confirmados/);assert.ok(!message.includes('undefined'));
});
