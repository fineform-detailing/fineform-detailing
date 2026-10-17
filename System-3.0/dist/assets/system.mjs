export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const statusLabel={pending:'Recebido',accepted:'Aceito',declined:'Recusado',in_progress:'Em cuidado',ready:'Pronto para retirada',completed:'Concluído',cancelled:'Cancelado'};
export const visitLabel={premium:'Premium',essential:'Essencial',moto:'Moto Premium'};
export const dateLabel=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'A combinar';
let adminCsrf='',lastActivity=Date.now(),reauthenticate=null,sessionExpired=null,authGeneration=0;
export const setReauthenticationHandler=handler=>reauthenticate=handler;
export const setSessionExpiryHandler=handler=>sessionExpired=handler;
export const clearAdminSession=()=>{adminCsrf='';authGeneration++;};
if(typeof document!=='undefined')for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>{lastActivity=Date.now();},{passive:true});
export async function api(path,{method='GET',body,token,signal,_retried=false}={}){
 const target=new URL(path,location.origin);if(target.origin!==location.origin||!target.pathname.startsWith('/api/'))throw new Error('Destino de envio inválido.');
 const generation=authGeneration,adminRequest=target.pathname.startsWith('/api/admin/')&&!['/api/admin/session','/api/admin/reauth'].includes(target.pathname);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 const stop=()=>controller.abort();signal?.addEventListener('abort',stop,{once:true});
 try{const res=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(adminCsrf&&(target.pathname.startsWith('/api/admin/')||body?.scope==='admin')?{'X-FF-CSRF':adminCsrf,'X-FF-Activity':Date.now()-lastActivity<60000?'1':'0'}:{})},body:body!==undefined?JSON.stringify(body):undefined,signal:controller.signal});
  const data=await res.json().catch(()=>({error:'Resposta indisponível. Tente novamente.'}));
  if(adminRequest&&generation!==authGeneration){const error=new Error('A sessão foi encerrada. Entre novamente.');error.status=401;throw error;}
  if(!res.ok){
   if(res.status===428&&data.code==='reauth_required'&&reauthenticate&&!_retried){clearTimeout(timeout);await reauthenticate();return api(path,{method,body,token,signal,_retried:true});}
   if(res.status===401&&!['/api/admin/session','/api/admin/reauth'].includes(target.pathname)&&(target.pathname.startsWith('/api/admin/')||body?.scope==='admin')){clearAdminSession();sessionExpired?.();}
   const error=new Error(data.error||'Não foi possível concluir a operação.');error.status=res.status;error.mfaRequired=data.mfaRequired;throw error;
  }
  if(data.authenticated&&data.csrfToken)adminCsrf=data.csrfToken;
  if(target.pathname==='/api/admin/session'&&method==='DELETE')clearAdminSession();return data;
 }catch(error){if(error.name==='AbortError')throw new Error('A conexão demorou. Tente novamente; seu pedido não será duplicado.');throw error;}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
}
export function randomToken(){if(!crypto.getRandomValues)throw Error('Abra o site por uma conexão segura.');return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function submissionToken(payload,key='ff-pending-submission'){
 const fingerprint=JSON.stringify(payload);try{const old=JSON.parse(sessionStorage.getItem(key)||'null');if(old?.fingerprint===fingerprint)return old.token;}catch{}
 const token=randomToken();try{sessionStorage.setItem(key,JSON.stringify({fingerprint,token}));}catch{}return token;
}
export function trackingUrl(id,token,path='acompanhar'){return new URL('/'+path+'/?id='+encodeURIComponent(id)+'#t='+encodeURIComponent(token),location.origin).href;}
export function saveBookmark(id,token,reference){try{const list=JSON.parse(localStorage.getItem('ff-orders-v2')||'[]').filter(x=>x.id!==id);list.unshift({id,token,reference});localStorage.setItem('ff-orders-v2',JSON.stringify(list.slice(0,20)));}catch{}}
export async function copyText(value){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);const input=document.createElement('textarea');input.value=value;document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw Error('Copie o link exibido na tela.');}
export function watchUpdates({scope,id,token,onChange,onState=()=>{}}){
 let stopped=false,socket=null,reconnect=null,poll=null,ping=null,delay=1000,refreshTimer=null,connecting=false,handshake=null;
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>Promise.resolve(onChange()).catch(()=>{}),150);};
 const close=()=>{clearTimeout(reconnect);clearTimeout(handshake);handshake=null;clearInterval(poll);clearInterval(ping);poll=null;ping=null;const old=socket;socket=null;old?.close();};
 const fallback=()=>{if(!poll)poll=setInterval(()=>{if(!document.hidden)refresh();},30000);};
 const retry=ws=>{
  if(ws!==socket)return;socket=null;clearTimeout(handshake);handshake=null;clearInterval(ping);ping=null;
  if(stopped||document.hidden)return;
  onState('fallback');fallback();reconnect=setTimeout(connect,delay);delay=Math.min(30000,delay*2);
 };
 async function connect(){
  if(stopped||document.hidden||connecting)return;connecting=true;onState('connecting');fallback();
  try{const data=await api('/api/realtime-ticket',{method:'POST',body:{scope,id},token});if(stopped||document.hidden)return;
   const url=new URL('/api/realtime',location.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',data.ticket);
   const ws=new WebSocket(url);socket=ws;
   handshake=setTimeout(()=>{retry(ws);ws.close();},8000);
   ws.onopen=()=>{if(ws!==socket||stopped){ws.close();return;}clearTimeout(handshake);handshake=null;delay=1000;clearInterval(poll);poll=null;onState('live');refresh();ping=setInterval(()=>{if(socket?.readyState===1)socket.send('ping');},25000);};
   ws.onmessage=e=>{if(e.data==='pong')return;try{if(JSON.parse(e.data).type==='changed')refresh();}catch{}};
   ws.onclose=()=>retry(ws);
   ws.onerror=()=>ws.close();
  }catch{onState('fallback');if(!stopped&&!document.hidden){reconnect=setTimeout(connect,delay);delay=Math.min(30000,delay*2);}}
  finally{connecting=false;}
 }
 const visibility=()=>{if(document.hidden)close();else{refresh();connect();}};
 const restored=event=>{if(event.persisted){refresh();connect();}};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',restored);connect();
 return ()=>{stopped=true;close();clearTimeout(refreshTimer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',restored);};
}
