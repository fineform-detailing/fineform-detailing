import {api,escape as e} from './system.mjs';

const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const subscriptionId=subscription=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(subscription.endpoint)).then(encode);
const supported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const deviceLabel=()=>/Android/i.test(navigator.userAgent)?'Meu Android':/iPhone|iPad/i.test(navigator.userAgent)?'Meu iPhone ou iPad':/Windows/i.test(navigator.userAgent)?'Meu Windows':'Meu aparelho';
const stamp=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Ainda sem envio';
function activated(registration){
 if(registration.active)return Promise.resolve(registration);
 return new Promise((resolve,reject)=>{
  const worker=registration.installing||registration.waiting;
  if(!worker){reject(Error('Não foi possível ativar os avisos. Recarregue o painel e tente novamente.'));return;}
  const finish=error=>{clearTimeout(timer);worker.removeEventListener('statechange',check);error?reject(error):resolve(registration);};
  const check=()=>{if(worker.state==='activated')finish();else if(worker.state==='redundant')finish(Error('A ativação não foi concluída. Recarregue o painel.'));};
  const timer=setTimeout(()=>finish(Error('A ativação demorou. Recarregue o painel e tente novamente.')),15000);
  worker.addEventListener('statechange',check);check();
 });
}

export async function notificationView(view,{toast=()=>{}}={}){
 const data=await api('/api/admin/notifications');
 if(!view.isConnected)return;
 const available=supported(),registration=available?await navigator.serviceWorker.getRegistration('/painel/'):null;
 const subscription=await registration?.pushManager.getSubscription(),id=subscription?await subscriptionId(subscription):null;
 const active=Boolean(id&&data.devices.some(device=>device.id===id)),denied=available&&Notification.permission==='denied';
 const explanation=!data.configured?'As notificações ainda não foram configuradas para este site.':!available?'Este navegador não oferece notificações em segundo plano. No Android, abra o painel no Chrome. No iPhone ou iPad, adicione o painel à Tela de Início e abra por esse ícone.':denied?'A permissão foi bloqueada. Libere as notificações deste site nas permissões do navegador e confira as notificações do navegador nos ajustes do celular.':active?'Os avisos estão ativados para este aparelho. Use a notificação de teste para conferir a entrega.':'Ative os avisos neste aparelho para os próximos pedidos.';
 view.innerHTML='<section class="system-card"><h2>Novos pedidos no seu celular.</h2><p>Receba um aviso mesmo com o painel fechado. Ao tocar, você abre o painel para avaliar o atendimento.</p><p class="system-muted">Som e vibração seguem os ajustes do aparelho, incluindo Não Perturbe. A tela de notificação não mostra dados do cliente nem valores.</p><p id="push-state" class="system-note" role="status">'+e(explanation)+'</p><div class="system-actions">'+(!active?'<button class="button orange" id="push-enable" type="button" '+(!available||!data.configured||denied?'disabled':'')+'>Ativar notificações neste aparelho</button>':'<button class="button orange" id="push-test" type="button">Enviar notificação de teste</button><button class="button outline" id="push-disable" type="button">Desativar neste aparelho</button>')+'</div><p class="system-muted">Os avisos continuam após sair do painel. Use Desativar neste aparelho para interrompê-los. Alterar a chave ou o autenticador exige reativação dos avisos.</p><p id="push-error" class="system-error" role="alert" hidden></p></section><section class="system-card"><h2>Aparelhos autorizados.</h2><p class="system-muted">Você pode autorizar até '+data.maximum+' aparelhos. Desative aqui um aparelho perdido ou que não utiliza mais.</p>'+(data.devices.length?'<div class="system-list">'+data.devices.map(device=>'<div class="system-row admin-push-device"><span><strong>'+e(device.label)+(device.id===id?' · este aparelho':'')+'</strong><small>Último envio: '+e(stamp(device.lastSentAt))+(device.lastError?' · houve uma falha de entrega':'')+'</small></span><button class="button outline" type="button" data-revoke-push="'+e(device.id)+'">Desativar</button></div>').join('')+'</div>':'<p>Nenhum aparelho autorizado.</p>')+'</section>';
 const refresh=()=>notificationView(view,{toast});
 async function action(button,operation){
  button.disabled=true;button.setAttribute('aria-busy','true');const error=view.querySelector('#push-error');error.hidden=true;
  try{await operation();if(view.isConnected&&view.querySelector('#push-state'))await refresh();}
  catch(reason){if(error.isConnected){error.textContent=reason.message;error.hidden=false;}else toast(reason.message);}
  finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
 }
 view.querySelector('#push-enable')?.addEventListener('click',event=>{
  // Request permission directly inside the click, before network/reauth awaits.
  const permission=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  action(event.currentTarget,async()=>{
   if(await permission!=='granted')throw Error('A permissão de notificação não foi concedida. Confira as permissões deste site.');
   const current=await navigator.serviceWorker.register('/painel/sw.js',{scope:'/painel/',updateViaCache:'none'});
   const ready=await activated(current);
   let sub=await ready.pushManager.getSubscription();
   if(sub&&(!sub.options?.applicationServerKey||encode(sub.options.applicationServerKey)!==data.publicKey)){await sub.unsubscribe();sub=null;}
   let created=false;if(!sub){sub=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(data.publicKey)});created=true;}
   try{await api('/api/admin/notifications/subscription',{method:'POST',body:{subscription:sub.toJSON(),label:deviceLabel()}});}
   catch(reason){if(created)await sub.unsubscribe().catch(()=>{});throw reason;}
   toast('Avisos ativados. Envie a notificação de teste para conferir este aparelho.');
  });
 });
 view.querySelector('#push-test')?.addEventListener('click',event=>action(event.currentTarget,async()=>{await api('/api/admin/notifications/test',{method:'POST',body:{id}});toast('Teste enviado. Confira a notificação do celular.');}));
 async function revoke(deviceId){
  await api('/api/admin/notifications/subscription',{method:'DELETE',body:{id:deviceId}});
  if(deviceId===id)await subscription?.unsubscribe().catch(()=>{});
  toast('Avisos desativados para esse aparelho.');
 }
 view.querySelector('#push-disable')?.addEventListener('click',event=>action(event.currentTarget,()=>revoke(id)));
 for(const button of view.querySelectorAll('[data-revoke-push]'))button.addEventListener('click',event=>{
  if(!confirm('Desativar os avisos para esse aparelho?'))return;
  action(event.currentTarget,()=>revoke(event.currentTarget.dataset.revokePush));
 });
}
