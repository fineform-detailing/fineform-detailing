import {fail} from './domain.mjs';
import {limit} from './security.mjs';
import {stmt,now,uuid} from './store.mjs';

// Same private/review capability as publication. No public ID grants this action.
export async function withdrawReview(req,env,q){
 await limit(req,env,'review-withdraw',12,600,q.id);
 const stamp=now();
 const results=await env.DB.batch([
  stmt(env,`UPDATE reviews SET published=0,first_name='',comment=''
   WHERE quote_id=? AND EXISTS(SELECT 1 FROM quotes WHERE id=? AND viewer_hash=?)`,q.id,q.id,q.viewer_hash),
  stmt(env,`INSERT INTO audit_events(id,entity,entity_id,action,detail,created_at,actor_id)
   SELECT ?,'review',r.id,'consent_withdrawn','Publicação revogada pelo titular.',?,'customer'
   FROM reviews r JOIN quotes q ON q.id=r.quote_id WHERE r.quote_id=? AND r.published=0 AND q.viewer_hash=?
   AND NOT EXISTS(SELECT 1 FROM audit_events a WHERE a.entity='review' AND a.entity_id=r.id AND a.action='consent_withdrawn')`,uuid(),stamp,q.id,q.viewer_hash)
 ]);
 if(results[0].meta.changes!==1)fail(404,'Avaliação não encontrada. Reabra o link privado do seu pedido.');
 return {ok:true,withdrawn:true};
}
