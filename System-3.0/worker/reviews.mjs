import {fail,text} from './domain.mjs';
import {digest,bearer,verify,sign,limit} from './security.mjs';
import {stmt,first,all,now,uuid,authorizeQuote} from './store.mjs';
import {pushSettings,validatePushSubscription,sendPush} from './push.mjs';

const epoch=()=>Math.floor(Date.now()/1000),TTL=7*86400,MAX_DEVICES=3;
const reviewView=r=>r?{id:r.id,rating:r.rating,comment:r.comment,firstName:r.first_name,vehicle:r.vehicle,createdAt:r.created_at,published:Boolean(r.published)}:null;
// A notification link can only read/write its review, never the private order.
export async function authorizeReview(req,env,id){
 if(bearer(req))return authorizeQuote(req,env,id);
 const raw=(req.headers.get('Authorization')||'').replace(/^Bearer /,''),cap=await verify(raw,env,'review');
 if(!cap||cap.id!==id||cap.aud!==new URL(req.url).origin)fail(404,'Link de avaliação inválido ou expirado. Abra o acompanhamento do pedido.');
 const q=await first(env,'SELECT * FROM quotes WHERE id=? AND viewer_hash=?',id,cap.viewerHash);
 if(!q)fail(404,'Link de avaliação inválido ou expirado. Abra o acompanhamento do pedido.');
 return q;
}
export async function reviewState(env,q){
 return {eligible:q.status==='completed',firstName:text(q.name,80).split(/\s+/)[0],review:reviewView(await first(env,'SELECT * FROM reviews WHERE quote_id=?',q.id))};
}
export async function saveReview(req,env,q,body){
 await limit(req,env,'review-submit',12,600,q.id);
 if(q.status!=='completed')fail(409,'A avaliação fica disponível depois que o veículo for entregue.');
 if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5)fail(400,'Escolha uma nota de 1 a 5 estrelas.');
 if(typeof body.comment!=='string'||body.comment.length>600)fail(400,'Escreva um comentário de até 600 caracteres.');
 if(body.consent!==true)fail(400,'Autorize a publicação da nota, comentário e primeiro nome.');
 const comment=text(body.comment,600),stamp=now();
 const results=await env.DB.batch([
  stmt(env,`INSERT INTO reviews(id,quote_id,rating,comment,first_name,vehicle,consent_at,created_at)
   SELECT ?,id,?,?,?,vehicle,?,? FROM quotes WHERE id=? AND status='completed' AND viewer_hash=?
   ON CONFLICT(quote_id) DO NOTHING`,uuid(),body.rating,comment,text(q.name,80).split(/\s+/)[0].slice(0,40),stamp,stamp,q.id,q.viewer_hash),
  stmt(env,"UPDATE customer_push_jobs SET state='failed',last_error='already-reviewed',lease_token=NULL,lease_until=0 WHERE quote_id=? AND state='pending' AND EXISTS(SELECT 1 FROM reviews WHERE quote_id=?)",q.id,q.id)
 ]);
 const review=await first(env,'SELECT * FROM reviews WHERE quote_id=?',q.id);
 if(!review)fail(409,'Este pedido mudou. Reabra seu link antes de avaliar.');
 return {review:reviewView(review),duplicate:results[0].meta.changes===0};
}
export async function publicReviews(env,url){
 const page=Math.floor(Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0)));
 const filter="r.published=1 AND q.status='completed'";
 const results=await env.DB.batch([
  stmt(env,`SELECT COUNT(*) count,ROUND(AVG(r.rating),1) average FROM reviews r JOIN quotes q ON q.id=r.quote_id WHERE ${filter}`),
  stmt(env,`SELECT r.* FROM reviews r JOIN quotes q ON q.id=r.quote_id WHERE ${filter} ORDER BY r.created_at DESC,r.id DESC LIMIT 7 OFFSET ?`,page*6)
 ]);
 return {...results[0].results[0],items:results[1].results.slice(0,6).map(reviewView),page,hasMore:results[1].results.length>6};
}
function configured(req,env){
 const settings=pushSettings(env);
 if(!settings||settings.origin!==new URL(req.url).origin)fail(503,'O aviso para este site ainda não está disponível. Você pode acompanhar seu pedido pelo link.');
 return settings;
}
export async function customerNotificationState(req,env,q){
 const settings=pushSettings(env);
 if(!settings||settings.origin!==new URL(req.url).origin)return {configured:false,maximum:MAX_DEVICES};
 const devices=await all(env,'SELECT id FROM customer_push_subscriptions WHERE quote_id=? AND viewer_hash=? AND vapid_key=? AND origin=?',q.id,q.viewer_hash,settings.publicKey,settings.origin);
 return {configured:true,publicKey:settings.publicKey,maximum:MAX_DEVICES,deviceIds:devices.map(s=>s.id)};
}
export async function registerCustomerPush(req,env,q,body){
 const settings=configured(req,env);await limit(req,env,'customer-push',10,600,q.id);
 if(body.consent!==true)fail(400,'Confirme que deseja receber o convite de avaliação neste aparelho.');
 const s=await validatePushSubscription({...body,label:'Cliente'}),id=await digest(q.id+'|'+s.endpoint),stamp=now();
 const result=await env.DB.batch([
  stmt(env,'DELETE FROM customer_push_subscriptions WHERE quote_id=? AND (viewer_hash!=? OR vapid_key!=?)',q.id,q.viewer_hash,settings.publicKey),
  stmt(env,`INSERT INTO customer_push_subscriptions(id,quote_id,endpoint,p256dh,auth,viewer_hash,vapid_key,origin,created_at,updated_at)
   SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM quotes WHERE id=? AND viewer_hash=?) AND
   ((SELECT COUNT(*) FROM customer_push_subscriptions WHERE quote_id=?)<? OR EXISTS(SELECT 1 FROM customer_push_subscriptions WHERE id=?))
   ON CONFLICT(id) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,viewer_hash=excluded.viewer_hash,vapid_key=excluded.vapid_key,updated_at=excluded.updated_at,last_error=NULL`,id,q.id,s.endpoint,s.p256dh,s.auth,q.viewer_hash,settings.publicKey,settings.origin,stamp,stamp,q.id,q.viewer_hash,q.id,MAX_DEVICES,id),
  // Handles enrollment racing with delivery, without creating a second invitation.
  queueForSettings(env,settings,q.id,{deviceId:id})
 ]);
 if(result[1].meta.changes!==1)fail(409,'Limite de aparelhos atingido ou link alterado. Reabra o acompanhamento.');
 return {id,enabled:true};
}
export async function removeCustomerPush(req,env,q,body){
 configured(req,env);
 if(typeof body.endpoint!=='string'||body.endpoint.length>2048)fail(400,'Aparelho inválido.');
 await stmt(env,'DELETE FROM customer_push_subscriptions WHERE quote_id=? AND endpoint=?',q.id,body.endpoint).run();
 return {ok:true};
}
function queueForSettings(env,settings,quoteId,{op=null,deviceId=null}={}){
 const stamp=epoch();
 return stmt(env,`INSERT INTO customer_push_jobs(quote_id,subscription_id,next_attempt_at,created_at,expires_at)
  SELECT q.id,s.id,?,?,? FROM quotes q JOIN customer_push_subscriptions s ON s.quote_id=q.id
  WHERE q.id=? AND q.status='completed' AND s.viewer_hash=q.viewer_hash AND s.origin=? AND s.vapid_key=?
  ${op?'AND q.last_op=?':''} ${deviceId?'AND s.id=?':''}
  AND NOT EXISTS(SELECT 1 FROM reviews WHERE quote_id=q.id) ON CONFLICT(quote_id,subscription_id) DO NOTHING`,stamp,stamp,stamp+TTL,quoteId,settings.origin,settings.publicKey,...(op?[op]:[]),...(deviceId?[deviceId]:[]));
}
// Appended to the same batch as the successful delivery transition.
export function queueReviewPushStatement(env,quoteId,options={}){
 const settings=pushSettings(env);return settings?queueForSettings(env,settings,quoteId,options):null;
}
export async function dispatchReviewPush(env,{fetcher=fetch}={}){
 const settings=pushSettings(env);if(!settings||!env.DB)return {sent:0,failed:0};
 const stamp=epoch();
 await env.DB.batch([
  stmt(env,'DELETE FROM customer_push_jobs WHERE expires_at<?',stamp-86400),
  stmt(env,"UPDATE customer_push_jobs SET state='failed',last_error='expired-or-attempt-limit',lease_token=NULL,lease_until=0 WHERE state='pending' AND (expires_at<=? OR attempts>=5) AND lease_until<=?",stamp,stamp),
  stmt(env,'DELETE FROM customer_push_subscriptions WHERE updated_at<? AND NOT EXISTS(SELECT 1 FROM customer_push_jobs j WHERE j.subscription_id=customer_push_subscriptions.id AND j.state=\'pending\')',new Date(Date.now()-90*86400000).toISOString())
 ]);
 const valid=`q.status='completed' AND s.viewer_hash=q.viewer_hash AND s.vapid_key=? AND s.origin=? AND NOT EXISTS(SELECT 1 FROM reviews WHERE quote_id=q.id)`;
 const jobs=await all(env,`SELECT j.*,s.endpoint,s.p256dh,s.auth,q.viewer_hash FROM customer_push_jobs j JOIN customer_push_subscriptions s ON s.id=j.subscription_id JOIN quotes q ON q.id=j.quote_id
  WHERE j.state='pending' AND j.next_attempt_at<=? AND j.lease_until<=? AND j.expires_at>? AND j.attempts<5 AND ${valid} ORDER BY j.next_attempt_at LIMIT 4`,stamp,stamp,stamp,settings.publicKey,settings.origin);
 let sent=0,failed=0;
 await Promise.all(jobs.map(async job=>{
  const lease=uuid(),claim=await stmt(env,"UPDATE customer_push_jobs SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE quote_id=? AND subscription_id=? AND state='pending' AND lease_until<=? AND next_attempt_at<=? AND attempts<5 RETURNING attempts",lease,stamp+90,job.quote_id,job.subscription_id,stamp,stamp).all();
  if(!claim.results.length)return;
  const current=await first(env,`SELECT s.id FROM customer_push_subscriptions s JOIN quotes q ON q.id=s.quote_id WHERE s.id=? AND ${valid}`,job.subscription_id,settings.publicKey,settings.origin);
  if(!current){await stmt(env,"UPDATE customer_push_jobs SET state='failed',last_error='revoked-or-reviewed',lease_token=NULL,lease_until=0 WHERE quote_id=? AND subscription_id=? AND lease_token=?",job.quote_id,job.subscription_id,lease).run();return;}
  let result;
  try{
   const token=await sign({type:'review',id:job.quote_id,viewerHash:job.viewer_hash,aud:settings.origin,exp:Date.now()+30*86400000},env);
   result=await sendPush(env,settings,job,{type:'review.requested',quoteId:job.quote_id,token},{fetcher,ttl:Math.max(1,job.expires_at-epoch())});
  }catch{}
  if([404,410].includes(result?.status)){await stmt(env,'DELETE FROM customer_push_subscriptions WHERE id=?',job.subscription_id).run();failed++;return;}
  const attempts=claim.results[0].attempts,permanent=result&&!result.ok&&result.status>=300&&result.status<500&&![408,429].includes(result.status);
  const state=result?.ok?'sent':permanent||attempts>=5?'failed':'pending',error=result?.ok?null:result?'http-'+result.status:'network';
  await env.DB.batch([
   stmt(env,'UPDATE customer_push_jobs SET state=?,next_attempt_at=?,lease_token=NULL,lease_until=0,last_error=? WHERE quote_id=? AND subscription_id=? AND lease_token=?',state,epoch()+[30,120,300,900,1800][attempts-1],error,job.quote_id,job.subscription_id,lease),
   stmt(env,'UPDATE customer_push_subscriptions SET last_sent_at=CASE WHEN ? THEN ? ELSE last_sent_at END,last_error=? WHERE id=?',result?.ok?1:0,now(),error,job.subscription_id)
  ]);
  if(result?.ok)sent++;else failed++;
 }));
 return {sent,failed};
}
export function wakeReviewPush(ctx,env){
 if(pushSettings(env)&&ctx?.waitUntil)ctx.waitUntil(dispatchReviewPush(env).catch(()=>console.warn('Fine Form: convite de avaliação aguardando nova tentativa.')));
}
