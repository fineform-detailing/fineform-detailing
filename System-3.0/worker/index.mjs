import {AppError,fail,text,idValid,todaySP,plans,cycleView} from './domain.mjs';
import {keyReady,adminReady,mfaReady,isLocal,digest,sign,verify,checkOrigin,jsonBody,adminSession,requireAdmin,limit,randomToken,bearer,createSession,sessionCookie,csrfToken,verifyCredentials,securityHeaders} from './security.mjs';
import {all,first,stmt,now,uuid,getQuote,quoteView,authorizeQuote,getSub,authorizeSub,subView,audit} from './store.mjs';
import {publicQuote,updateQuote,quoteList} from './quotes.mjs';
import {activateSubscription,renewSubscription,changeSubscription,deleteSubscription,recordVisit,updateVisit,requestVisit} from './subscriptions.mjs';
import {notify} from './live.mjs';
import {deleteQuote,customerDeletionPreview,deleteCustomer} from './deletions.mjs';
import {notificationStatus,registerPush,removePush,testPush,wakePush,dispatchPush} from './push.mjs';
import {changePlate,registerQuotePlate} from './plates.mjs';
import {publicReviews,authorizeReview,reviewState,saveReview,customerNotificationState,registerCustomerPush,removeCustomerPush,wakeReviewPush,dispatchReviewPush} from './reviews.mjs';
import {withdrawReview} from './privacy.mjs';
export {LiveUpdates} from './live.mjs';
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const idFrom=value=>{if(!idValid(value))fail(404,'Registro não encontrado.');return value;};
const emit=(ctx,env,topics,revoke=[])=>{const p=notify(env,topics,revoke).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(p);};
async function subscriptionList(env,url){
 const status=url.searchParams.get('status')||'',q=text(url.searchParams.get('q'),60),page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0));
 if(status&&!['active','paused','cancelled'].includes(status))fail(400,'Filtro inválido.');
 const filters=[],args=[];if(status){filters.push('s.status=?');args.push(status);}if(q){filters.push('(c.name LIKE ? OR c.phone LIKE ? OR s.model LIKE ? OR s.plate LIKE ?)');args.push(q+'%',q.replace(/\D/g,'')?q.replace(/\D/g,'')+'%':'__none__%',q+'%',q.replace(/[\s-]/g,'').toUpperCase()+'%');}
 const rows=await all(env,'SELECT s.*,c.name,c.phone FROM subscriptions s JOIN customers c ON c.id=s.customer_id '+(filters.length?'WHERE '+filters.join(' AND '):'')+' ORDER BY s.created_at DESC LIMIT 31 OFFSET ?',...args,page*30);
 const selected=rows.slice(0,30),today=todaySP();if(!selected.length)return {items:[],page,hasMore:false};
 const ids=selected.map(s=>s.id),marks=ids.map(()=>'?').join(',');
 const cycles=await all(env,`SELECT * FROM (SELECT c.*,ROW_NUMBER() OVER(PARTITION BY subscription_id ORDER BY starts_on DESC) rn FROM cycles c WHERE subscription_id IN (${marks})) WHERE rn<=12`,...ids);
 const picked=selected.map(s=>{const list=cycles.filter(c=>c.subscription_id===s.id).sort((a,b)=>b.starts_on.localeCompare(a.starts_on));return list.find(c=>c.starts_on<=today&&c.ends_on>today)||[...list].reverse().find(c=>c.starts_on>today)||list[0];});
 const cycleIds=picked.filter(Boolean).map(c=>c.id);
 const visits=cycleIds.length?await all(env,`SELECT * FROM visits WHERE cycle_id IN (${cycleIds.map(()=>'?').join(',')})`,...cycleIds):[];
 return {items:selected.map((s,i)=>({id:s.id,name:s.name,phone:s.phone,model:s.model,vehicle:s.vehicle,plate:s.plate||null,plateVerified:Boolean(s.plate_verified_at),planId:s.plan_id,status:s.status,version:s.version,cycle:cycleView(picked[i],visits.filter(v=>v.cycle_id===picked[i]?.id))})),page,hasMore:rows.length>30};
}
async function dashboard(env){
 const today=todaySP();
 const [quotes,subscriptions,visits,scheduledQuotes,expiring]=await env.DB.batch([
  stmt(env,'SELECT status,COUNT(*) n FROM quotes GROUP BY status'),
  stmt(env,"SELECT COUNT(*) n FROM subscriptions s WHERE s.status='active' AND EXISTS(SELECT 1 FROM cycles c WHERE c.subscription_id=s.id AND c.starts_on<=? AND c.ends_on>? AND c.paid=1)",today,today),
  stmt(env,"SELECT COUNT(*) n FROM visits WHERE visit_date=? AND status!='cancelled'",today),
  stmt(env,"SELECT COUNT(*) n FROM quotes WHERE scheduled_date=? AND kind!='subscription_visit' AND status IN ('accepted','in_progress','ready','completed')",today),
  stmt(env,"SELECT s.id,c.name,cy.ends_on FROM subscriptions s JOIN customers c ON c.id=s.customer_id JOIN cycles cy ON cy.subscription_id=s.id WHERE s.status='active' AND cy.ends_on>? AND cy.ends_on<=date(?,'+7 days') ORDER BY cy.ends_on LIMIT 20",today,today)
 ]);
 return {
  today,
  quotes:Object.fromEntries(quotes.results.map(r=>[r.status,r.n])),
  activeSubscriptions:subscriptions.results[0].n,
  todayVisits:visits.results[0].n+scheduledQuotes.results[0].n,
  expiring:expiring.results
 };
}
async function api(req,env,ctx){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/api/health'&&method==='GET'){
  let database=false;try{if(env.DB)await first(env,'SELECT id FROM quotes LIMIT 1');database=Boolean(env.DB);}catch{}
  let security=false;try{security=Boolean(database&&await first(env,'SELECT id FROM admin_sessions LIMIT 1')!==undefined&&await first(env,'SELECT id FROM payment_receipts LIMIT 1')!==undefined);}catch{}
  return response({version:'3.0.0',ready:database&&security&&adminReady(req,env),database,security,realtime:Boolean(env.LIVE),mfa:mfaReady(env)});
 }
 if(method!=='GET')checkOrigin(req);
 if(!env.DB||!keyReady(env))fail(503,'O sistema ainda precisa da configuração do banco e da chave do painel.');
 if(path==='/api/reviews'&&method==='GET')return response(await publicReviews(env,url));
 const reviewMatch=path.match(/^\/api\/quotes\/([^/]+)\/(review|notifications)$/);
 if(reviewMatch){
  await limit(req,env,'customer-review-access',120,60);
  const id=idFrom(reviewMatch[1]),action=reviewMatch[2];
  if(action==='review'){
   const q=await authorizeReview(req,env,id);
   if(method==='GET')return response(await reviewState(env,q));
   if(method==='DELETE')return response(await withdrawReview(req,env,q));
   if(method==='POST'){const result=await saveReview(req,env,q,await jsonBody(req));emit(ctx,env,['quote:'+q.id]);return response(result,result.duplicate?200:201);}
  }else{
   const q=await authorizeQuote(req,env,id);
   if(method==='GET')return response(await customerNotificationState(req,env,q));
   if(method==='POST'){const result=await registerCustomerPush(req,env,q,await jsonBody(req));wakeReviewPush(ctx,env);return response(result,201);}
   if(method==='DELETE')return response(await removeCustomerPush(req,env,q,await jsonBody(req)));
  }
 }
 if(path==='/api/admin/session'){
  if(method==='GET'){checkOrigin(req);const session=await adminSession(req,env);return response({authenticated:Boolean(session),mfaRequired:!isLocal(req)||mfaReady(env),...(session?{csrfToken:await csrfToken(session,env),expiresAt:session.expires_at*1000}:{})},session?200:401);}
  if(method==='DELETE'){
   const session=await requireAdmin(req,env);await env.DB.batch([stmt(env,'DELETE FROM admin_sessions WHERE id=?',session.id),stmt(env,'DELETE FROM realtime_tickets WHERE session_id=?',session.id)]);
   await audit({...env,ADMIN_SESSION:session},'security',session.id,'logout');emit(ctx,env,[],[session.id]);return response({ok:true},200,{'Set-Cookie':sessionCookie(req,'',0)});
  }
  if(method==='POST'){
   await limit(req,env,'admin-access',8,900);const body=await jsonBody(req);
   await verifyCredentials(req,env,body);const old=await adminSession(req,env),created=await createSession(req,env);
   if(old){await env.DB.batch([stmt(env,'DELETE FROM admin_sessions WHERE id=?',old.id),stmt(env,'DELETE FROM realtime_tickets WHERE session_id=?',old.id)]);emit(ctx,env,[],[old.id]);}
   await audit({...env,ADMIN_SESSION:created.session},'security',created.session.id,'login');
   return response({authenticated:true,csrfToken:created.csrfToken,expiresAt:created.session.expires_at*1000,mfaRequired:!isLocal(req)||mfaReady(env)},200,{'Set-Cookie':sessionCookie(req,created.token)});
  }
 }
 if(path==='/api/admin/reauth'&&method==='POST'){
  const session=await requireAdmin(req,env);await limit(req,env,'admin-access',8,900);await verifyCredentials(req,env,await jsonBody(req));
  const created=await createSession(req,env);await env.DB.batch([stmt(env,'DELETE FROM admin_sessions WHERE id=?',session.id),stmt(env,'DELETE FROM realtime_tickets WHERE session_id=?',session.id)]);
  await audit({...env,ADMIN_SESSION:created.session},'security',created.session.id,'reauthenticated');emit(ctx,env,[],[session.id]);
  return response({authenticated:true,csrfToken:created.csrfToken,expiresAt:created.session.expires_at*1000},200,{'Set-Cookie':sessionCookie(req,created.token)});
 }
 if(path==='/api/quotes'&&method==='POST'){
  const result=await publicQuote(req,env,await jsonBody(req));emit(ctx,env,['quote:'+result.quote.id]);if(!result.duplicate)wakePush(ctx,env);return response(result,result.duplicate?200:201);
 }
 let match=path.match(/^\/api\/quotes\/([^/]+)$/);
 if(match&&method==='GET'){
  await limit(req,env,'private-read',120,60);
  const q=await authorizeQuote(req,env,idFrom(match[1]));
  const events=await all(env,'SELECT status,message,created_at FROM quote_events WHERE quote_id=? ORDER BY created_at LIMIT 80',q.id);
  return response({quote:quoteView(q),events});
 }
 match=path.match(/^\/api\/subscriptions\/([^/]+)(\/requests)?$/);
 if(match){
  await limit(req,env,'private-read',120,60);
  const s=await authorizeSub(req,env,idFrom(match[1]));
  if(!match[2]&&method==='GET')return response({subscription:await subView(env,s)});
  if(match[2]&&method==='POST'){const result=await requestVisit(req,env,s,await jsonBody(req));emit(ctx,env,['quote:'+result.quote.id,'subscription:'+s.id]);if(!result.duplicate)wakePush(ctx,env);return response(result,result.duplicate?200:201);}
 }
 if(path==='/api/realtime-ticket'&&method==='POST'){
  await limit(req,env,'realtime-ticket',30,60);const body=await jsonBody(req);let topic,session=null,capHash=null;
  if(body.scope==='admin'){session=await requireAdmin(req,env);topic='admin';}
  else if(body.scope==='quote'){const q=await authorizeQuote(req,env,idFrom(body.id));topic='quote:'+q.id;}
  else if(body.scope==='subscription'){const s=await authorizeSub(req,env,idFrom(body.id));topic='subscription:'+s.id;}
  else fail(400,'Canal inválido.');
  if(!session)capHash=await digest(bearer(req));const nonce=randomToken(),expires=Date.now()+60000;
  await env.DB.batch([stmt(env,'DELETE FROM realtime_tickets WHERE id IN (SELECT id FROM realtime_tickets WHERE expires_at<=? LIMIT 100)',Math.floor(Date.now()/1000)),stmt(env,'INSERT INTO realtime_tickets(id,session_id,expires_at) VALUES (?,?,?)',await digest(nonce),session?.id||null,Math.floor(expires/1000))]);
  return response({ticket:await sign({type:'live',topic,aud:url.host,sessionId:session?.id||null,capHash,exp:expires,nonce},env)});
 }
 if(path==='/api/realtime'&&method==='GET'){
  checkOrigin(req,{required:true});await limit(req,env,'realtime-connect',60,60);const ticket=await verify(url.searchParams.get('ticket'),env,'live');if(!ticket||ticket.aud!==url.host||!/^admin$|^(quote|subscription):[0-9a-f-]{36}$/.test(ticket.topic||''))fail(401,'Conexão expirada. Reconecte a página.');if(!env.LIVE)fail(503,'Atualização ao vivo indisponível.');
  if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')fail(426,'Conexão WebSocket necessária.');
  let session=null;
  if(ticket.topic==='admin'){session=await requireAdmin(req,env);if(session.id!==ticket.sessionId)fail(401,'Conexão expirada.');}
  else {const [scope,id]=ticket.topic.split(':');const row=scope==='quote'?await first(env,'SELECT id FROM quotes WHERE id=? AND viewer_hash=?',id,ticket.capHash):await first(env,'SELECT s.id FROM subscriptions s LEFT JOIN quotes q ON q.id=s.origin_quote_id WHERE s.id=? AND (s.viewer_hash=? OR q.viewer_hash=?)',id,ticket.capHash,ticket.capHash);if(!row)fail(401,'Link privado revogado.');}
  const used=await stmt(env,'DELETE FROM realtime_tickets WHERE id=? AND expires_at>? RETURNING id',await digest(ticket.nonce),Math.floor(Date.now()/1000)).all();if(!used.results.length)fail(401,'Conexão expirada. Reconecte a página.');
  const headers=new Headers({'Upgrade':'websocket','X-FF-Topic':ticket.topic,'X-FF-Expires':String(Math.min(Date.now()+300000,session?session.expires_at*1000:Infinity))});if(session)headers.set('X-FF-Session',session.id);
  return env.LIVE.get(env.LIVE.idFromName('fine-form-live')).fetch(new Request('https://live/connect',{method:'GET',headers}));
 }
 if(path.startsWith('/api/admin/')){
  await limit(req,env,'admin-request',120,60);const session=await requireAdmin(req,env,{recent:method!=='GET'||path==='/api/admin/export'});env={...env,ADMIN_SESSION:session};
  if(path==='/api/admin/notifications'&&method==='GET')return response(await notificationStatus(req,env));
  if(path==='/api/admin/notifications/subscription'&&method==='POST')return response(await registerPush(req,env,await jsonBody(req)),201);
  if(path==='/api/admin/notifications/test'&&method==='POST')return response(await testPush(req,env,await jsonBody(req)));
  if(path==='/api/admin/notifications/subscription'&&method==='DELETE'){const body=await jsonBody(req);return response(await removePush(req,env,body.id));}
  if(path==='/api/admin/dashboard'&&method==='GET')return response(await dashboard(env));
  if(path==='/api/admin/quotes'&&method==='GET')return response(await quoteList(env,url));
  match=path.match(/^\/api\/admin\/quotes\/([^/]+)$/);
  if(match){const id=idFrom(match[1]);if(method==='GET'){const q=await getQuote(env,id);return response({quote:quoteView(q,true),events:await all(env,'SELECT status,message,created_at FROM quote_events WHERE quote_id=? ORDER BY created_at LIMIT 80',id)});}if(method==='DELETE'){const result=await deleteQuote(env,id,await jsonBody(req));emit(ctx,env,['quote:'+id,...result.subscriptionIds.map(id=>'subscription:'+id)]);return response(result);}if(method==='PATCH'){const q=await updateQuote(env,id,await jsonBody(req));emit(ctx,env,['quote:'+id,...(q.subscriptionId?['subscription:'+q.subscriptionId]:[])]);if(q.status==='completed')wakeReviewPush(ctx,env);return response({quote:q});}}
  match=path.match(/^\/api\/admin\/quotes\/([^/]+)\/plate$/);
  if(match&&method==='PATCH'){const q=await registerQuotePlate(env,idFrom(match[1]),await jsonBody(req));emit(ctx,env,['quote:'+q.id]);return response({quote:q});}
  match=path.match(/^\/api\/admin\/quotes\/([^/]+)\/link$/);
  if(match&&method==='POST'){
   const id=idFrom(match[1]);await getQuote(env,id);const {randomToken}=await import('./security.mjs'),token=randomToken();
   await stmt(env,'UPDATE quotes SET viewer_hash=?,version=version+1,updated_at=? WHERE id=?',await digest(token),now(),id).run();
   await audit(env,'quote',id,'link_reissued');emit(ctx,env,['quote:'+id]);return response({quoteId:id,trackingToken:token});
  }
  if(path==='/api/admin/subscriptions'){
   if(method==='GET')return response(await subscriptionList(env,url));
   if(method==='POST'){const result=await activateSubscription(env,await jsonBody(req));emit(ctx,env,['subscription:'+result.subscription.id,...(result.subscription.originQuoteId?['quote:'+result.subscription.originQuoteId]:[])]);return response(result,201);}
  }
  match=path.match(/^\/api\/admin\/subscriptions\/([^/]+)(\/(renew|visits|portal|plate))?$/);
  if(match){const id=idFrom(match[1]),action=match[3];
   if(!action&&method==='GET')return response({subscription:await subView(env,await getSub(env,id),true)});
   if(!action&&method==='PATCH'){const subscription=await changeSubscription(env,id,await jsonBody(req));emit(ctx,env,['subscription:'+id]);return response({subscription});}
   if(!action&&method==='DELETE'){const result=await deleteSubscription(env,id,await jsonBody(req));emit(ctx,env,['subscription:'+id]);return response(result);}
   if(action==='plate'&&method==='PATCH'){const subscription=await changePlate(env,id,await jsonBody(req));const linked=await all(env,"SELECT id FROM quotes WHERE subscription_id=? AND kind='subscription_visit' AND status IN ('pending','accepted','in_progress','ready') LIMIT 200",id);const topics=['subscription:'+id,...linked.map(q=>'quote:'+q.id)];for(let i=0;i<topics.length;i+=4)emit(ctx,env,topics.slice(i,i+4));return response({subscription});}
   if(action==='renew'&&method==='POST'){const subscription=await renewSubscription(env,id,await jsonBody(req));emit(ctx,env,['subscription:'+id]);return response({subscription});}
   if(action==='visits'&&method==='POST'){const subscription=await recordVisit(env,id,await jsonBody(req));emit(ctx,env,['subscription:'+id]);return response({subscription},201);}
   if(action==='portal'&&method==='POST'){
    const {randomToken}=await import('./security.mjs');const token=randomToken();await stmt(env,'UPDATE subscriptions SET viewer_hash=?,version=version+1,updated_at=? WHERE id=?',await digest(token),now(),id).run();await audit(env,'subscription',id,'portal_reissued');emit(ctx,env,['subscription:'+id]);return response({portalToken:token,subscriptionId:id});
   }
  }
  match=path.match(/^\/api\/admin\/visits\/([^/]+)$/);
  if(match&&method==='PATCH'){const result=await updateVisit(env,idFrom(match[1]),await jsonBody(req));emit(ctx,env,['subscription:'+result.subscriptionId,...(result.quoteId?['quote:'+result.quoteId]:[])]);wakeReviewPush(ctx,env);return response(result);}
  match=path.match(/^\/api\/admin\/customers\/([^/]+)$/);
  if(match){const id=idFrom(match[1]);
   if(method==='GET')return response(await customerDeletionPreview(env,id));
   if(method==='DELETE'){const result=await deleteCustomer(env,id,await jsonBody(req));const topics=[...result.quoteIds.map(id=>'quote:'+id),...result.subscriptionIds.map(id=>'subscription:'+id)];if(!topics.length)emit(ctx,env,[]);for(let i=0;i<topics.length;i+=4)emit(ctx,env,topics.slice(i,i+4));return response(result);}
  }
  if(path==='/api/admin/customers'&&method==='GET'){
   const q=text(url.searchParams.get('q'),60);return response({items:await all(env,'SELECT c.*, (SELECT COUNT(*) FROM subscriptions WHERE customer_id=c.id AND status!=\'cancelled\') plans FROM customers c WHERE name LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT 100',q+'%',q.replace(/\D/g,'')?q.replace(/\D/g,'')+'%':q?'__none__%':'%')});
  }
  if(path==='/api/admin/agenda'&&method==='GET'){
   const date=text(url.searchParams.get('date'),10)||todaySP();
   const [quotes,visits]=await Promise.all([all(env,"SELECT id,reference,name,model,plate,scheduled_date date,scheduled_time time,status,kind FROM quotes WHERE scheduled_date=? AND kind!='subscription_visit' AND status IN ('accepted','in_progress','ready','completed') ORDER BY scheduled_time",date),all(env,"SELECT v.id,c.name,s.model,v.plate,v.visit_date date,v.visit_time time,v.status,v.kind,v.quote_id,v.version,s.id subscriptionId FROM visits v JOIN cycles cy ON cy.id=v.cycle_id JOIN subscriptions s ON s.id=cy.subscription_id JOIN customers c ON c.id=s.customer_id WHERE v.visit_date=? AND v.status!='cancelled' ORDER BY v.visit_time",date)]);return response({date,quotes,visits});
  }
  if(path==='/api/admin/export'&&method==='GET'){
   const tables=['customers','subscriptions','cycles','quotes','quote_events','visits','audit_events','payment_receipts','reviews'];const result={version:'3.0.0',exportedAt:now()};let count=0;
   for(const table of tables){const rows=await all(env,'SELECT * FROM '+table+' LIMIT 5001');count+=rows.length;if(rows.length>5000||count>15000)fail(413,'Use o comando de backup D1 para exportar essa base completa.');result[table]=rows;}
   return response(result,200,{'Content-Disposition':'attachment; filename="fine-form-backup.json"'});
  }
 }
 fail(404,'Recurso não encontrado.');
}
export default {async fetch(req,env,ctx){
 const url=new URL(req.url),isApi=url.pathname.startsWith('/api/'),privatePage=/^\/(painel|assinatura|acompanhar|avaliar)(\/|$)/.test(url.pathname);
 if(url.protocol!=='https:'&&!isLocal(req)){if(!['GET','HEAD'].includes(req.method))return securityHeaders(req,response({error:'Use uma conexão HTTPS.'},403),{api:true});url.protocol='https:';return Response.redirect(url.href,308);}
 if(!isApi){const result=env.ASSETS?await env.ASSETS.fetch(req):new Response('Fine Form 3.0',{status:200});return securityHeaders(req,result,{privatePage});}
 try{return securityHeaders(req,await api(req,env,ctx),{api:true});}catch(error){const registrationMissing=String(error.message||'').includes('FF_VEHICLE_NOT_REGISTERED'),plateConflict=String(error.message||'').includes('FF_PLATE_MISMATCH');const status=registrationMissing||plateConflict?409:error instanceof AppError?error.status:500;return securityHeaders(req,response({error:registrationMissing?'Confira o veículo pessoalmente e cadastre a placa no painel antes de iniciar o atendimento ou ativar/utilizar o Care.':plateConflict?'A placa do veículo não corresponde à assinatura ou ainda precisa ser conferida. Atualize o cadastro no painel.':status===500?'Não foi possível concluir a operação. Tente novamente.':error.message,...(status===428?{code:'reauth_required'}:{})},status,status===429?{'Retry-After':'600'}:{}),{api:true});}
},async scheduled(_controller,env){await Promise.all([dispatchPush(env),dispatchReviewPush(env)]);}};
