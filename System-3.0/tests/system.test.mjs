import {fixturePlate,vehicleFixture} from './helpers/plates.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {nextMonth,todaySP} from '../worker/domain.mjs';
import {planVisitQuote} from '../dist/assets/catalog.mjs';
let mf,db,cookie,csrf,ip=1;
import {applyMigrations} from './helpers/database.mjs';
const key='test-only-64-character-admin-key-used-in-local-integration-tests-01';
const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const date=todaySP();
async function call(path,{method='GET',body,auth=false,cap,origin='http://localhost',address}={}){
 await vehicleFixture(db,path,body);
 const res=await mf.dispatchFetch('http://localhost'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,'X-FF-CSRF':csrf}:{}),...(cap?{Authorization:'Bearer '+cap}:{}),Origin:origin,'CF-Connecting-IP':address||'192.0.2.'+(ip++%250)},body:body?JSON.stringify(body):undefined});
 const data=await res.json();return {status:res.status,data,res};
}
const selection=(overrides={})=>({vehicle:'car',mode:'single',service:'premium',plate:fixturePlate(),model:'Honda Civic de teste',name:'Cliente de teste',phone:'11900000001',date:'',time:'',flexibleDate:true,treatments:[],extras:[],ack:true,submissionToken:token(),...overrides});
before(async()=>{
 const bundle=await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',write:false,target:'es2022'});
 mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-07-30',cf:{country:'BR'},bindings:{ADMIN_KEY:key},d1Databases:{DB:'fine-form-test'},durableObjects:{LIVE:{className:'LiveUpdates',useSQLite:true}},log:new Log(LogLevel.ERROR)});
 db=await mf.getD1Database('DB');await applyMigrations(db);
 const login=await call('/api/admin/session',{method:'POST',body:{key}});assert.equal(login.status,200);cookie=login.res.headers.get('Set-Cookie').split(';')[0];csrf=login.data.csrfToken;
}, {timeout:30000});
after(async()=>{await mf?.dispose();});
test('D1 pronto, painel protegido, cookie seguro e origem validada',async()=>{
 const health=await call('/api/health');assert.equal(health.data.ready,true);
 assert.equal((await call('/api/admin/dashboard')).status,401);
 assert.equal((await call('/api/admin/dashboard',{auth:true})).status,200);
 assert.equal((await call('/api/admin/session',{method:'POST',origin:'https://outra-origem.example',body:{key}})).status,403);
 assert.equal((await call('/api/admin/session',{method:'POST',body:{key:'incorreta'}})).status,401);
 assert.match(cookie,/^ff_admin_dev=/);
});
test('preços são calculados no servidor, reenvio não duplica e links são privados',async()=>{
 const body=selection({treatments:['fullClean'],extras:['glassCare'],total:1});
 const one=await call('/api/quotes',{method:'POST',body});assert.equal(one.status,201);assert.equal(one.data.quote.budget.total,690);
 const retry=await call('/api/quotes',{method:'POST',body});assert.equal(retry.status,200);assert.equal(retry.data.quote.id,one.data.quote.id);
 const id=one.data.quote.id;assert.equal((await call('/api/quotes/'+id)).status,404);assert.equal((await call('/api/quotes/'+id,{cap:token()})).status,404);
 assert.equal((await call('/api/quotes/'+id,{cap:body.submissionToken})).status,200);
 assert.equal((await call('/api/quotes',{method:'POST',body:{...body,notes:'Outra escolha'}})).status,409);
});
test('pedido muda de status, mantém histórico e rejeita edição desatualizada',async()=>{
 const body=selection(),saved=await call('/api/quotes',{method:'POST',body}),id=saved.data.quote.id;
 const accepted=await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date,message:'Seu cuidado está confirmado.'}});assert.equal(accepted.status,200);assert.equal(accepted.data.quote.status,'accepted');
 assert.equal((await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:1,status:'declined',message:'Sem agenda.'}})).status,409);
 assert.equal((await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:2,status:'pending'}})).status,400);
 const timeline=await call('/api/quotes/'+id,{cap:body.submissionToken});assert.equal(timeline.data.events.length,2);
 assert.equal((await call('/api/admin/customers',{auth:true})).data.items.length>0,true);
});
test('orientação exige valor completo antes de aceitar',async()=>{
 const saved=await call('/api/quotes',{method:'POST',body:selection({mode:'guidance',extras:['glassCare']})}),id=saved.data.quote.id;
 assert.equal(saved.data.quote.budget.hasBase,false);
 assert.equal((await call('/api/admin/quotes/'+id,{auth:true,method:'PATCH',body:{version:1,status:'accepted'}})).status,400);
 const accepted=await call('/api/admin/quotes/'+id,{auth:true,method:'PATCH',body:{version:1,status:'accepted',confirmedTotal:340.50}});assert.equal(accepted.status,200);assert.equal(accepted.data.quote.confirmedTotal,340.5);
});
test('Care requer pagamento e oferece portal privado pelo pedido original',async()=>{
 const body=selection({mode:'plan',plan:'careEssential',phone:'11900000002'}),saved=await call('/api/quotes',{method:'POST',body}),id=saved.data.quote.id;
 assert.equal(saved.data.quote.budget.recurring,260);
 assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:id,paidConfirmed:true}})).status,400);
 await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:1,status:'accepted'}});
 assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:id}})).status,400);
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:id,paidConfirmed:true,startsOn:date}});assert.equal(active.status,201);
 const s=active.data.subscription;assert.equal(s.cycle.credits.premium.available,1);assert.equal(s.cycle.credits.essential.available,1);
 assert.equal((await call('/api/subscriptions/'+s.id)).status,404);
 assert.equal((await call('/api/subscriptions/'+s.id,{cap:body.submissionToken})).status,200);
 assert.equal((await call('/api/subscriptions/'+s.id,{cap:active.data.portalToken})).status,200);
 assert.equal((await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:id,paidConfirmed:true}})).status,409);
});
test('visita Care reserva saldo ao aceitar, extras separados, cancelamento restitui e conclusão consome',async()=>{
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Teste de saldo',phone:'11900000003',model:'Toyota teste',planId:'careEssential',paidConfirmed:true,startsOn:date}});assert.equal(active.status,201);
 const s=active.data.subscription,cap=active.data.portalToken;
 const request=selection({creditKind:'premium',extras:['glassCare']});const saved=await call('/api/subscriptions/'+s.id+'/requests',{method:'POST',cap,body:request});assert.equal(saved.status,201);assert.equal(saved.data.quote.budget.total,160);
 const q=saved.data.quote;
 const accepted=await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});assert.equal(accepted.status,200);
 let view=(await call('/api/subscriptions/'+s.id,{cap})).data.subscription;assert.equal(view.cycle.credits.premium.reserved,1);assert.equal(view.cycle.credits.premium.available,0);
 assert.equal((await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',date,status:'completed'}})).status,409);
 const cancel=await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:2,status:'cancelled',message:'Reagendaremos outro dia.'}});assert.equal(cancel.status,200);
 view=(await call('/api/subscriptions/'+s.id,{cap})).data.subscription;assert.equal(view.cycle.credits.premium.available,1);
 const done=await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',date,status:'completed'}});assert.equal(done.status,201);assert.equal(done.data.subscription.cycle.credits.premium.done,1);
});
test('dois agendamentos concorrentes não usam o mesmo crédito',async()=>{
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Concorrência teste',phone:'11900000004',model:'Fiat teste',planId:'careEssential',paidConfirmed:true,startsOn:date}}),s=active.data.subscription;
 const results=await Promise.all([1,2].map(()=>call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'essential',date,status:'completed'}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
});
test('renova sem sobreposição, pré-pagamento não substitui saldo atual e exclusão exige cancelamento',async()=>{
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Renovação teste',phone:'11900000005',model:'Nissan teste',planId:'careEssential',paidConfirmed:true,startsOn:date}}),s=active.data.subscription;
 assert.equal((await call('/api/admin/subscriptions/'+s.id+'/renew',{method:'POST',auth:true,body:{version:1,paidConfirmed:true,startsOn:date}})).status,400);
 const renewed=await call('/api/admin/subscriptions/'+s.id+'/renew',{method:'POST',auth:true,body:{version:1,paidConfirmed:true}});assert.equal(renewed.status,200);assert.equal(renewed.data.subscription.history.length,2);assert.equal(renewed.data.subscription.cycle.starts_on,date);
 assert.equal((await call('/api/admin/subscriptions/'+s.id,{method:'DELETE',auth:true,body:{version:2,confirm:true}})).status,400);
 const paused=await call('/api/admin/subscriptions/'+s.id,{method:'PATCH',auth:true,body:{version:2,status:'paused'}});assert.equal(paused.status,200);
 assert.equal((await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',date}})).status,400);
 const cancelled=await call('/api/admin/subscriptions/'+s.id,{method:'PATCH',auth:true,body:{version:3,status:'cancelled'}});assert.equal(cancelled.status,200);
 assert.equal((await call('/api/admin/subscriptions/'+s.id,{method:'DELETE',auth:true,body:{version:4,confirm:true}})).status,200);
 assert.equal((await call('/api/subscriptions/'+s.id,{cap:active.data.portalToken})).status,404);
});
test('WebSocket exige autorização e entrega atualização após mudar pedido',async()=>{
 const body=selection(),saved=await call('/api/quotes',{method:'POST',body}),q=saved.data.quote;
 assert.equal((await call('/api/realtime-ticket',{method:'POST',body:{scope:'quote',id:q.id}})).status,404);
 const ticket=await call('/api/realtime-ticket',{method:'POST',cap:body.submissionToken,body:{scope:'quote',id:q.id}});assert.equal(ticket.status,200);
 const response=await mf.dispatchFetch('http://localhost/api/realtime?ticket='+encodeURIComponent(ticket.data.ticket),{headers:{Upgrade:'websocket',Origin:'http://localhost'}});
 assert.equal(response.status,101);const ws=response.webSocket;ws.accept();
 const message=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebSocket não notificou')),5000);ws.addEventListener('message',event=>{if(event.data==='pong')return;clearTimeout(timer);resolve(JSON.parse(event.data));},{once:true});});
 await call('/api/admin/quotes/'+q.id,{auth:true,method:'PATCH',body:{version:1,status:'declined',message:'Vamos combinar outra data.'}});
 assert.deepEqual(await message,{type:'changed'});ws.close();
});
test('rejeita conteúdo inválido e exporta registros reais do D1',async()=>{
 assert.equal((await call('/api/quotes',{method:'POST',body:selection({website:'spam'})})).status,400);
 assert.equal((await call('/api/quotes',{method:'POST',body:selection({ack:false})})).status,400);
 assert.equal((await call('/api/quotes',{method:'POST',body:selection({extras:['inexistente']})})).status,400);
 assert.equal((await call('/api/admin/export',{auth:true})).data.version,'3.0.0');
 const list=await call('/api/admin/subscriptions',{auth:true});assert.equal(list.status,200);assert.ok(list.data.items.length);
 assert.equal((await call('/api/admin/agenda',{auth:true})).status,200);
});
test('limite de tentativas de acesso',async()=>{let last;for(let i=0;i<9;i++)last=await call('/api/admin/session',{method:'POST',body:{key:'errada'},address:'198.51.100.99'});assert.equal(last.status,429);});
test('datas de ciclo conservam dia de cobrança e crédito aplica preparação uma vez',()=>{
 assert.equal(nextMonth('2027-01-31',31),'2027-02-28');assert.equal(nextMonth('2027-02-28',31),'2027-03-31');assert.equal(nextMonth('2028-01-31',31),'2028-02-29');
 assert.equal(planVisitQuote({vehicle:'car',mode:'single',service:'premium',treatments:['fullClean'],extras:[]}).total,350);
});

test('reenvio manual preserva uma lavagem e reenvio da visita aceita mantém o pedido',async()=>{
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Reenvio teste',phone:'11900000006',model:'BMW teste',planId:'careFrequent',paidConfirmed:true,startsOn:date}}),s=active.data.subscription;
 const body={operationId:crypto.randomUUID(),kind:'essential',date,status:'completed',cycleId:s.cycle.id};
 assert.equal((await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body})).status,201);
 const retry=await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body});assert.equal(retry.status,201);assert.equal(retry.data.subscription.cycle.credits.essential.done,1);assert.equal(retry.data.subscription.cycle.credits.essential.available,2);
 const visitBody=selection({creditKind:'premium'}),quote=await call('/api/subscriptions/'+s.id+'/requests',{method:'POST',cap:active.data.portalToken,body:visitBody});assert.equal(quote.status,201);
 const id=quote.data.quote.id;await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
 const again=await call('/api/subscriptions/'+s.id+'/requests',{method:'POST',cap:active.data.portalToken,body:visitBody});assert.equal(again.status,200);assert.equal(again.data.quote.id,id);
});
test('reagendamento sincroniza visita e bloqueia conclusão futura ou fora do ciclo',async()=>{
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Agenda teste',phone:'11900000007',model:'Audi teste',planId:'careEssential',paidConfirmed:true,startsOn:date}}),s=active.data.subscription,cap=active.data.portalToken;
 const saved=await call('/api/subscriptions/'+s.id+'/requests',{method:'POST',cap,body:selection({creditKind:'premium'})}),id=saved.data.quote.id;
 await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
 const tomorrow=new Date(new Date(date+'T12:00:00Z').getTime()+86400000).toISOString().slice(0,10);
 const changed=await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:2,scheduledDate:tomorrow,scheduledTime:'10:00'}});assert.equal(changed.status,200);
 const view=(await call('/api/subscriptions/'+s.id,{cap})).data.subscription;assert.equal(view.visits[0].date,tomorrow);assert.equal(view.visits[0].time,'10:00');
 assert.equal((await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:3,status:'completed'}})).status,400);
 assert.equal((await call('/api/admin/quotes/'+id,{method:'PATCH',auth:true,body:{version:3,scheduledDate:s.cycle.ends_on}})).status,400);
});
test('cliente que retorna após intervalo ganha um mês a partir da nova data',async()=>{
 const old=String(Number(date.slice(0,4))-1)+'-01-31';
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Intervalo teste',phone:'11900000008',model:'Peugeot teste',planId:'careEssential',paidConfirmed:true,startsOn:old}}),s=active.data.subscription;
 const renewed=await call('/api/admin/subscriptions/'+s.id+'/renew',{method:'POST',auth:true,body:{version:1,paidConfirmed:true}});assert.equal(renewed.status,200);assert.equal(renewed.data.subscription.cycle.starts_on,date);assert.equal(renewed.data.subscription.cycle.ends_on,nextMonth(date));
});
test('novos links revogam as capacidades anteriores e produção exige o autenticador',async()=>{
 const body=selection(),saved=await call('/api/quotes',{method:'POST',body}),id=saved.data.quote.id;
 const reissued=await call('/api/admin/quotes/'+id+'/link',{method:'POST',auth:true,body:{}});assert.equal(reissued.status,200);
 assert.equal((await call('/api/quotes/'+id,{cap:body.submissionToken})).status,404);
 assert.equal((await call('/api/quotes/'+id,{cap:reissued.data.trackingToken})).status,200);
 const res=await mf.dispatchFetch('https://fine-form.test/api/admin/session',{method:'POST',headers:{Origin:'https://fine-form.test','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.50'},body:JSON.stringify({key})});assert.equal(res.status,503);assert.equal(res.headers.get('Set-Cookie'),null);
});

