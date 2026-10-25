import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {applyMigrations} from './helpers/database.mjs';
import {createSummary,todaySP} from '../dist/assets/catalog.mjs';
import {digest,REAUTH_SECONDS} from '../worker/security.mjs';
let mf,db,cookie,csrf,ip=1,sequence=0,source;
const key='test-only-in-person-registration-access-key-more-than-32-chars';
const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const plate=()=> 'REG'+String(++sequence).padStart(4,'0');
const selection=(extra={})=>({vehicle:'car',mode:'single',service:'essential',model:'Honda Civic',name:'Cliente presencial',phone:'11900001500',flexibleDate:true,treatments:[],extras:[],ack:true,submissionToken:token(),...extra});
async function call(path,{method='GET',body,auth=false,cap,headers={}}={}){
 const response=await mf.dispatchFetch('http://localhost'+path,{method,headers:{Origin:'http://localhost','CF-Connecting-IP':'192.0.2.'+(ip++%250),...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,'X-FF-CSRF':csrf}:{}),...(cap?{Authorization:'Bearer '+cap}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json(),response};
}
before(async()=>{source=(await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false})).outputFiles[0].text;mf=new Miniflare({modules:true,script:source,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'in-person-test'},log:new Log(LogLevel.ERROR)});db=await mf.getD1Database('DB');await applyMigrations(db);const login=await call('/api/admin/session',{method:'POST',body:{key}});assert.equal(login.status,200);cookie=login.response.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;});
after(async()=>{await mf?.dispose();});
async function quote(extra={}){const body=selection(extra),result=await call('/api/quotes',{method:'POST',body});assert.equal(result.status,201,JSON.stringify(result.data));return {q:result.data.quote,body};}
const register=(q,extra={})=>call('/api/admin/quotes/'+q.id+'/plate',{method:'PATCH',auth:true,body:{version:q.version,plate:plate(),confirm:true,...extra}});
const update=(q,extra={})=>call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:q.version,...extra}});
async function care(extra={}){const result=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente Care',phone:'11900001501',model:'Honda Civic',planId:'careEssential',plate:plate(),confirmVehicle:true,paidConfirmed:true,...extra}});assert.equal(result.status,201,JSON.stringify(result.data));return result.data;}
const request=(c,extra={})=>call('/api/subscriptions/'+c.subscription.id+'/requests',{method:'POST',cap:c.portalToken,body:selection({creditKind:'premium',...extra})});
const subPlate=(s,newPlate,extra={})=>call('/api/admin/subscriptions/'+s.id+'/plate',{method:'PATCH',auth:true,body:{version:s.version,plate:newPlate,confirm:true,reason:'Correção conferida pessoalmente',...extra}});

test('cliente envia qualquer modalidade sem placa, e dados forjados não cadastram um veículo',async()=>{
 for(const mode of ['single','plan','guidance']){const {q,body}=await quote({mode,plan:'careEssential',plate:'FAL1A23',plateVerified:true,plate_verified_at:new Date().toISOString(),confirm:true});assert.equal(q.plate,null);assert.equal(q.plateVerified,false);assert.equal(q.selection.plate,undefined);assert.equal(q.selection.plateVerified,undefined);assert.doesNotMatch(createSummary(q.selection),/FAL1A23/);const again=await call('/api/quotes',{method:'POST',body:{...body,plate:{inventada:true}}});assert.equal(again.status,200);assert.equal(again.data.quote.id,q.id);}
});
test('orçamento pode ser aceito e agendado antes da chegada; iniciar requer cadastro presencial',async()=>{
 const {q}=await quote(),accepted=await update(q,{status:'accepted',scheduledDate:todaySP(),scheduledTime:'10:00'});assert.equal(accepted.status,200);const current=accepted.data.quote;
 for(const status of ['in_progress','ready','completed'])assert.equal((await update(current,{status})).status,409);
 const registered=await register(current,{plate:'abc-1234'});assert.equal(registered.status,200);const received=registered.data.quote;assert.equal(received.plate,'ABC1234');assert.equal(received.plateVerified,true);assert.equal(received.selection.plateVerified,true);assert.equal(received.scheduledDate,todaySP());assert.equal(received.budget.total,100);assert.equal(received.status,'accepted');
 assert.equal((await update(received,{status:'in_progress'})).status,200);
});
test('conferência atualiza o mesmo link privado e guarda operador, data e histórico',async()=>{
 const {q,body}=await quote();const value=plate(),registered=await register(q,{plate:value});assert.equal(registered.status,200);
 const read=await call('/api/quotes/'+q.id,{cap:body.submissionToken});assert.equal(read.status,200);assert.equal(read.data.quote.id,q.id);assert.equal(read.data.quote.plate,value);assert.ok(read.data.quote.plateVerifiedAt);assert.match(read.data.events.at(-1).message,new RegExp(value));assert.match(createSummary(read.data.quote.selection),new RegExp('Placa: '+value));
 const row=await db.prepare('SELECT plate_verified_by FROM quotes WHERE id=?').bind(q.id).first();assert.ok(row.plate_verified_by);assert.notEqual(row.plate_verified_by,'server');const audit=await db.prepare("SELECT detail FROM audit_events WHERE entity_id=? AND action='vehicle_registered'").bind(q.id).first();assert.equal(JSON.parse(audit.detail).plate,value);
});
test('cadastro exige placa válida, confirmação física e versão atual',async()=>{
 const {q}=await quote();for(const value of ['',undefined,'ABC12','ABC12345','ABC!1234',1234567,{},'ABC1234xxxxxxxxxxxx'])assert.equal((await register(q,{plate:value})).status,400);
 assert.equal((await register(q,{confirm:false})).status,400);assert.equal((await register(q,{version:999})).status,409);
 const registered=await register(q,{plate:'abc1d23'});assert.equal(registered.status,200);assert.equal(registered.data.quote.plate,'ABC1D23');
 assert.equal((await register(registered.data.quote,{plate:'XYZ9Z99',reason:''})).status,400);
});
test('cadastro do pedido é exclusivo do painel, com CSRF, mesma origem e acesso recente',async()=>{
 const {q,body}=await quote(),path='/api/admin/quotes/'+q.id+'/plate',payload={version:q.version,plate:plate(),confirm:true};
 assert.equal((await call(path,{method:'PATCH',body:payload,cap:body.submissionToken})).status,401);for(const headers of [{'X-FF-CSRF':''},{Origin:'https://outra.example'}])assert.equal((await call(path,{method:'PATCH',auth:true,body:payload,headers})).status,403);
 const session=await digest(cookie.split('=')[1]);await db.prepare('UPDATE admin_sessions SET authenticated_at=? WHERE id=?').bind(Math.floor(Date.now()/1000)-REAUTH_SECONDS-1,session).run();try{assert.equal((await register(q)).status,428);}finally{await db.prepare('UPDATE admin_sessions SET authenticated_at=? WHERE id=?').bind(Math.floor(Date.now()/1000),session).run();}
 assert.equal((await db.prepare('SELECT plate FROM quotes WHERE id=?').bind(q.id).first()).plate,null);
});
test('avulsos identificam cada atendimento sem prender o cliente a um veículo ou usar saldo Care',async()=>{
 const c=await care(),a=await quote({phone:'11900001501'}),b=await quote({phone:'11900001501',model:'Carro do sobrinho'});
 const qa=(await register(a.q,{plate:c.subscription.plate})).data.quote,qb=(await register(b.q,{plate:plate()})).data.quote;
 for(const q of [qa,qb]){assert.equal(q.kind,'single');assert.equal(q.subscriptionId,null);assert.equal(q.budget.total,100);assert.equal((await update(q,{status:'accepted'})).status,200);}
 const s=(await call('/api/subscriptions/'+c.subscription.id,{cap:c.portalToken})).data.subscription;assert.equal(s.cycle.credits.premium.available,1);assert.equal(s.cycle.credits.essential.available,1);assert.equal(s.visits.length,0);
});
test('Care originado no orçamento exige veículo registrado antes da ativação e pagamento',async()=>{
 const {q}=await quote({mode:'plan',plan:'careEssential'}),accepted=(await update(q,{status:'accepted'})).data.quote;
 const activation=extra=>call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:q.id,paidConfirmed:true,...extra}});
 assert.equal((await activation({plate:plate(),confirmVehicle:true})).status,409);
 const registered=(await register(accepted)).data.quote;assert.equal((await activation({paidConfirmed:false})).status,400);const active=await activation({});assert.equal(active.status,201);assert.equal(active.data.subscription.plate,registered.plate);assert.equal(active.data.subscription.plateVerified,true);
 assert.equal((await register(registered)).status,409);const current=(await call('/api/admin/quotes/'+q.id,{auth:true})).data.quote;assert.equal((await register(current)).status,400);
});
test('cadastro direto do Care exige confirmação presencial e preserva dois veículos do mesmo modelo',async()=>{
 const body={name:'Direto',phone:'11900001511',model:'Honda Civic',plate:plate(),planId:'careEssential',paidConfirmed:true};
 assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body})).status,400);assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{...body,confirmVehicle:false}})).status,400);
 const a=await care(),b=await care();assert.equal(a.subscription.model,b.subscription.model);assert.notEqual(a.subscription.plate,b.subscription.plate);
});
test('placa única por Care ativo ou pausado; ativação concorrente não duplica recibos',async()=>{
 const value=plate(),body={name:'Concorrência',phone:'11900001512',model:'Honda Civic',plate:value,planId:'careEssential',paidConfirmed:true,confirmVehicle:true};const before=(await db.prepare('SELECT COUNT(*) n FROM payment_receipts').first()).n;
 const results=await Promise.all([1,2].map(()=>call('/api/admin/subscriptions',{method:'POST',auth:true,body})));assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);assert.equal((await db.prepare('SELECT COUNT(*) n FROM payment_receipts').first()).n,before+1);
 const s=results.find(x=>x.status===201).data.subscription,paused=await call('/api/admin/subscriptions/'+s.id,{method:'PATCH',auth:true,body:{version:s.version,status:'paused'}});assert.equal(paused.status,200);assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body})).status,409);
});
test('solicitação Care não pede placa ao cliente e usa a placa pessoalmente cadastrada',async()=>{
 const c=await care(),result=await request(c,{model:'Outro carro',name:'Sobrinho',plateVerified:true});assert.equal(result.status,201);const q=result.data.quote;assert.equal(q.plate,c.subscription.plate);assert.equal(q.plateVerified,true);assert.equal(q.model,c.subscription.model);assert.equal(q.budget.total,0);
 assert.equal((await request(c,{plate:'XYZ9Z99'})).status,409);assert.equal((await call('/api/subscriptions/'+c.subscription.id,{method:'PATCH',cap:c.portalToken,body:{plate:'XYZ9Z99'}})).status,404);
 const direct=await call('/api/admin/subscriptions/'+c.subscription.id,{method:'PATCH',auth:true,body:{version:c.subscription.version,status:'active',plate:'XYZ9Z99'}});assert.equal(direct.data.subscription.plate,c.subscription.plate);
});
test('uso do Care confere a placa física e não consome saldo de outro veículo',async()=>{
 const c=await care(),s=c.subscription,path='/api/admin/subscriptions/'+s.id+'/visits',body={kind:'premium',status:'completed',date:todaySP()};
 assert.equal((await call(path,{method:'POST',auth:true,body})).status,400);assert.equal((await call(path,{method:'POST',auth:true,body:{...body,checkedPlate:'XYZ9Z99'}})).status,409);assert.equal((await db.prepare('SELECT COUNT(*) n FROM visits WHERE cycle_id=?').bind(s.cycle.id).first()).n,0);
 const done=await call(path,{method:'POST',auth:true,body:{...body,checkedPlate:s.plate.toLowerCase()}});assert.equal(done.status,201);assert.equal(done.data.subscription.visits[0].plate,s.plate);assert.ok(done.data.subscription.visits[0].plateCheckedAt);assert.equal(done.data.subscription.cycle.credits.premium.done,1);
});
test('pedido Care e visita agendada exigem conferência para iniciar ou concluir',async()=>{
 const c=await care(),saved=await request(c),q=saved.data.quote,accepted=(await update(q,{status:'accepted',scheduledDate:todaySP()})).data.quote;
 assert.equal((await update(accepted,{status:'in_progress'})).status,400);assert.equal((await update(accepted,{status:'completed',checkedPlate:'XYZ9Z99'})).status,409);
 const visit=await db.prepare('SELECT * FROM visits WHERE quote_id=?').bind(q.id).first();assert.equal((await call('/api/admin/visits/'+visit.id,{method:'PATCH',auth:true,body:{version:visit.version,status:'completed',checkedPlate:'XYZ9Z99'}})).status,409);
 const done=await update(accepted,{status:'completed',checkedPlate:c.subscription.plate});assert.equal(done.status,200);assert.ok(done.data.quote.plateCheckedAt);
});
test('correção do vínculo exige motivo e não reescreve visitas concluídas nem ciclos',async()=>{
 const c=await care(),s=c.subscription;await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',status:'completed',checkedPlate:s.plate}});
 const next=plate();assert.equal((await subPlate(s,next,{reason:''})).status,400);assert.equal((await subPlate(s,next,{confirm:false})).status,400);const changed=await subPlate(s,next);assert.equal(changed.status,200);const updated=changed.data.subscription;assert.equal(updated.plate,next);assert.equal(updated.visits[0].plate,s.plate);assert.equal(updated.cycle.id,s.cycle.id);assert.equal(updated.cycle.credits.premium.done,1);
 const audit=await db.prepare("SELECT detail FROM audit_events WHERE entity_id=? AND action='plate_changed'").bind(s.id).first();assert.equal(JSON.parse(audit.detail).physicalConfirmation,true);assert.equal((await subPlate(s,plate())).status,409);
});
test('correção de placa com pedido pendente ou reserva é bloqueada sem apagar o atendimento',async()=>{
 const c=await care(),q=(await request(c)).data.quote;assert.equal((await subPlate(c.subscription,plate())).status,409);
 assert.equal((await update(q,{status:'cancelled',message:'Vamos reagendar após a correção.'})).status,200);const changed=await subPlate(c.subscription,plate());assert.equal(changed.status,200);assert.equal((await db.prepare('SELECT plate FROM quotes WHERE id=?').bind(q.id).first()).plate,c.subscription.plate);
});
test('mudança concorrente do vínculo não reserva crédito para placa divergente',async()=>{
 const c=await care(),q=(await request(c)).data.quote;await db.prepare('UPDATE subscriptions SET plate=? WHERE id=?').bind(plate(),c.subscription.id).run();assert.equal((await update(q,{status:'accepted'})).status,409);assert.equal((await db.prepare('SELECT COUNT(*) n FROM visits WHERE cycle_id=?').bind(c.subscription.cycle.id).first()).n,0);
});
test('busca por placa e exportação usam o registro administrativo',async()=>{
 const {q}=await quote(),value=plate(),registered=(await register(q,{plate:value})).data.quote,formatted=value.slice(0,3)+'-'+value.slice(3),list=await call('/api/admin/quotes?q='+formatted,{auth:true});assert.ok(list.data.items.some(x=>x.id===q.id));assert.equal(registered.selection.plateVerified,true);
 const exported=await call('/api/admin/export',{auth:true});const row=exported.data.quotes.find(x=>x.id===q.id);assert.equal(row.plate,value);assert.ok(row.plate_verified_at);assert.ok(row.plate_verified_by);
});

