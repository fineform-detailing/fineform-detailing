import {api,escape as e,trackingUrl} from './system.mjs';

const deviceId=async(id,endpoint)=>btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id+'|'+endpoint))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const keyBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const supported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
export async function mountCustomerNotice(host,q,token){
 if(!host)return;
 if(q.status==='completed'){
  const url=trackingUrl(q.id,token,'avaliar');
  host.innerHTML='<section class="system-card review-invitation"><p class="kicker">VEÍCULO ENTREGUE / SUA EXPERIÊNCIA</p><h2>Seu cuidado ficou em boa forma?</h2><p>Sua opinião ajuda a Fine Form a melhorar e outros clientes a escolher.</p><a class="button orange" href="'+e(url)+'">Deixar minha avaliação <span aria-hidden="true">↗</span></a></section>';
  return;
 }
 if(['declined','cancelled'].includes(q.status))return;
 host.innerHTML='<section class="system-card customer-notice"><h2>Um aviso depois da entrega.</h2><p>Ative neste aparelho para receber um convite para avaliar quando seu veículo for retirado.</p><p class="system-muted" role="status">Verificando notificações…</p><button type="button" class="button outline" disabled>Ativar convite de avaliação</button></section>';
 const status=host.querySelector('[role=status]'),button=host.querySelector('button');
 if(!supported()){
  button.hidden=true;
  status.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'No iPhone, adicione esta página à Tela de Início e abra por lá para ativar os avisos. A avaliação também ficará neste acompanhamento.':'Este navegador não permite avisos neste aparelho. O convite ficará aqui no acompanhamento após a entrega.';
  return;
 }
 let settings,subscription=null,enrolled=false;
 try{
  settings=await api('/api/quotes/'+q.id+'/notifications',{token});
  if(!settings.configured){status.textContent='Você poderá avaliar por este acompanhamento depois da entrega.';button.hidden=true;return;}
  const registration=await navigator.serviceWorker.getRegistration('/acompanhar/');
  subscription=await registration?.pushManager.getSubscription();
  enrolled=Boolean(subscription&&settings.deviceIds?.includes(await deviceId(q.id,subscription.endpoint)));
 }catch{status.textContent='Não foi possível verificar os avisos. Reabra o acompanhamento para tentar novamente.';return;}
 const update=()=>{
  button.disabled=false;button.textContent=enrolled?'Desativar convite neste aparelho':'Ativar convite de avaliação';
  status.textContent=enrolled?'Convite ativado neste aparelho. Você pode desativar quando quiser.':Notification.permission==='denied'?'As notificações estão bloqueadas nas configurações deste navegador. Sua avaliação continuará disponível aqui.':'Ao ativar, permita as notificações quando o navegador perguntar.';
 };
 update();
 button.addEventListener('click',async()=>{
  // Request permission directly in the tap handler, before any network/storage await.
  const permission=enrolled?null:Notification.requestPermission();
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{
   if(enrolled){await api('/api/quotes/'+q.id+'/notifications',{method:'DELETE',token,body:{endpoint:subscription.endpoint}});enrolled=false;}
   else{
    if(await permission!=='granted')throw Error('Permissão não concedida. Você poderá avaliar pelo acompanhamento após a entrega.');
    const registration=await navigator.serviceWorker.register('/acompanhar/sw.js',{scope:'/acompanhar/',updateViaCache:'none'});
    if(!registration.active)await new Promise((resolve,reject)=>{
     const worker=registration.installing||registration.waiting,timeout=setTimeout(()=>reject(Error('O aviso demorou para ativar. Tente novamente.')),12000);
     const check=()=>{if(worker?.state==='activated'){clearTimeout(timeout);resolve();}else if(worker?.state==='redundant'){clearTimeout(timeout);reject(Error('Não foi possível ativar os avisos. Tente novamente.'));}};
     worker?.addEventListener('statechange',check);check();
    });
    subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(settings.publicKey)});
    await api('/api/quotes/'+q.id+'/notifications',{method:'POST',token,body:{consent:true,subscription:subscription.toJSON()}});enrolled=true;
   }
   update();
  }catch(error){button.disabled=false;status.textContent=error.message;}
  finally{button.removeAttribute('aria-busy');}
 });
}
