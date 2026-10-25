import {fail} from './domain.mjs';
import {digest} from './security.mjs';
import {stmt,first,all,getQuote,checkVersion,now,uuid} from './store.mjs';

export async function deleteQuote(env,id,body){
 const q=await getQuote(env,id);checkVersion(body,q);
 if(body.confirm!==true)fail(400,'Confirme a exclusão definitiva do pedido.');
 const related=await all(env,'SELECT id FROM subscriptions WHERE id=? OR origin_quote_id=?',q.subscription_id,id);
 const op=uuid(),stamp=now(),claimed='EXISTS(SELECT 1 FROM quotes WHERE id=? AND last_op=?)';
 const results=await env.DB.batch([
  stmt(env,'UPDATE quotes SET version=version+1,last_op=?,updated_at=? WHERE id=? AND version=?',op,stamp,id,q.version),
  stmt(env,'DELETE FROM visits WHERE quote_id=? AND '+claimed,id,id,op),
  stmt(env,'UPDATE subscriptions SET origin_quote_id=NULL,version=version+1,updated_at=? WHERE origin_quote_id=? AND '+claimed,stamp,id,id,op),
  stmt(env,'INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) SELECT ?,\'quote\',?,\'deleted\',\'Pedido e registros de visita vinculados excluídos pelo operador.\',?,? WHERE '+claimed,op,id,stamp,env.ADMIN_SESSION?.id||'server',id,op),
  stmt(env,'DELETE FROM quotes WHERE id=? AND last_op=?',id,op),
  stmt(env,`DELETE FROM customers WHERE id=? AND NOT EXISTS(SELECT 1 FROM quotes WHERE customer_id=customers.id OR phone=customers.phone)
   AND NOT EXISTS(SELECT 1 FROM subscriptions WHERE customer_id=customers.id) AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)`,q.customer_id,op)
 ]);
 if(results[0].meta.changes!==1||results[4].meta.changes<1)fail(409,'Este pedido mudou. Recarregue antes de excluir.');
 return {deleted:true,quoteId:id,subscriptionIds:related.map(s=>s.id)};
}

const quoteScope='customer_id=? OR phone=?';
const cycleScope='subscription_id IN(SELECT id FROM subscriptions WHERE customer_id=?)';
const visitScope='cycle_id IN(SELECT id FROM cycles WHERE '+cycleScope+') OR quote_id IN(SELECT id FROM quotes WHERE '+quoteScope+')';
function graphQueries(id,phone){return [
 ['SELECT json_array(id,name,phone,vehicle,model,created_at,updated_at) value FROM customers WHERE id=?',[id]],
 ["SELECT COALESCE(group_concat(value,'|'),'') value FROM(SELECT id||':'||version value FROM quotes WHERE "+quoteScope+' ORDER BY id)',[id,phone]],
 ["SELECT COALESCE(group_concat(value,'|'),'') value FROM(SELECT id||':'||version value FROM subscriptions WHERE customer_id=? ORDER BY id)",[id]],
 ["SELECT COALESCE(group_concat(value,'|'),'') value FROM(SELECT json_array(id,starts_on,ends_on,price_cents,premium_quota,essential_quota,moto_quota,paid,state) value FROM cycles WHERE "+cycleScope+' ORDER BY id)',[id]],
 ["SELECT COALESCE(group_concat(value,'|'),'') value FROM(SELECT id||':'||version value FROM visits WHERE "+visitScope+' ORDER BY id)',[id,id,phone]]
 ];}
async function customerGraph(env,id){
 const customer=await first(env,'SELECT * FROM customers WHERE id=?',id);if(!customer)fail(404,'Cliente não encontrado.');
 const queries=graphQueries(id,customer.phone);
 const results=await env.DB.batch(queries.map(([sql,args])=>stmt(env,sql,...args)));
 const values=results.map(r=>r.results[0]?.value??'');
 const counts=await env.DB.batch([
  stmt(env,'SELECT COUNT(*) n FROM quotes WHERE '+quoteScope,id,customer.phone),
  stmt(env,'SELECT COUNT(*) n FROM subscriptions WHERE customer_id=?',id),
  stmt(env,'SELECT COUNT(*) n FROM cycles WHERE '+cycleScope,id),
  stmt(env,'SELECT COUNT(*) n FROM visits WHERE '+visitScope,id,id,customer.phone)
 ]);
 return {customer,queries,values,snapshot:await digest(JSON.stringify(values)),counts:Object.fromEntries(['quotes','subscriptions','cycles','visits'].map((key,i)=>[key,counts[i].results[0].n]))};
}
export async function customerDeletionPreview(env,id){
 const {customer,snapshot,counts}=await customerGraph(env,id);
 return {customer:{id:customer.id,name:customer.name,phone:customer.phone},snapshot,counts};
}
export async function deleteCustomer(env,id,body){
 if(body.confirm!==true)fail(400,'Confirme a exclusão definitiva do cliente e dos registros vinculados.');
 const graph=await customerGraph(env,id);
 if(body.snapshot!==graph.snapshot)fail(409,'Os dados deste cliente mudaram. Confira a exclusão novamente.');
 const {customer,queries,values}=graph,op=uuid(),stamp=now();
 const quotes=await all(env,'SELECT id,subscription_id FROM quotes WHERE '+quoteScope,id,customer.phone);
 const subscriptions=await all(env,'SELECT id FROM subscriptions WHERE customer_id=? OR origin_quote_id IN(SELECT id FROM quotes WHERE '+quoteScope+')',id,id,customer.phone);
 const guard=queries.map(([sql])=>'COALESCE(('+sql+'),\'\')=?').join(' AND ');
 const guardArgs=queries.flatMap(([,args],i)=>[...args,values[i]]);
 const claimed='EXISTS(SELECT 1 FROM audit_events WHERE id=?)';
 const results=await env.DB.batch([
  stmt(env,'INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id) SELECT ?,\'customer\',?,\'deleted\',?,?,? WHERE '+guard,op,id,JSON.stringify(graph.counts),stamp,env.ADMIN_SESSION?.id||'server',...guardArgs),
  stmt(env,'DELETE FROM visits WHERE ('+visitScope+') AND '+claimed,id,id,customer.phone,op),
  stmt(env,'UPDATE subscriptions SET origin_quote_id=NULL,version=version+1,updated_at=? WHERE origin_quote_id IN(SELECT id FROM quotes WHERE '+quoteScope+') AND '+claimed,stamp,id,customer.phone,op),
  stmt(env,'DELETE FROM quotes WHERE ('+quoteScope+') AND '+claimed,id,customer.phone,op),
  stmt(env,'DELETE FROM subscriptions WHERE customer_id=? AND '+claimed,id,op),
  stmt(env,'DELETE FROM customers WHERE id=? AND '+claimed,id,op)
 ]);
 if(results[0].meta.changes!==1||results[5].meta.changes!==1)fail(409,'Os dados deste cliente mudaram. Confira a exclusão novamente.');
 return {deleted:true,customerId:id,quoteIds:quotes.map(q=>q.id),subscriptionIds:[...new Set([...subscriptions.map(s=>s.id),...quotes.map(q=>q.subscription_id).filter(Boolean)])]};
}
