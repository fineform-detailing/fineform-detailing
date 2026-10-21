// Public notice version; never a marketing-consent flag.
export const PRIVACY_VERSION='2026-10-20';
export const DRAFT_TTL=30*86400000;
export const LINK_TTL=90*86400000;
export function readOrders(storage,timestamp=Date.now()){
 try{
  const raw=JSON.parse(storage.getItem('ff-orders-v2')||'[]');
  if(!Array.isArray(raw))return [];
  const list=raw.filter(q=>q&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(q.id)&&/^[A-Za-z0-9_-]{43}$/.test(q.token))
   .map(q=>({id:q.id,token:q.token,reference:String(q.reference||'Pedido').slice(0,30),expiresAt:Number.isFinite(q.expiresAt)?q.expiresAt:timestamp+LINK_TTL}))
   .filter(q=>q.expiresAt>timestamp&&q.expiresAt<=timestamp+LINK_TTL).slice(0,20);
  if(list.length)storage.setItem('ff-orders-v2',JSON.stringify(list));else storage.removeItem('ff-orders-v2');
  return list;
 }catch{return [];}
}
export function rememberOrder(storage,id,token,reference,{remember=false,timestamp=Date.now()}={}){
 const list=readOrders(storage,timestamp),existing=list.find(q=>q.id===id);
 if(!remember&&!existing)return false;
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)||!/^[A-Za-z0-9_-]{43}$/.test(token))return false;
 const item={id,token,reference:String(reference||'Pedido').slice(0,30),expiresAt:existing?.expiresAt||timestamp+LINK_TTL};
 try{storage.setItem('ff-orders-v2',JSON.stringify([item,...list.filter(q=>q.id!==id)].slice(0,20)));return true;}catch{return false;}
}
export function readDraft(storage,timestamp=Date.now()){
 try{
  const raw=JSON.parse(storage.getItem('ff-care-draft-v1')||'null');
  if(!raw||typeof raw!=='object')return null;
  // Existing optional drafts receive a bounded lifetime on their first new visit.
  const expiresAt=Number.isFinite(raw.expiresAt)?raw.expiresAt:timestamp+DRAFT_TTL;
  if(expiresAt<=timestamp||expiresAt>timestamp+DRAFT_TTL){storage.removeItem('ff-care-draft-v1');return null;}
  if(!raw.expiresAt)storage.setItem('ff-care-draft-v1',JSON.stringify({...raw,expiresAt}));
  return raw;
 }catch{return null;}
}
export function clearSavedData(storage){
 try{storage.removeItem('ff-care-draft-v1');storage.removeItem('ff-orders-v2');return true;}catch{return false;}
}
