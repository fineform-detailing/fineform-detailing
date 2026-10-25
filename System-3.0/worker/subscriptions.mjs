import {fail,findPlan,quotasFor,nextMonth,todaySP,text,validDate,phoneOf,validateSelection,quoteFor,idValid,requirePlate,matchPlate} from './domain.mjs';
import {randomToken,digest,limit} from './security.mjs';
import {stmt,first,all,now,uuid,getQuote,getSub,subView,customerFor,audit,checkVersion} from './store.mjs';
import {planVisitQuote} from '../dist/assets/catalog.mjs';
import {requireRegisteredVehicle} from './plates.mjs';
import {saveQuote} from './quotes.mjs';
import {queueReviewPushStatement} from './reviews.mjs';
export async function activateSubscription(env,body){
 if(body.paidConfirmed!==true)fail(400,'Confirme que o pagamento do ciclo foi recebido.');
 const origin=body.quoteId?await getQuote(env,body.quoteId):null;
 if(origin&&(origin.kind!=='plan'||origin.status!=='accepted'))fail(400,'Aceite o pedido de assinatura antes de ativar o plano.');
 if(origin?.subscription_id)fail(409,'Este pedido já tem uma assinatura.');
 const selection=origin?JSON.parse(origin.selection_json):null;
 const plan=findPlan(selection?.plan||body.planId);if(!plan)fail(400,'Plano inválido.');
 const data=origin?{name:origin.name,phone:origin.phone,vehicle:origin.vehicle,model:origin.model}:{name:text(body.name),phone:phoneOf(body.phone),vehicle:plan.vehicle,model:text(body.model)};
 if(origin){data.plate=requireRegisteredVehicle(origin);if(body.plate!==undefined)matchPlate(body.plate,origin.plate);}
 else{if(body.confirmVehicle!==true)fail(400,'Confira a placa pessoalmente no veículo e marque a confirmação do cadastro.');data.plate=requirePlate(body.plate);}
 if(data.name.length<2||data.model.length<2)fail(400,'Informe o nome e o veículo cadastrado.');
 const start=text(body.startsOn,10)||todaySP();if(!validDate(start))fail(400,'Data inicial inválida.');
 const customer=await customerFor(env,data),id=uuid(),cycleId=uuid(),token=randomToken(),stamp=now(),anchor=Number(start.slice(8)),quotas=quotasFor(plan.id),verifiedAt=origin?.plate_verified_at||stamp,verifiedBy=origin?.plate_verified_by||env.ADMIN_SESSION?.id||'server';
 const duplicate=await first(env,"SELECT id FROM subscriptions WHERE plate=? AND status!='cancelled'",data.plate);if(duplicate)fail(409,'Esta placa já tem uma assinatura ativa ou pausada.');
 const batch=[stmt(env,'INSERT INTO subscriptions(id,customer_id,origin_quote_id,plan_id,status,viewer_hash,billing_day,vehicle,model,plate,plate_verified_at,plate_verified_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,customer.id,origin?.id||null,plan.id,'active',await digest(token),anchor,data.vehicle,data.model,data.plate,verifiedAt,verifiedBy,stamp,stamp),stmt(env,'INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state,created_at,confirmed_by) VALUES (?,?,?,?,?,?,?,?,1,\'active\',?,?)',cycleId,id,start,nextMonth(start,anchor),plan.price*100,quotas.premium,quotas.essential,quotas.moto,stamp,env.ADMIN_SESSION?.id||'server')];
 if(origin){
  // A deletion or edit that won the race must not leave a newly activated Care behind.
  batch[0]=stmt(env,`INSERT INTO subscriptions(id,customer_id,origin_quote_id,plan_id,status,viewer_hash,billing_day,vehicle,model,plate,plate_verified_at,plate_verified_by,created_at,updated_at)
   SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM quotes WHERE id=? AND version=? AND status='accepted' AND subscription_id IS NULL`,id,customer.id,origin.id,plan.id,'active',await digest(token),anchor,data.vehicle,data.model,data.plate,verifiedAt,verifiedBy,stamp,stamp,origin.id,origin.version);
  batch[1]=stmt(env,`INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state,created_at,confirmed_by)
   SELECT ?,id,?,?,?,?,?,?,1,'active',?,? FROM subscriptions WHERE id=?`,cycleId,start,nextMonth(start,anchor),plan.price*100,quotas.premium,quotas.essential,quotas.moto,stamp,env.ADMIN_SESSION?.id||'server',id);
  batch.push(stmt(env,'UPDATE quotes SET subscription_id=?,customer_id=?,plate=?,selection_json=?,version=version+1,updated_at=? WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM subscriptions WHERE id=?)',id,customer.id,data.plate,JSON.stringify({...selection,plate:data.plate,plateVerified:true}),stamp,origin.id,origin.version,id));
 }
 try{const results=await env.DB.batch(batch);if(origin&&results[0].meta.changes!==1)fail(409,'Este pedido mudou ou foi excluído. Atualize antes de ativar o Care.');}catch(error){if(/UNIQUE/.test(error.message||''))fail(409,'Esse veículo ou pedido já tem uma assinatura.');throw error;}
 await audit(env,'subscription',id,'activated','Pagamento do primeiro ciclo confirmado manualmente.');
 return {subscription:await subView(env,await getSub(env,id),true),portalToken:token};
}
export async function renewSubscription(env,id,body){
 const s=await getSub(env,id);checkVersion(body,s);
 if(s.status!=='active')fail(400,'Reative o plano antes de renovar.');
 requireRegisteredVehicle(s);
 if(body.paidConfirmed!==true)fail(400,'Confirme o recebimento do pagamento.');
 const last=await first(env,'SELECT * FROM cycles WHERE subscription_id=? ORDER BY starts_on DESC LIMIT 1',id);
 const today=todaySP(),start=text(body.startsOn,10)||(last.ends_on>today?last.ends_on:today);
 if(!validDate(start)||start<last.ends_on)fail(400,'O novo ciclo não pode se sobrepor ao ciclo anterior.');
 const p=findPlan(s.plan_id),q=quotasFor(s.plan_id),op=uuid(),stamp=now(),anchor=start===last.ends_on?s.billing_day:Number(start.slice(8));
 const result=await env.DB.batch([
  stmt(env,'UPDATE subscriptions SET version=version+1,billing_day=?,last_op=?,updated_at=? WHERE id=? AND version=?',anchor,op,stamp,id,s.version),
  stmt(env,'INSERT INTO cycles(id,subscription_id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state,created_at,confirmed_by) SELECT ?,id,?,?,?,?,?,?,1,\'active\',?,? FROM subscriptions WHERE id=? AND last_op=?',uuid(),start,nextMonth(start,anchor),p.price*100,q.premium,q.essential,q.moto,stamp,env.ADMIN_SESSION?.id||'server',id,op),
  stmt(env,'UPDATE cycles SET state=\'closed\' WHERE subscription_id=? AND ends_on<=? AND EXISTS(SELECT 1 FROM subscriptions WHERE id=? AND last_op=?)',id,today,id,op)
 ]);
 if(result[0].meta.changes!==1)fail(409,'A assinatura mudou. Atualize antes de renovar.');
 await audit(env,'subscription',id,'renewed','Pagamento do novo ciclo confirmado manualmente.');
 return subView(env,await getSub(env,id),true);
}
export async function changeSubscription(env,id,body){
 const s=await getSub(env,id);checkVersion(body,s);const status=text(body.status,16);
 if(!['active','paused','cancelled'].includes(status))fail(400,'Status de assinatura inválido.');
 if(s.status==='cancelled'&&status!=='cancelled')fail(400,'Uma assinatura cancelada permanece no histórico. Crie um novo plano para esse veículo.');
 const r=await stmt(env,'UPDATE subscriptions SET status=?,version=version+1,updated_at=? WHERE id=? AND version=?',status,now(),id,s.version).run();if(r.meta.changes!==1)fail(409,'A assinatura mudou. Atualize e tente novamente.');
 await audit(env,'subscription',id,status);
 return subView(env,await getSub(env,id),true);
}
export async function deleteSubscription(env,id,body){
 const s=await getSub(env,id);checkVersion(body,s);if(s.status!=='cancelled'||body.confirm!==true)fail(400,'Cancele o plano e confirme a exclusão definitiva.');
 await env.DB.batch([stmt(env,'UPDATE quotes SET subscription_id=NULL WHERE subscription_id=?',id),stmt(env,'DELETE FROM subscriptions WHERE id=? AND status=\'cancelled\' AND version=?',id,s.version)]);
 await audit(env,'subscription',id,'deleted','Assinatura e histórico de visitas excluídos pelo operador.');return {deleted:true};
}
export async function recordVisit(env,id,body){
 const s=await getSub(env,id),kind=text(body.kind,16),status=body.status==='scheduled'?'scheduled':'completed';
 requireRegisteredVehicle(s);matchPlate(s.plate,s.plate);
 if(body.plate!==undefined)matchPlate(body.plate,s.plate);
 if(status==='completed')matchPlate(body.checkedPlate,s.plate);
 if(!['premium','essential','moto'].includes(kind))fail(400,'Tipo de lavagem inválido.');
 const cycle=body.cycleId?await first(env,'SELECT * FROM cycles WHERE id=? AND subscription_id=?',body.cycleId,id):await first(env,'SELECT * FROM cycles WHERE subscription_id=? AND starts_on<=? AND ends_on>? ORDER BY starts_on DESC LIMIT 1',id,todaySP(),todaySP());
 if(!cycle)fail(400,'Não há um ciclo disponível para essa lavagem.');
 const date=text(body.date,10)||todaySP(),time=text(body.time,5)||null;
 if(!validDate(date)||date<cycle.starts_on||date>=cycle.ends_on)fail(400,'A lavagem precisa estar dentro do período do ciclo.');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail(400,'Horário inválido.');
 if(status==='completed'&&date>todaySP())fail(400,'Não registre como concluída uma lavagem futura.');
 if(status==='scheduled'&&date<todaySP())fail(400,'Não agende uma visita no passado.');
 if(s.status!=='active'||!cycle.paid)fail(400,'O plano precisa estar ativo e o ciclo pago.');
 if(body.operationId&&!idValid(body.operationId))fail(400,'Identificador de operação inválido.');
 const visitId=body.operationId||uuid(),stamp=now();
 const previous=await first(env,'SELECT v.*,c.subscription_id FROM visits v JOIN cycles c ON c.id=v.cycle_id WHERE v.id=?',visitId);
 if(previous){if(previous.subscription_id!==id||previous.cycle_id!==cycle.id||previous.kind!==kind||previous.visit_date!==date||previous.visit_time!==time)fail(409,'Essa operação já foi usada para outro registro.');return subView(env,s,true);}

 const r=await stmt(env,`INSERT INTO visits(id,cycle_id,kind,status,visit_date,visit_time,note,completed_at,created_at,updated_at,plate,plate_checked_at,plate_checked_by)
  SELECT ?,id,?,?,?,?,?,?,?,?,?,?,? FROM cycles WHERE id=? AND paid=1 AND
  (SELECT COUNT(*) FROM visits WHERE cycle_id=cycles.id AND kind=? AND status!='cancelled') <
  CASE ? WHEN 'premium' THEN premium_quota WHEN 'essential' THEN essential_quota ELSE moto_quota END`,visitId,kind,status,date,time,text(body.note,300),status==='completed'?stamp:null,stamp,stamp,s.plate,status==='completed'?stamp:null,status==='completed'?(env.ADMIN_SESSION?.id||'server'):null,cycle.id,kind,kind).run();
 if(r.meta.changes!==1)fail(409,'Não há mais saldo desse tipo de lavagem no ciclo.');
 await audit(env,'visit',visitId,status);return subView(env,s,true);
}
export async function updateVisit(env,id,body){
 const v=await first(env,'SELECT v.*,c.subscription_id FROM visits v JOIN cycles c ON c.id=v.cycle_id WHERE v.id=?',id);if(!v)fail(404,'Visita não encontrada.');checkVersion(body,v);
 const status=body.status;if(!['completed','cancelled'].includes(status))fail(400,'Mudança de visita inválida.');
 if(v.status==='cancelled')fail(400,'Esse registro já foi cancelado.');
 if(status==='completed'&&(v.status==='completed'||v.visit_date>todaySP()))fail(400,'Essa visita não pode ser concluída agora.');
 const reason=text(body.reason,300);if(status==='cancelled'&&reason.length<2)fail(400,'Informe o motivo para desfazer o registro.');
 const s=await getSub(env,v.subscription_id);
 if(status==='completed'){requireRegisteredVehicle(s);matchPlate(v.plate,s.plate);matchPlate(body.checkedPlate,v.plate);}
 const op=uuid(),stamp=now(),checkedAt=status==='completed'?stamp:v.plate_checked_at||null,checkedBy=status==='completed'?(env.ADMIN_SESSION?.id||'server'):v.plate_checked_by||null;const batch=[
  stmt(env,'UPDATE visits SET status=?,completed_at=?,note=?,plate_checked_at=?,plate_checked_by=?,version=version+1,last_op=?,updated_at=? WHERE id=? AND version=?',status,status==='completed'?stamp:null,reason||v.note,checkedAt,checkedBy,op,stamp,id,v.version),
  stmt(env,'UPDATE quotes SET status=?,plate_verified_at=COALESCE(plate_verified_at,?),plate_verified_by=COALESCE(plate_verified_by,?),plate_checked_at=?,plate_checked_by=?,version=version+1,last_op=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM visits WHERE id=? AND last_op=?)',status,s.plate_verified_at||null,s.plate_verified_by||null,checkedAt,checkedBy,op,stamp,v.quote_id,id,op)
 ,stmt(env,'INSERT INTO quote_events(id,quote_id,status,message,created_at) SELECT ?,q.id,q.status,?,? FROM quotes q WHERE q.id=? AND EXISTS(SELECT 1 FROM visits WHERE id=? AND last_op=?)',uuid(),status==='completed'?'Lavagem concluída pela Fine Form.':'Registro de lavagem desfeito pela Fine Form. '+reason,stamp,v.quote_id,id,op)
 ];if(status==='completed'&&v.quote_id){const invitation=queueReviewPushStatement(env,v.quote_id,{op});if(invitation)batch.push(invitation);}
 const results=await env.DB.batch(batch);if(results[0].meta.changes!==1)fail(409,'A visita mudou. Atualize e tente novamente.');
 await audit(env,'visit',id,status,reason);return {subscriptionId:v.subscription_id,quoteId:v.quote_id,subscription:await subView(env,await getSub(env,v.subscription_id),true)};
}
export async function requestVisit(req,env,s,body){
 if(body.website||body.ack!==true)fail(400,'Confirme o envio da solicitação.');
 await limit(req,env,'visit-request',8);
 const plate=requireRegisteredVehicle(s);
 if(body.plate!==undefined)matchPlate(body.plate,plate);
 const cycle=await first(env,'SELECT * FROM cycles WHERE subscription_id=? AND starts_on<=? AND ends_on>? AND paid=1 ORDER BY starts_on DESC LIMIT 1',s.id,todaySP(),todaySP());
 if(s.status!=='active'||!cycle)fail(400,'O plano não tem um ciclo ativo e pago.');
 const kinds={premium:'premium',essential:'essential',moto:'motoPremium'},kind=text(body.creditKind,16),service=kinds[kind];if(!service||cycle[kind+'_quota']<1)fail(400,'Esse tipo de lavagem não faz parte do plano.');
 const used=await first(env,"SELECT COUNT(*) n FROM visits WHERE cycle_id=? AND kind=? AND status!='cancelled'",cycle.id,kind);const previous=/^[A-Za-z0-9_-]{43}$/.test(body.submissionToken||'')?await first(env,'SELECT id FROM quotes WHERE viewer_hash=? AND subscription_id=?',await digest(body.submissionToken),s.id):null;
 if(!previous&&used.n>=cycle[kind+'_quota'])fail(409,'O saldo dessa lavagem já foi utilizado ou reservado.');
 const {state}=validateSelection({...body,mode:'single',vehicle:s.vehicle,name:s.name,phone:s.phone,model:s.model,service});
 state.plate=plate;state.plateVerified=true;
 if(state.date&&(state.date<cycle.starts_on||state.date>=cycle.ends_on))fail(400,'Escolha uma data dentro do ciclo atual.');
 const budget=planVisitQuote(state);
 return saveQuote(env,{state,budget,token:body.submissionToken,subscription:s,cycle,creditKind:kind});
}
