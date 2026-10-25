import {fail,cycleView,todaySP,text} from './domain.mjs';
import {digest,bearer} from './security.mjs';
export const now=()=>new Date().toISOString();
export const uuid=()=>crypto.randomUUID();
export const stmt=(env,sql,...params)=>env.DB.prepare(sql).bind(...params);
export const first=(env,sql,...params)=>stmt(env,sql,...params).first();
export const all=async(env,sql,...params)=>(await stmt(env,sql,...params).all()).results;
export function quoteView(q,admin=false){
 const view={id:q.id,reference:q.reference,kind:q.kind,name:q.name,phone:q.phone,vehicle:q.vehicle,model:q.model,plate:q.plate||null,plateVerified:Boolean(q.plate_verified_at),plateVerifiedAt:q.plate_verified_at||null,plateCheckedAt:q.plate_checked_at||null,selection:JSON.parse(q.selection_json),budget:JSON.parse(q.budget_json),status:q.status,message:q.public_message,preferredDate:q.preferred_date,preferredTime:q.preferred_time,scheduledDate:q.scheduled_date,scheduledTime:q.scheduled_time,notes:q.notes,createdAt:q.created_at,updatedAt:q.updated_at,version:q.version,subscriptionId:q.subscription_id,creditKind:q.credit_kind};
 if(!view.plateVerified){delete view.selection.plate;delete view.selection.plateVerified;}
 view.confirmedTotal=q.confirmed_total_cents===null?null:q.confirmed_total_cents/100;
 view.location=q.location_json?JSON.parse(q.location_json):null;
 if(admin){view.customerId=q.customer_id;view.internalNote=q.internal_note;}
 return view;
}
export async function getQuote(env,id){const q=await first(env,'SELECT * FROM quotes WHERE id=?',id);if(!q)fail(404,'Pedido não encontrado.');return q;}
export async function authorizeQuote(req,env,id){const token=bearer(req);if(!token)fail(404,'Link de acompanhamento inválido.');const q=await first(env,'SELECT * FROM quotes WHERE id=? AND viewer_hash=?',id,await digest(token));if(!q)fail(404,'Link de acompanhamento inválido.');return q;}
export async function getSub(env,id){const s=await first(env,'SELECT s.*,c.name,c.phone FROM subscriptions s JOIN customers c ON c.id=s.customer_id WHERE s.id=?',id);if(!s)fail(404,'Assinatura não encontrada.');return s;}
export async function authorizeSub(req,env,id){
 const token=bearer(req);if(!token)fail(404,'Link da assinatura inválido.');const hash=await digest(token);
 const s=await first(env,'SELECT s.*,c.name,c.phone FROM subscriptions s JOIN customers c ON c.id=s.customer_id LEFT JOIN quotes q ON q.id=s.origin_quote_id WHERE s.id=? AND (s.viewer_hash=? OR q.viewer_hash=?)',id,hash,hash);if(!s)fail(404,'Link da assinatura inválido.');
 return s;
}
export async function subView(env,s,admin=false){
 const cycles=await all(env,'SELECT * FROM cycles WHERE subscription_id=? ORDER BY starts_on DESC LIMIT 12',s.id);
 const today=todaySP();
 const cycle=cycles.find(c=>c.starts_on<=today&&c.ends_on>today)||[...cycles].reverse().find(c=>c.starts_on>today)||cycles[0]||null;
 const historyVisits=cycles.length?await all(env,'SELECT * FROM visits WHERE cycle_id IN ('+cycles.map(()=>'?').join(',')+') ORDER BY visit_date DESC,created_at DESC',...cycles.map(c=>c.id)):[];
 const visits=historyVisits.filter(v=>v.cycle_id===cycle?.id);
 const snapshot=cycleView(cycle,visits);
 const view={id:s.id,name:s.name,vehicle:s.vehicle,model:s.model,plate:s.plate||null,plateVerified:Boolean(s.plate_verified_at),plateVerifiedAt:s.plate_verified_at||null,planId:s.plan_id,status:s.status,version:s.version,cycle:snapshot,visits:visits.map(v=>({id:v.id,kind:v.kind,status:v.status,date:v.visit_date,time:v.visit_time,plate:v.plate||null,plateCheckedAt:v.plate_checked_at||null,version:v.version})),history:cycles.map(c=>({id:c.id,start:c.starts_on,end:c.ends_on,price:c.price_cents/100,paid:Boolean(c.paid),state:c.state,credits:cycleView(c,historyVisits.filter(v=>v.cycle_id===c.id)).credits}))};
 view.visitHistory=historyVisits.filter(v=>v.cycle_id!==cycle?.id).map(v=>({id:v.id,cycleId:v.cycle_id,kind:v.kind,status:v.status,date:v.visit_date,time:v.visit_time,plate:v.plate||null,plateCheckedAt:v.plate_checked_at||null}));
 if(admin){view.phone=s.phone;view.customerId=s.customer_id;view.originQuoteId=s.origin_quote_id;}
 return view;
}
export async function customerFor(env,{name,phone,vehicle,model}){
 const existing=await first(env,'SELECT * FROM customers WHERE phone=?',phone);if(existing)return existing;
 const id=uuid(),stamp=now();await stmt(env,'INSERT INTO customers(id,name,phone,vehicle,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(phone) DO NOTHING',id,name,phone,vehicle,model,stamp,stamp).run();
 return first(env,'SELECT * FROM customers WHERE phone=?',phone);
}
export async function audit(env,entity,id,action,detail=''){await stmt(env,'INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) VALUES (?,?,?,?,?,?,?)',uuid(),entity,id,action,text(detail,300),now(),env.ADMIN_SESSION?.id||'server').run();}
export function checkVersion(body,row){if(!Number.isInteger(body.version)||body.version!==row.version)fail(409,'Este registro mudou. Atualize a página e tente novamente.');}
