import {buildPushPayload} from '@block65/webcrypto-web-push';
import {fail} from './domain.mjs';
import {digest,limit} from './security.mjs';
import {stmt,all,first,now,audit} from './store.mjs';

const MAX_DEVICES=5,MAX_ATTEMPTS=5,JOB_TTL=86400,LEASE_SECONDS=90;
const retryDelays=[30,120,300,900,1800];
const epoch=()=>Math.floor(Date.now()/1000);
const decode=(value,size)=>{
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid key');
 const bytes=Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 if(bytes.length!==size||btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==value)throw Error('Invalid key');
 return bytes;
};
export function pushSettings(env){
 try{
  if(typeof env.PUSH_VAPID!=='string'||env.PUSH_VAPID.length>4096)return null;
  const settings=JSON.parse(env.PUSH_VAPID),origin=new URL(settings.origin);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)return null;
  if(settings.subject!==origin.origin+'/')return null;
  if(decode(settings.publicKey,65)[0]!==4)return null;decode(settings.privateKey,32);
  return {publicKey:settings.publicKey,privateKey:settings.privateKey,subject:settings.subject,origin:origin.origin};
 }catch{return null;}
}
export const pushOwner=env=>digest(env.ADMIN_KEY+'\u0000'+(env.ADMIN_TOTP_SECRET||''));
export function pushEndpoint(value){
 if(typeof value!=='string'||value.length>2048)fail(400,'Endereço de notificação inválido.');
 let url;try{url=new URL(value);}catch{fail(400,'Endereço de notificação inválido.');}
 const trusted=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||/^(?:[a-z0-9-]+\.)*push\.apple\.com$/.test(url.hostname)||/^(?:[a-z0-9-]+\.)+notify\.windows\.com$/.test(url.hostname);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!trusted||url.pathname==='/')fail(400,'Serviço de notificação não autorizado.');
 return url.href;
}
export async function validatePushSubscription(body){
 const value=body?.subscription;
 if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Inscrição de notificação inválida.');
 const endpoint=pushEndpoint(value.endpoint);let publicKey;
 try{publicKey=decode(value.keys?.p256dh,65);if(publicKey[0]!==4)throw Error('Invalid point');decode(value.keys?.auth,16);await crypto.subtle.importKey('raw',publicKey,{name:'ECDH',namedCurve:'P-256'},false,[]);}catch{fail(400,'Chaves de notificação inválidas.');}
 if(value.expirationTime!==null&&value.expirationTime!==undefined&&(!Number.isFinite(value.expirationTime)||value.expirationTime<=Date.now()))fail(400,'A inscrição deste aparelho expirou. Ative as notificações novamente.');
 if(typeof body.label!=='string'||!body.label.trim()||body.label.length>60||/[\u0000-\u001f\u007f]/.test(body.label))fail(400,'Informe um nome de até 60 caracteres para o aparelho.');
 return {endpoint,p256dh:value.keys.p256dh,auth:value.keys.auth,label:body.label.trim()};
}
function configured(req,env){
 const settings=pushSettings(env);
 if(!settings||new URL(req.url).origin!==settings.origin)fail(503,'As notificações ainda não foram configuradas para este site.');
 return settings;
}
export async function notificationStatus(req,env){
 const settings=pushSettings(env);
 if(!settings||new URL(req.url).origin!==settings.origin)return {configured:false,devices:[],maximum:MAX_DEVICES};
 try{
  const devices=await all(env,'SELECT id,label,created_at createdAt,last_sent_at lastSentAt,last_error lastError FROM admin_push_subscriptions WHERE origin=? AND owner_hash=? AND vapid_key=? ORDER BY created_at DESC LIMIT ?',settings.origin,await pushOwner(env),settings.publicKey,MAX_DEVICES);
  return {configured:true,publicKey:settings.publicKey,devices,maximum:MAX_DEVICES};
 }catch{fail(503,'A configuração das notificações precisa ser concluída.');}
}
export async function registerPush(req,env,body){
 const settings=configured(req,env),owner=await pushOwner(env);
 await limit(req,env,'push-register',10,60,owner);
 const subscription=await validatePushSubscription(body),id=await digest(subscription.endpoint),stamp=now();
 const result=await env.DB.batch([
  stmt(env,'DELETE FROM admin_push_subscriptions WHERE origin=? AND (owner_hash!=? OR vapid_key!=?)',settings.origin,owner,settings.publicKey),
  stmt(env,`INSERT INTO admin_push_subscriptions(id,endpoint,p256dh,auth,owner_hash,vapid_key,origin,label,created_at,updated_at)
   SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM admin_push_subscriptions WHERE origin=?)<? OR EXISTS(SELECT 1 FROM admin_push_subscriptions WHERE id=?)
   ON CONFLICT(id) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,owner_hash=excluded.owner_hash,vapid_key=excluded.vapid_key,origin=excluded.origin,label=excluded.label,updated_at=excluded.updated_at,last_error=NULL`,id,subscription.endpoint,subscription.p256dh,subscription.auth,owner,settings.publicKey,settings.origin,subscription.label,stamp,stamp,settings.origin,MAX_DEVICES,id)
 ]);
 if(result[1].meta.changes!==1)fail(409,'Limite de aparelhos atingido. Desative um aparelho antes de cadastrar outro.');
 await audit(env,'push-device',id,'registered');return {id,enabled:true};
}
export async function removePush(req,env,id){
 const settings=configured(req,env);
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(id))fail(400,'Aparelho inválido.');
 await stmt(env,'DELETE FROM admin_push_subscriptions WHERE id=? AND origin=?',id,settings.origin).run();
 await audit(env,'push-device',id,'revoked');return {ok:true};
}
// This statement is appended to the same transaction that accepts the quote.
export async function queuePushStatement(env,quoteId){
 const settings=pushSettings(env);if(!settings)return null;const stamp=epoch();
 return stmt(env,`INSERT INTO admin_push_jobs(quote_id,subscription_id,next_attempt_at,created_at,expires_at)
  SELECT ?,id,?,?,? FROM admin_push_subscriptions WHERE origin=? AND owner_hash=? AND vapid_key=?`,quoteId,stamp,stamp,stamp+JOB_TTL,settings.origin,await pushOwner(env),settings.publicKey);
}
export function pushMessage(quoteId){
 return quoteId?{type:'order.created',quoteId}:{type:'notification.test'};
}
async function sendPush(env,settings,subscription,message,{fetcher=fetch,ttl=JOB_TTL}={}){
 const endpoint=pushEndpoint(subscription.endpoint),payload=await buildPushPayload({data:message,options:{ttl,urgency:'high'}},{endpoint,expirationTime:null,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},settings);
 const provider=new URL(endpoint).origin,keyId=await digest(settings.publicKey+'\u0000'+settings.subject),stamp=epoch();
 // Apple recommends retaining a VAPID JWT for at least one hour. D1 keeps
 // the chosen token stable across isolates and concurrent senders.
 await stmt(env,`INSERT INTO admin_push_vapid_tokens(origin,key_id,authorization,refresh_at) VALUES (?,?,?,?)
  ON CONFLICT(origin) DO UPDATE SET key_id=excluded.key_id,authorization=excluded.authorization,refresh_at=excluded.refresh_at
  WHERE admin_push_vapid_tokens.key_id!=excluded.key_id OR admin_push_vapid_tokens.refresh_at<=?`,provider,keyId,payload.headers.authorization,stamp+3600,stamp).run();
 payload.headers.authorization=(await first(env,'SELECT authorization FROM admin_push_vapid_tokens WHERE origin=? AND key_id=?',provider,keyId)).authorization;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{const result=await fetcher(endpoint,{...payload,redirect:'manual',signal:controller.signal});await result.body?.cancel();return {status:result.status,ok:result.status>=200&&result.status<300};}
 finally{clearTimeout(timeout);}
}
export async function testPush(req,env,body,{fetcher=fetch}={}){
 const settings=configured(req,env),owner=await pushOwner(env);await limit(req,env,'push-test',5,60,owner);
 if(typeof body.id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.id))fail(400,'Aparelho inválido.');
 const subscription=await first(env,'SELECT * FROM admin_push_subscriptions WHERE id=? AND origin=? AND owner_hash=? AND vapid_key=?',body.id,settings.origin,owner,settings.publicKey);
 if(!subscription)fail(404,'Ative as notificações neste aparelho antes de testar.');
 let result;try{result=await sendPush(env,settings,subscription,pushMessage(),{fetcher,ttl:60});}catch{fail(502,'O teste não pôde ser entregue agora. Tente novamente.');}
 if(result.status===404||result.status===410){await stmt(env,'DELETE FROM admin_push_subscriptions WHERE id=?',body.id).run();fail(410,'A inscrição deste aparelho expirou. Ative novamente.');}
 if(!result.ok)fail(502,'O serviço de notificações recusou o teste. Tente novamente.');
 await stmt(env,'UPDATE admin_push_subscriptions SET last_sent_at=?,last_error=NULL WHERE id=?',now(),body.id).run();
 return {sent:true};
}
export async function dispatchPush(env,{fetcher=fetch}={}){
 const settings=pushSettings(env);if(!settings||!env.DB)return {sent:0,failed:0};
 const owner=await pushOwner(env),stamp=epoch();
 await env.DB.batch([
  stmt(env,'DELETE FROM admin_push_jobs WHERE expires_at<?',stamp-86400),
  stmt(env,"UPDATE admin_push_jobs SET state='failed',last_error=CASE WHEN expires_at<=? THEN 'expired' ELSE 'attempt-limit' END,lease_token=NULL,lease_until=0 WHERE state='pending' AND (expires_at<=? OR attempts>=?) AND lease_until<=?",stamp,stamp,MAX_ATTEMPTS,stamp)
 ]);
 const jobs=await all(env,`SELECT j.*,s.endpoint,s.p256dh,s.auth FROM admin_push_jobs j
  JOIN admin_push_subscriptions s ON s.id=j.subscription_id JOIN quotes q ON q.id=j.quote_id
  WHERE j.state='pending' AND j.next_attempt_at<=? AND j.lease_until<=? AND j.expires_at>? AND j.attempts<5
  AND q.status='pending' AND s.owner_hash=? AND s.vapid_key=? AND s.origin=?
  ORDER BY j.next_attempt_at,j.created_at LIMIT 4`,stamp,stamp,stamp,owner,settings.publicKey,settings.origin);
 let sent=0,failed=0;
 for(let offset=0;offset<jobs.length;offset+=4)await Promise.all(jobs.slice(offset,offset+4).map(async job=>{
  const lease=crypto.randomUUID();
  const claim=await stmt(env,`UPDATE admin_push_jobs SET lease_token=?,lease_until=?,attempts=attempts+1
   WHERE quote_id=? AND subscription_id=? AND state='pending' AND attempts<5 AND lease_until<=? AND next_attempt_at<=? RETURNING attempts`,lease,stamp+LEASE_SECONDS,job.quote_id,job.subscription_id,stamp,stamp).all();
  if(!claim.results.length)return;
  const attempts=claim.results[0].attempts;let result,error='network';
  try{
   // Recheck enrollment immediately before sending: a revoked device or a
   // credential rotation cannot reuse an already claimed background job.
   const current=await first(env,"SELECT s.id FROM admin_push_subscriptions s JOIN quotes q ON q.id=? WHERE s.id=? AND s.owner_hash=? AND s.vapid_key=? AND s.origin=? AND q.status='pending'",job.quote_id,job.subscription_id,owner,settings.publicKey,settings.origin);
   if(!current){await stmt(env,"UPDATE admin_push_jobs SET state='failed',last_error='revoked-or-reviewed',lease_token=NULL,lease_until=0 WHERE quote_id=? AND subscription_id=? AND lease_token=?",job.quote_id,job.subscription_id,lease).run();return;}
   result=await sendPush(env,settings,job,pushMessage(job.quote_id),{fetcher,ttl:Math.max(1,job.expires_at-epoch())});
   error='http-'+result.status;
  }catch{}
  if(result?.status===404||result?.status===410){await stmt(env,'DELETE FROM admin_push_subscriptions WHERE id=?',job.subscription_id).run();failed++;return;}
  const permanent=result&&!result.ok&&result.status>=300&&result.status<500&&result.status!==408&&result.status!==429;
  const state=result?.ok?'sent':permanent||attempts>=MAX_ATTEMPTS?'failed':'pending';
  await env.DB.batch([
   stmt(env,'UPDATE admin_push_jobs SET state=?,next_attempt_at=?,lease_token=NULL,lease_until=0,last_error=? WHERE quote_id=? AND subscription_id=? AND lease_token=?',state,epoch()+retryDelays[Math.min(attempts-1,retryDelays.length-1)],result?.ok?null:error,job.quote_id,job.subscription_id,lease),
   stmt(env,'UPDATE admin_push_subscriptions SET last_sent_at=CASE WHEN ? THEN ? ELSE last_sent_at END,last_error=? WHERE id=?',result?.ok?1:0,now(),result?.ok?null:error,job.subscription_id)
  ]);
  if(result?.ok)sent++;else failed++;
 }));
 return {sent,failed};
}
export function wakePush(ctx,env){
 if(!pushSettings(env)||!ctx?.waitUntil)return;
 ctx.waitUntil(dispatchPush(env).catch(()=>console.warn('Fine Form: fila de notificações aguardando nova tentativa.')));
}