test('exclusão de pedido exige painel, mesma origem, confirmação e versão atual',async()=>{
 const body=selection({phone:'11900000701'}),q=(await call('/api/quotes',{method:'POST',body})).data.quote;
 const url='/api/admin/quotes/'+q.id;
 assert.equal((await call(url,{method:'DELETE',cap:body.submissionToken,body:{version:1,confirm:true}})).status,401);
 assert.equal((await call(url,{method:'DELETE',auth:true,origin:'https://outra-origem.example',body:{version:1,confirm:true}})).status,403);
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{version:1}})).status,400);
 await call(url,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{version:1,confirm:true}})).status,409);
 const before=(await call(url,{auth:true})).data;assert.equal(before.quote.version,2);
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{version:2,confirm:true}})).status,200);
 assert.equal((await call('/api/quotes/'+q.id,{cap:body.submissionToken})).status,404);
 assert.equal((await call(url,{auth:true})).status,404);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM quote_events WHERE quote_id=?').bind(q.id).first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM customers WHERE id=?').bind(before.quote.customerId).first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM audit_events WHERE entity_id=? AND action=\'deleted\'').bind(q.id).first()).n,1);
});
test('excluir visita reservada ou concluída devolve saldo e mantém Care e outras lavagens',async()=>{
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente para limpar visitas',phone:'11900000702',model:'Teste',planId:'careEssential',paidConfirmed:true,startsOn:date}})).data;
 const s=active.subscription,cap=active.portalToken;
 await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'essential',date,status:'completed'}});
 for(const completed of [false,true]){
  const q=(await call('/api/subscriptions/'+s.id+'/requests',{method:'POST',cap,body:selection({creditKind:'premium'})})).data.quote;
  await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
  if(completed)await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:2,status:'completed'}});
  assert.equal((await call('/api/subscriptions/'+s.id,{cap})).data.subscription.cycle.credits.premium.available,0);
  assert.equal((await call('/api/admin/quotes/'+q.id,{method:'DELETE',auth:true,body:{version:completed?3:2,confirm:true}})).status,200);
  const view=(await call('/api/subscriptions/'+s.id,{cap})).data.subscription;
  assert.equal(view.cycle.credits.premium.available,1);assert.equal(view.cycle.credits.premium.done,0);assert.equal(view.cycle.credits.essential.done,1);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM visits WHERE quote_id=?').bind(q.id).first()).n,0);
 }
});
test('excluir pedido que originou Care preserva assinatura, pagamento, portal e cliente',async()=>{
 const body=selection({mode:'plan',plan:'careEssential',phone:'11900000703'}),q=(await call('/api/quotes',{method:'POST',body})).data.quote;
 await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted'}});
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:q.id,paidConfirmed:true,startsOn:date}})).data;
 assert.equal((await call('/api/admin/quotes/'+q.id,{method:'DELETE',auth:true,body:{version:3,confirm:true}})).status,200);
 const s=(await call('/api/admin/subscriptions/'+active.subscription.id,{auth:true})).data.subscription;
 assert.equal(s.originQuoteId,null);assert.equal(s.version,2);assert.equal(Boolean(s.cycle.paid),true);assert.equal(s.history.length,1);
 assert.equal((await call('/api/subscriptions/'+s.id,{cap:active.portalToken})).status,200);
 assert.equal((await call('/api/subscriptions/'+s.id,{cap:body.submissionToken})).status,404);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM customers WHERE id=?').bind(s.customerId).first()).n,1);
});
test('cliente excluído remove todos os seus registros, inclusive pedido pendente com mesmo telefone, e preserva outros clientes',async()=>{
 const phone='11900000704',capBody=selection({phone,mode:'plan',plan:'careEssential'}),q=(await call('/api/quotes',{method:'POST',body:capBody})).data.quote;
 await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted'}});
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:q.id,paidConfirmed:true,startsOn:date}})).data;
 const s=active.subscription;
 await call('/api/admin/subscriptions/'+s.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',date,status:'completed'}});
 const pending=(await call('/api/quotes',{method:'POST',body:selection({phone})})).data.quote;
 const other=(await call('/api/quotes',{method:'POST',body:selection({phone:'11900000705'})})).data.quote;
 const url='/api/admin/customers/'+s.customerId;
 assert.equal((await call(url)).status,401);
 const preview=(await call(url,{auth:true})).data;assert.deepEqual(preview.counts,{quotes:2,subscriptions:1,cycles:1,visits:1});
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{snapshot:preview.snapshot}})).status,400);
 assert.equal((await call(url,{method:'DELETE',auth:true,origin:'https://outra-origem.example',body:{snapshot:preview.snapshot,confirm:true}})).status,403);
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{snapshot:preview.snapshot,confirm:true}})).status,200);
 for(const [path,cap] of [['/api/subscriptions/'+s.id,active.portalToken],['/api/quotes/'+q.id,capBody.submissionToken]])assert.equal((await call(path,{cap})).status,404);
 assert.equal((await call('/api/admin/quotes/'+pending.id,{auth:true})).status,404);
 assert.equal((await call('/api/admin/quotes/'+other.id,{auth:true})).status,200);
 assert.equal((await call(url,{auth:true})).status,404);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM cycles WHERE subscription_id=?').bind(s.id).first()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM visits WHERE cycle_id=?').bind(s.cycle.id).first()).n,0);
 for(const id of [q.id,pending.id])assert.equal((await db.prepare('SELECT COUNT(*) n FROM quote_events WHERE quote_id=?').bind(id).first()).n,0);
});
test('exclusão do cliente rejeita confirmação antiga quando chegam pedidos ou mudam visitas',async()=>{
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente com alteração',phone:'11900000706',model:'Teste',planId:'careEssential',paidConfirmed:true,startsOn:date}})).data;
 const url='/api/admin/customers/'+active.subscription.customerId;
 const old=(await call(url,{auth:true})).data;
 await call('/api/quotes',{method:'POST',body:selection({phone:'11900000706'})});
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{confirm:true,snapshot:old.snapshot}})).status,409);
 const updated=(await call(url,{auth:true})).data;
 await call('/api/admin/subscriptions/'+active.subscription.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',date,status:'completed'}});
 assert.equal((await call(url,{method:'DELETE',auth:true,body:{confirm:true,snapshot:updated.snapshot}})).status,409);
 assert.equal((await call('/api/subscriptions/'+active.subscription.id,{cap:active.portalToken})).data.subscription.cycle.credits.premium.done,1);
});
test('falha na exclusão desfaz toda a transação, sem perder visita nem alterar pedido',async()=>{
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente rollback',phone:'11900000707',model:'Teste',planId:'careEssential',paidConfirmed:true,startsOn:date}})).data;
 const q=(await call('/api/subscriptions/'+active.subscription.id+'/requests',{method:'POST',cap:active.portalToken,body:selection({creditKind:'premium'})})).data.quote;
 await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
 await db.prepare("CREATE TRIGGER block_test_deletion BEFORE DELETE ON quotes WHEN OLD.id='"+q.id+"' BEGIN SELECT RAISE(ABORT,'test rollback'); END").run();
 try{
  assert.equal((await call('/api/admin/quotes/'+q.id,{method:'DELETE',auth:true,body:{version:2,confirm:true}})).status,500);
  assert.equal((await call('/api/admin/quotes/'+q.id,{auth:true})).data.quote.version,2);
  assert.equal((await call('/api/subscriptions/'+active.subscription.id,{cap:active.portalToken})).data.subscription.cycle.credits.premium.reserved,1);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM audit_events WHERE entity_id=? AND action=\'deleted\'').bind(q.id).first()).n,0);
  const preview=(await call('/api/admin/customers/'+active.subscription.customerId,{auth:true})).data;
  assert.equal((await call('/api/admin/customers/'+active.subscription.customerId,{method:'DELETE',auth:true,body:{confirm:true,snapshot:preview.snapshot}})).status,500);
  assert.equal((await call('/api/subscriptions/'+active.subscription.id,{cap:active.portalToken})).status,200);
  assert.equal((await call('/api/admin/quotes/'+q.id,{auth:true})).data.quote.version,2);
 }finally{await db.prepare('DROP TRIGGER block_test_deletion').run();}
});
test('ativação e exclusão concorrentes não deixam assinatura com pedido de origem inexistente',async()=>{
 for(let i=0;i<3;i++){
  const q=(await call('/api/quotes',{method:'POST',body:selection({mode:'plan',plan:'careEssential',phone:'1190000071'+i})})).data.quote;
  await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted'}});
  const results=await Promise.all([
   call('/api/admin/quotes/'+q.id,{method:'DELETE',auth:true,body:{version:2,confirm:true}}),
   call('/api/admin/subscriptions',{method:'POST',auth:true,body:{quoteId:q.id,paidConfirmed:true,startsOn:date}})
  ]);
  assert.ok([200,409].includes(results[0].status));assert.ok([201,404,409].includes(results[1].status));
  const orphan=await db.prepare('SELECT COUNT(*) n FROM subscriptions WHERE origin_quote_id=? AND NOT EXISTS(SELECT 1 FROM quotes WHERE id=origin_quote_id)').bind(q.id).first();assert.equal(orphan.n,0);
  if(results[1].status===201)assert.equal(results[0].status,409);
 }
});
test('excluir pedido notifica acompanhamento e saldo do Care em tempo real',async()=>{
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente ao vivo',phone:'11900000720',model:'Teste',planId:'careEssential',paidConfirmed:true,startsOn:date}})).data;
 const body=selection({creditKind:'premium'}),q=(await call('/api/subscriptions/'+active.subscription.id+'/requests',{method:'POST',cap:active.portalToken,body})).data.quote;
 await call('/api/admin/quotes/'+q.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}});
 const sockets=[],messages=[];
 for(const [scope,id,cap] of [['quote',q.id,body.submissionToken],['subscription',active.subscription.id,active.portalToken]]){
  const ticket=(await call('/api/realtime-ticket',{method:'POST',cap,body:{scope,id}})).data.ticket;
  const response=await mf.dispatchFetch('http://localhost/api/realtime?ticket='+encodeURIComponent(ticket),{headers:{Upgrade:'websocket',Origin:'http://localhost'}});assert.equal(response.status,101);
  const ws=response.webSocket;ws.accept();sockets.push(ws);
  messages.push(new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Exclusão não notificou '+scope)),5000);ws.addEventListener('message',event=>{clearTimeout(timer);resolve(JSON.parse(event.data));},{once:true});}));
 }
 try{assert.equal((await call('/api/admin/quotes/'+q.id,{method:'DELETE',auth:true,body:{version:2,confirm:true}})).status,200);assert.deepEqual(await Promise.all(messages),[{type:'changed'},{type:'changed'}]);}
 finally{sockets.forEach(ws=>ws.close());}
});
test('alteração entre conferência e transação bloqueia a exclusão inteira do cliente',async()=>{
 const active=(await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Cliente entre etapas',phone:'11900000721',model:'Teste',planId:'careEssential',paidConfirmed:true,startsOn:date}})).data;
 const id=active.subscription.customerId,preview=(await call('/api/admin/customers/'+id,{auth:true})).data;
 const {deleteCustomer}=await import('../worker/deletions.mjs');let batches=0,newQuote;
 const env={DB:{prepare:sql=>db.prepare(sql),batch:async statements=>{
  batches++;if(batches===3)newQuote=(await call('/api/quotes',{method:'POST',body:selection({phone:'11900000721'})})).data.quote;
  return db.batch(statements);
 }}};
 await assert.rejects(()=>deleteCustomer(env,id,{confirm:true,snapshot:preview.snapshot}),error=>error.status===409);
 assert.equal((await call('/api/subscriptions/'+active.subscription.id,{cap:active.portalToken})).status,200);
 assert.equal((await call('/api/admin/quotes/'+newQuote.id,{auth:true})).status,200);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM audit_events WHERE entity_id=? AND action=\'deleted\'').bind(id).first()).n,0);
});

