import {all,first,stmt,uuid,now,checkVersion} from './store.mjs';
import {fail,text} from './domain.mjs';
export async function loyaltyView(env,customerId){
 const customer=await first(env,'SELECT id,name,phone FROM customers WHERE id=?',customerId);
 if(!customer)fail(404,'Cliente não encontrado.');
 const cards=await all(env,'SELECT * FROM loyalty_cards WHERE customer_id=? ORDER BY created_at DESC',customerId);
 for(const card of cards){card.stamps=await all(env,'SELECT * FROM loyalty_stamps WHERE card_id=? ORDER BY created_at,id',card.id);card.events=await all(env,'SELECT * FROM loyalty_events WHERE card_id=? ORDER BY created_at DESC,id',card.id);}
 const eligible=await all(env,`SELECT id,reference,model,updated_at FROM quotes WHERE customer_id=? AND status='completed' AND kind!='plan' AND NOT EXISTS(SELECT 1 FROM loyalty_stamps WHERE quote_id=quotes.id) ORDER BY updated_at DESC LIMIT 100`,customerId);
 return {customer,cards,eligible};
}
export async function changeLoyalty(env,customerId,body){
 const actor=env.ADMIN_SESSION?.id;if(!actor)fail(401,'Acesso administrativo necessário.');
 const action=body.action,stamp=now(),eventId=uuid();let cardId=body.cardId,results;
 if(action==='issue'){
  const target=body.target,reward=text(body.reward,160);
  if(!Number.isInteger(target)||target<2||target>30||reward.length<3)fail(400,'Defina de 2 a 30 pontos e descreva o prêmio.');
  cardId=uuid();
  results=await env.DB.batch([
   stmt(env,`INSERT INTO loyalty_cards(id,customer_id,target,reward,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM customers WHERE id=?) AND EXISTS(SELECT 1 FROM quotes WHERE customer_id=? AND status='completed' AND kind!='plan') AND NOT EXISTS(SELECT 1 FROM loyalty_cards WHERE customer_id=? AND status='active')`,cardId,customerId,target,reward,stamp,customerId,customerId,customerId),
   stmt(env,`INSERT INTO loyalty_events SELECT ?,?,'issued',?,?,? WHERE EXISTS(SELECT 1 FROM loyalty_cards WHERE id=?)`,eventId,cardId,reward,stamp,actor,cardId)
  ]);
 }else{
  const card=await first(env,'SELECT * FROM loyalty_cards WHERE id=? AND customer_id=?',cardId||'',customerId);
  if(!card)fail(404,'Cartão não encontrado.');checkVersion(body,card);
  if(card.status!=='active')fail(409,'Este prêmio já foi entregue. Emita outro cartão.');
  const count='(SELECT COUNT(*) FROM loyalty_stamps WHERE card_id=loyalty_cards.id)';
  if(action==='stamp'){
   const quoteId=text(body.quoteId,36),pointId=uuid();
   results=await env.DB.batch([
    stmt(env,`INSERT INTO loyalty_stamps(id,card_id,quote_id,reference,created_at,actor_id) SELECT ?,c.id,q.id,q.reference,?,? FROM loyalty_cards c JOIN quotes q ON q.customer_id=c.customer_id WHERE c.id=? AND c.customer_id=? AND c.version=? AND c.status='active' AND q.id=? AND q.status='completed' AND q.kind!='plan' AND (SELECT COUNT(*) FROM loyalty_stamps WHERE card_id=c.id)<c.target AND NOT EXISTS(SELECT 1 FROM loyalty_stamps WHERE quote_id=q.id)`,pointId,stamp,actor,cardId,customerId,card.version,quoteId),
    stmt(env,`UPDATE loyalty_cards SET version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM loyalty_stamps WHERE id=?)`,cardId,pointId),
    stmt(env,`INSERT INTO loyalty_events SELECT ?,?,'stamped',reference,?,? FROM loyalty_stamps WHERE id=?`,eventId,cardId,stamp,actor,pointId)
   ]);
  }else if(action==='redeem'){
   if(body.confirm!==true)fail(400,'Confirme a entrega do prêmio.');
   results=await env.DB.batch([
    stmt(env,`INSERT INTO loyalty_events SELECT ?,id,'redeemed',reward,?,? FROM loyalty_cards WHERE id=? AND customer_id=? AND version=? AND status='active' AND ${count}=target`,eventId,stamp,actor,cardId,customerId,card.version),
    stmt(env,`UPDATE loyalty_cards SET status='redeemed',redeemed_at=?,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM loyalty_events WHERE id=?)`,stamp,cardId,eventId)
   ]);
  }else fail(400,'Ação inválida.');
 }
 if(results[0].meta.changes!==1)fail(409,'Não foi possível registrar: confira se o pedido foi entregue, se já pontuou ou se o cartão mudou. Atualize e tente novamente.');
 return loyaltyView(env,customerId);
}
