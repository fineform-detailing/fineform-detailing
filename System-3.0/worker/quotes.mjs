import {fail,validateSelection,transitions,text,idValid,validDate,todaySP,matchPlate} from './domain.mjs';
import {digest,randomToken,limit} from './security.mjs';
import {now,uuid,stmt,first,all,getQuote,quoteView,checkVersion,customerFor} from './store.mjs';
import {requireRegisteredVehicle} from './plates.mjs';
import {queuePushStatement} from './push.mjs';
import {queueReviewPushStatement} from './reviews.mjs';
export async function saveQuote(env,{state,budget,token,subscription=null,cycle=null,creditKind=null}){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))fail(400,'Reabra o formulário para gerar seu link de acompanhamento.');
 // Phase is server metadata, not a change to the customer's requested budget.
 const comparableState={...state};delete comparableState.requestStage;
 const hash=await digest(token),payloadHash=await digest(JSON.stringify({state:comparableState,subscription:subscription?.id||null,cycle:cycle?.id||null,creditKind}));
 const existing=await first(env,'SELECT * FROM quotes WHERE viewer_hash=?',hash);
 if(existing){if(existing.payload_hash!==payloadHash)fail(409,'Este envio já foi usado para outro pedido. Recomece o formulário.');return {quote:quoteView(existing),duplicate:true};}
 const id=uuid(),stamp=now(),reference='FF-'+id.slice(0,8).toUpperCase();
 const kind=subscription?'subscription_visit':state.mode;
 const inserts=[stmt(env,`INSERT INTO quotes(id,reference,viewer_hash,payload_hash,customer_id,subscription_id,requested_cycle_id,credit_kind,kind,name,phone,vehicle,model,plate,plate_verified_at,plate_verified_by,selection_json,budget_json,total_cents,preferred_date,preferred_time,flexible,notes,created_at,updated_at) VALUES (${Array(25).fill('?').join(',')})`,id,reference,hash,payloadHash,subscription?.customer_id||null,subscription?.id||null,cycle?.id||null,creditKind,kind,state.name,state.phone,state.vehicle,state.model,state.plate||null,subscription?.plate_verified_at||null,subscription?.plate_verified_by||null,JSON.stringify(state),JSON.stringify(budget),budget.hasBase?Math.round(budget.total*100):null,state.date||null,state.time||null,state.flexibleDate?1:0,state.notes,stamp,stamp),stmt(env,'INSERT INTO quote_events(id,quote_id,status,message,created_at) VALUES (?,?,?,?,?)',uuid(),id,'pending','Pedido recebido pela Fine Form.',stamp)];
 const push=await queuePushStatement(env,id);if(push)inserts.push(push);
 try{await env.DB.batch(inserts);}catch(err){const duplicate=await first(env,'SELECT * FROM quotes WHERE viewer_hash=?',hash);if(duplicate&&duplicate.payload_hash===payloadHash)return {quote:quoteView(duplicate),duplicate:true};throw err;}
 return {quote:quoteView(await getQuote(env,id)),duplicate:false};
}
export async function publicQuote(req,env,body){
 if(body.website)fail(400,'Não foi possível receber este pedido.');
 if(body.ack!==true)fail(400,'Confirme o envio dos seus dados para a Fine Form.');
 await limit(req,env,'quote',8);
 const {state,budget}=validateSelection(body);
 return saveQuote(env,{state,budget,token:body.submissionToken});
}
export async function updateQuote(env,id,body){
 const q=await getQuote(env,id);checkVersion(body,q);
 const desired=text(body.status,20),changing=desired&&desired!==q.status;
 if(changing&&!transitions[q.status].includes(desired))fail(400,'Essa mudança de status não é permitida.');
 const status=desired||q.status,op=uuid(),stamp=now();
 let date=body.scheduledDate===undefined?q.scheduled_date:text(body.scheduledDate,10)||null;
 let time=body.scheduledTime===undefined?q.scheduled_time:text(body.scheduledTime,5)||null;
 if(date&&!validDate(date))fail(400,'Data de atendimento inválida.');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail(400,'Horário inválido.');
 const message=body.message===undefined?q.public_message:text(body.message,600),internal=body.internalNote===undefined?q.internal_note:text(body.internalNote,600);
 let confirmed=q.confirmed_total_cents;
 if(body.confirmedTotal!==undefined){
  if(body.confirmedTotal===null)confirmed=null;
  else{const amount=body.confirmedTotal;if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100000||Math.abs(amount*100-Math.round(amount*100))>0.000001)fail(400,'Valor confirmado inválido. Use até duas casas decimais.');confirmed=Math.round(amount*100);}
 }
 if(q.kind==='guidance'&&status==='accepted'&&confirmed===null)fail(400,'Defina o valor completo antes de aceitar o pedido de orientação.');
 if(changing&&['declined','cancelled'].includes(status)&&!message)fail(400,'Explique ao cliente o motivo dessa atualização.');
 if(status==='completed'&&date&&date>todaySP())fail(400,'Não conclua um atendimento futuro.');
 let checkedAt=q.plate_checked_at||null,checkedBy=q.plate_checked_by||null,verifiedAt=q.plate_verified_at||null,verifiedBy=q.plate_verified_by||null;
 if(q.kind!=='subscription_visit'&&changing&&['in_progress','ready','completed'].includes(status))requireRegisteredVehicle(q);
 if(q.kind==='subscription_visit'&&changing&&status==='accepted'){const s=await first(env,'SELECT * FROM subscriptions WHERE id=?',q.subscription_id);requireRegisteredVehicle(s);matchPlate(q.plate,s.plate);verifiedAt=s.plate_verified_at;verifiedBy=s.plate_verified_by;}
 if(q.kind==='subscription_visit'&&changing&&['in_progress','ready','completed'].includes(status)){
  const s=await first(env,'SELECT * FROM subscriptions WHERE id=?',q.subscription_id);
  requireRegisteredVehicle(s);verifiedAt=s.plate_verified_at;verifiedBy=s.plate_verified_by;matchPlate(q.plate,s.plate);matchPlate(body.checkedPlate,q.plate);checkedAt=stamp;checkedBy=env.ADMIN_SESSION?.id||'server';
 }
 let customerId=q.customer_id;
 if(changing&&status==='accepted'&&!customerId)customerId=(await customerFor(env,q)).id;
 const batch=[];let needsVisit=false;
 const linked=q.subscription_id?await first(env,'SELECT v.*,c.starts_on,c.ends_on FROM visits v JOIN cycles c ON c.id=v.cycle_id WHERE v.quote_id=?',id):null;
 if(linked&&linked.status!=='cancelled'){
  date=date||linked.visit_date;time=time||linked.visit_time;
  if(date<linked.starts_on||date>=linked.ends_on)fail(400,'A visita precisa permanecer dentro do ciclo contratado.');
  if(status==='completed'&&date>todaySP())fail(400,'Não conclua uma lavagem futura.');
 }

 if(q.kind==='subscription_visit'&&changing&&status==='accepted'){
  needsVisit=true;date=date||q.preferred_date||todaySP();time=time||q.preferred_time;
  batch.push(stmt(env,`INSERT INTO visits(id,cycle_id,quote_id,kind,status,visit_date,visit_time,created_at,updated_at,last_op,plate)
   SELECT ?,c.id,q.id,q.credit_kind,'scheduled',?,?,?, ?,?,q.plate FROM cycles c JOIN subscriptions s ON s.id=c.subscription_id JOIN quotes q ON q.id=?
   WHERE c.id=q.requested_cycle_id AND q.version=? AND q.status='pending' AND s.status='active' AND s.plate_verified_at IS NOT NULL AND s.plate=q.plate AND q.plate IS NOT NULL AND c.paid=1
   AND ?>=c.starts_on AND ?<c.ends_on AND c.ends_on>? AND
   (SELECT COUNT(*) FROM visits v WHERE v.cycle_id=c.id AND v.kind=q.credit_kind AND v.status!='cancelled') <
   CASE q.credit_kind WHEN 'premium' THEN c.premium_quota WHEN 'essential' THEN c.essential_quota ELSE c.moto_quota END`,uuid(),date,time,stamp,stamp,op,id,q.version,date,date,todaySP()));
 }
 batch.push(stmt(env,`UPDATE quotes SET status=?,public_message=?,internal_note=?,scheduled_date=?,scheduled_time=?,confirmed_total_cents=?,customer_id=?,plate_verified_at=?,plate_verified_by=?,plate_checked_at=?,plate_checked_by=?,version=version+1,last_op=?,updated_at=? WHERE id=? AND version=? ${needsVisit?'AND EXISTS (SELECT 1 FROM visits WHERE quote_id=quotes.id AND last_op=?)':''}`,status,message,internal,date,time,confirmed,customerId,verifiedAt,verifiedBy,checkedAt,checkedBy,op,stamp,id,q.version,...(needsVisit?[op]:[])));
 batch.push(stmt(env,'INSERT INTO quote_events(id,quote_id,status,message,created_at) SELECT ?,id,status,?,? FROM quotes WHERE id=? AND last_op=?',uuid(),changing?(message||'Status atualizado pela Fine Form.'):message||'Informações de atendimento atualizadas.',stamp,id,op));
 batch.push(stmt(env,'INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) SELECT ?,\'quote\',id,\'updated\',?,?,? FROM quotes WHERE id=? AND last_op=?',uuid(),JSON.stringify({status,confirmedTotalCents:confirmed}),stamp,env.ADMIN_SESSION?.id||'server',id,op));
 if(linked)batch.push(stmt(env,'UPDATE visits SET visit_date=?,visit_time=?,version=version+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM quotes WHERE id=? AND last_op=?)',date,time,stamp,linked.id,id,op));
 if(q.kind==='subscription_visit'&&changing&&['in_progress','completed','cancelled'].includes(status))batch.push(stmt(env,`UPDATE visits SET status=?,completed_at=?,plate_checked_at=?,plate_checked_by=?,version=version+1,last_op=?,updated_at=? WHERE quote_id=? AND status!='cancelled' AND EXISTS(SELECT 1 FROM quotes WHERE id=? AND last_op=?)`,status,status==='completed'?stamp:null,checkedAt,checkedBy,op,stamp,id,id,op));
 if(changing&&status==='completed'){const invitation=queueReviewPushStatement(env,id,{op});if(invitation)batch.push(invitation);}
 const results=await env.DB.batch(batch);const update=results[needsVisit?1:0];
 if(update.meta.changes!==1)fail(409,needsVisit?'O saldo ou ciclo da assinatura mudou. Atualize o pedido antes de aceitar.':'Este pedido mudou. Atualize e tente novamente.');
 return quoteView(await getQuote(env,id),true);
}
export async function quoteList(env,url){
 const status=url.searchParams.get('status')||'',search=text(url.searchParams.get('q'),60),limitSize=30;
 const page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0));
 if(status&&!Object.keys(transitions).includes(status))fail(400,'Filtro inválido.');
 const where=[],args=[];if(status){where.push('status=?');args.push(status);}if(search){where.push('(name LIKE ? OR phone LIKE ? OR reference LIKE ? OR plate LIKE ?)');args.push(search+'%',(search.replace(/\D/g,'')?search.replace(/\D/g,'')+'%':'__none__%'),search.toUpperCase()+'%',search.replace(/[\s-]/g,'').toUpperCase()+'%');}
 const filter=where.length?'WHERE '+where.join(' AND '):'';
 const rows=await all(env,`SELECT * FROM quotes ${filter} ORDER BY created_at DESC LIMIT ? OFFSET ?`,...args,limitSize+1,page*limitSize);
 return {items:rows.slice(0,limitSize).map(q=>quoteView(q,true)),page,hasMore:rows.length>limitSize};
}