test('migração do pacote anterior preserva dados e exige conferência presencial mesmo com placa preenchida',async t=>{
 const legacy=new Miniflare({modules:true,script:source,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'registration-previous'},log:new Log(LogLevel.ERROR)});t.after(()=>legacy.dispose());const database=await legacy.getD1Database('DB');await applyMigrations(database,{files:['0001_initial.sql','0002_security.sql','0003_admin_notifications.sql','0004_vehicle_plates.sql']});
 const customer=crypto.randomUUID(),sub=crypto.randomUUID(),cycle=crypto.randomUUID(),qid=crypto.randomUUID(),scheduled=crypto.randomUUID(),completed=crypto.randomUUID(),cap=token(),qcap=token(),stamp=new Date().toISOString(),value='OLD1A23';const {nextMonth}=await import('../worker/domain.mjs');
 const state=selection({plate:value});delete state.submissionToken;const budget={items:[{id:'plan_credit',label:'Essencial incluída',price:0,kind:'credit'}],total:0,gross:0,discount:0,hasBase:true};
 await database.batch([
  database.prepare('INSERT INTO customers(id,name,phone,vehicle,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(customer,'Cliente anterior','5511900001590','car','Civic',stamp,stamp),
  database.prepare('INSERT INTO subscriptions(id,customer_id,plan_id,vehicle,model,plate,viewer_hash,billing_day,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(sub,customer,'careEssential','car','Civic',value,await digest(cap),17,stamp,stamp),
  database.prepare('INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state,created_at,confirmed_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(cycle,sub,todaySP(),nextMonth(todaySP()),26000,1,1,0,1,'active',stamp,'legacy'),
  database.prepare('INSERT INTO quotes(id,reference,viewer_hash,payload_hash,customer_id,subscription_id,requested_cycle_id,credit_kind,kind,name,phone,vehicle,model,plate,selection_json,budget_json,total_cents,flexible,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(qid,'FF-LEG-'+qid.slice(0,8),await digest(qcap),token(),customer,sub,cycle,'essential','subscription_visit','Cliente anterior','5511900001590','car','Civic',value,JSON.stringify(state),JSON.stringify(budget),0,1,'accepted',stamp,stamp),
  database.prepare('INSERT INTO visits(id,cycle_id,quote_id,kind,status,visit_date,plate,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(scheduled,cycle,qid,'essential','scheduled',todaySP(),value,stamp,stamp),
  database.prepare('INSERT INTO visits(id,cycle_id,kind,status,visit_date,plate,plate_checked_at,plate_checked_by,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(completed,cycle,'premium','completed',todaySP(),value,stamp,'old-operator',stamp,stamp,stamp)
 ]);
 const snapshots={};for(const table of ['customers','cycles','payment_receipts','visits','admin_push_subscriptions','admin_push_jobs'])snapshots[table]=(await database.prepare('SELECT * FROM '+table).all()).results;
 await applyMigrations(database,{files:['0005_in_person_vehicle_registration.sql']});for(const [table,rows] of Object.entries(snapshots))assert.deepEqual((await database.prepare('SELECT * FROM '+table).all()).results,rows);
 let legacyCookie='',legacyCsrf='';async function invoke(path,{method='GET',body,admin=false,capability=cap}={}){const r=await legacy.dispatchFetch('http://localhost'+path,{method,headers:{Origin:'http://localhost',...(body?{'Content-Type':'application/json'}:{}),...(admin?{Cookie:legacyCookie,'X-FF-CSRF':legacyCsrf}:{Authorization:'Bearer '+capability})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),response:r};}
 let s=(await invoke('/api/subscriptions/'+sub)).data.subscription;assert.equal(s.plate,value);assert.equal(s.plateVerified,false);assert.equal(s.cycle.credits.premium.done,1);assert.equal(s.cycle.credits.essential.reserved,1);
 assert.equal((await invoke('/api/subscriptions/'+sub+'/requests',{method:'POST',body:selection({creditKind:'premium',plate:value})})).status,409);
 const login=await invoke('/api/admin/session',{method:'POST',body:{key}});legacyCookie=login.response.headers.get('Set-Cookie').split(';')[0];legacyCsrf=login.data.csrfToken;
 const confirmation=await invoke('/api/admin/subscriptions/'+sub+'/plate',{method:'PATCH',admin:true,body:{version:1,plate:value,confirm:true}});assert.equal(confirmation.status,200);s=confirmation.data.subscription;assert.equal(s.plateVerified,true);assert.equal(s.cycle.credits.premium.done,1);assert.equal(s.cycle.credits.essential.reserved,1);assert.equal(s.visits.find(x=>x.id===completed).plate,value);
 const current=(await invoke('/api/quotes/'+qid,{capability:qcap})).data.quote;assert.equal(current.plateVerified,true);const finish=await invoke('/api/admin/quotes/'+qid,{method:'PATCH',admin:true,body:{version:current.version,status:'completed',checkedPlate:value}});assert.equal(finish.status,200);
});

test('base 3.0 sem placas recebe cadastro presencial sem perder reserva nem inventar placa histórica',async t=>{
 const legacy=new Miniflare({modules:true,script:source,compatibilityDate:'2026-07-30',cf:false,bindings:{ADMIN_KEY:key},d1Databases:{DB:'registration-pre-plates'},log:new Log(LogLevel.ERROR)});t.after(()=>legacy.dispose());const database=await legacy.getD1Database('DB');await applyMigrations(database,{files:['0001_initial.sql','0002_security.sql','0003_admin_notifications.sql']});const ids=Array.from({length:5},()=>crypto.randomUUID()),[customer,sub,cycle,scheduled,completed]=ids,cap=token(),stamp=new Date().toISOString(),{nextMonth}=await import('../worker/domain.mjs');
 await database.batch([
  database.prepare('INSERT INTO customers(id,name,phone,vehicle,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(customer,'Cliente sem placa','5511900001591','car','Civic',stamp,stamp),
  database.prepare('INSERT INTO subscriptions(id,customer_id,plan_id,vehicle,model,viewer_hash,billing_day,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(sub,customer,'careEssential','car','Civic',await digest(cap),17,stamp,stamp),
  database.prepare('INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state,created_at,confirmed_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(cycle,sub,todaySP(),nextMonth(todaySP()),26000,1,1,0,1,'active',stamp,'legacy'),
  database.prepare('INSERT INTO visits(id,cycle_id,kind,status,visit_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(scheduled,cycle,'essential','scheduled',todaySP(),stamp,stamp),
  database.prepare('INSERT INTO visits(id,cycle_id,kind,status,visit_date,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(completed,cycle,'premium','completed',todaySP(),stamp,stamp,stamp)
 ]);await applyMigrations(database,{files:['0004_vehicle_plates.sql','0005_in_person_vehicle_registration.sql']});
 const login=await legacy.dispatchFetch('http://localhost/api/admin/session',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({key})}),auth=await login.json(),session=login.headers.get('Set-Cookie').split(';')[0];
 const r=await legacy.dispatchFetch('http://localhost/api/admin/subscriptions/'+sub+'/plate',{method:'PATCH',headers:{Origin:'http://localhost','Content-Type':'application/json',Cookie:session,'X-FF-CSRF':auth.csrfToken},body:JSON.stringify({version:1,plate:'LEG1A23',confirm:true})});assert.equal(r.status,200);const s=(await r.json()).subscription;assert.equal(s.cycle.credits.premium.done,1);assert.equal(s.cycle.credits.essential.reserved,1);assert.equal(s.visits.find(x=>x.id===scheduled).plate,'LEG1A23');assert.equal(s.visits.find(x=>x.id===completed).plate,null);assert.equal((await database.prepare('SELECT amount_cents FROM payment_receipts WHERE cycle_id=?').bind(cycle).first()).amount_cents,26000);
});
test('servidor calcula vitrificação de plásticos sem confiar em preço ou desconto enviados',async()=>{
 for(const [vehicle,service,total] of [['car','essential',320],['car','extra',1740],['moto','motoPremium',300]]){const {q}=await quote({vehicle,service,extras:['exteriorPlastic','plasticCoating'],total:1,plasticPrice:0});assert.equal(q.budget.total,total);assert.deepEqual(q.selection.extras,['plasticCoating']);}
 const c=await care(),extra=await request(c,{extras:['plasticCoating'],total:0});assert.equal(extra.status,201);assert.equal(extra.data.quote.budget.total,220);assert.equal(extra.data.quote.budget.items[0].price,0);
});