test('visão geral mantém indicadores operacionais sem total financeiro e preserva os recibos',async()=>{
 const before=(await call('/api/admin/dashboard',{auth:true})).data;
 const active=await call('/api/admin/subscriptions',{method:'POST',auth:true,body:{name:'Teste visão geral',phone:'11900000983',model:'Veículo visão geral',planId:'careEssential',paidConfirmed:true,startsOn:date}});
 assert.equal(active.status,201);const sub=active.data.subscription;
 const visit=await call('/api/admin/subscriptions/'+sub.id+'/visits',{method:'POST',auth:true,body:{kind:'premium',status:'completed',date,operationId:crypto.randomUUID()}});
 assert.equal(visit.status,201);
 const quote=await call('/api/quotes',{method:'POST',body:selection({phone:'11900000984'})});assert.equal(quote.status,201);
 assert.equal((await call('/api/admin/quotes/'+quote.data.quote.id,{method:'PATCH',auth:true,body:{version:1,status:'accepted',scheduledDate:date}})).status,200);
 const receipts=await db.prepare('SELECT * FROM payment_receipts ORDER BY id').all();
 const dashboard=await call('/api/admin/dashboard',{auth:true});assert.equal(dashboard.status,200);
 assert.equal(Object.hasOwn(dashboard.data,'monthlyPayments'),false);
 assert.deepEqual(Object.keys(dashboard.data).sort(),['activeSubscriptions','expiring','quotes','today','todayVisits']);
 assert.equal(dashboard.data.activeSubscriptions,before.activeSubscriptions+1);
 assert.equal(dashboard.data.todayVisits,before.todayVisits+2);
 assert.equal(dashboard.data.quotes.accepted,(before.quotes.accepted||0)+1);
 assert.deepEqual(dashboard.data.expiring,before.expiring);
 assert.deepEqual((await db.prepare('SELECT * FROM payment_receipts ORDER BY id').all()).results,receipts.results);
 assert.equal(receipts.results.find(r=>r.cycle_id===sub.cycle.id).amount_cents,26000);
});
