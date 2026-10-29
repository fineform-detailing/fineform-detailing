import { NOTES, keyLabel, keyName } from './dsp.js';
import { AudioCapture } from './audio-capture.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CAPTURE_SECONDS=10;
const PATHS={
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  history:'<path d="M3 11a9 9 0 1 1 2.7 7M3 4v7h7m2-5v6l4 2"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8"/><circle cx="9" cy="7" r="4"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  settings:'<path d="m9 3-1 3-3 1-2 4 2 2-1 3 4 3 3-1 2 3 4-2v-3l3-2-1-4-3-1-1-3-4-1-2 1Z"/><circle cx="12" cy="12" r="3"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
  wave:'<path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>',
  broadcast:'<circle cx="12" cy="12" r="2"/><path d="M8 8a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 5v14m5-14v14m5-14v14M5 5v7h4V5m6 0v7h4V5"/>',
  guitar:'<path d="m16 7 4-4m-5 5 3 3 4-4-3-3-4 4ZM7 10c-4-1-6 3-4 7s6 6 9 3c1-1 1-3 0-4l5-5-4-4-4 5-2-2Z"/><circle cx="8" cy="16" r="1.5"/>',
  bass:'<path d="m15 8 5-5m-6 6 3 3 5-5-3-3-5 5ZM7 11c-3-1-6 3-4 7s7 5 9 2c1-2 0-4-1-5l5-5-3-3-4 5-2-1Z"/><path d="m6 17 3-3"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  music:'<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
  logout:'<path d="M9 5H3v14h6m4-14 7 7-7 7M9 12h11"/>',
  refresh:'<path d="M3 10a9 9 0 0 1 15-6l3 3m0-5v5h-5M21 14a9 9 0 0 1-15 6l-3-3m0 5v-5h5"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]||PATHS.music}</svg>`;}
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
// getRandomValues also supports browsers without crypto.randomUUID.
function newEventId(){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const instruments={bateria:{label:'Bateria',icon:'drums'},teclado:{label:'Teclado',icon:'keyboard'},baixo:{label:'Baixo',icon:'bass'},violao:{label:'Violão',icon:'guitar'}};
const defaults=Object.keys(instruments).map((instrument,slot)=>({id:'',slot,instrument,name:'',state:'empty'}));
let auth=null,isAdmin=false,adminCsrf='',csrf='',vapidPublicKey=null,room={room:null,members:defaults,events:[],acknowledgements:[]},dashboard={rooms:[],audit:[]},hasLoaded=false,refreshing=false,roomRevision=0,currentView='capture',toastTimer,pollTimer,swReady=null,result=null,selectedCandidate=0,pendingEvent=null,sharing=false,lastEventId=null;
const inviteCache=new Map();
let sharedResult=false;
const analysisDraft={title:'',singer:'',expanded:false};
const manualDraft={tonic:'0',mode:'major',title:'',singer:''};
const initialView=new URLSearchParams(location.search).get('tela');
const viewNames=['capture','history','band','guide','admin'];
function updateTaskFlow(){
 const phase=sharedResult?3:sharing?2:result?.candidates.length?1:0;
 document.querySelectorAll('[data-flow-step]').forEach((el,i)=>{el.classList.toggle('done',i<phase);el.classList.toggle('current',i===phase);if(i===phase)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('#task-status').textContent=sharedResult?'Tom compartilhado. Acompanhe as confirmações da banda.':sharing?'Etapa 3 de 3 · enviando o tom para a banda.':result?.candidates.length?'Etapa 2 de 3 · confira o tom antes de compartilhar.':capturing?'Etapa 1 de 3 · ouvindo até 10 segundos de melodia.':'Etapa 1 de 3 · ative o microfone ou indique o tom.';
 const pending=!!auth&&!!result?.candidates.length&&!sharedResult;
 $('#pending-analysis').hidden=!pending||currentView==='capture';
 if(!capturing&&!starting&&!finalizing){$('#capture-button').classList.toggle('primary',!result?.candidates.length);$('#capture-button').classList.toggle('secondary',!!result?.candidates.length);if(result?.candidates.length)$('#capture-button').innerHTML=icon('mic')+'<span>Analisar outro trecho</span>'+icon('arrow-right');}
}
function captureDraft(){analysisDraft.title=$('#result-title')?.value||'';analysisDraft.singer=$('#result-singer')?.value||'';analysisDraft.expanded=$('#result-details')?.open||false;}

let capturing=false,starting=false,finalizing=false,captureGeneration=0,captureSession=null,elapsed=0,interrupted=false;
const fragment=new URLSearchParams(location.hash.slice(1));let inviteCode=fragment.get('convite'),adminCode=fragment.get('administrar');
if(location.hash)history.replaceState(null,'',location.pathname);
PATHS.drums='<ellipse cx="12" cy="7" rx="9" ry="4"/><path d="M3 7v10c0 5 18 5 18 0V7M6 10v9m6-8v10m6-11v9M2 2l7 5m13-5-7 5"/>';
icons();
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,6000);}
async function api(path,{method='GET',body}={}){
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'EmTom',...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':path.startsWith('/api/admin/')?adminCsrf:csrf}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({error:'Resposta inesperada do servidor.'}));
  if(!response.ok){if(response.status===401&&auth&&!path.startsWith('/api/admin/')){auth=null;csrf='';room={room:null,members:defaults,events:[],acknowledgements:[]};renderAuth();}const error=new Error(data.error||'Não foi possível concluir.');error.status=response.status;throw error;}
  return data;
}
function setConnection(online){const el=$('#connection');el.classList.toggle('online',online&&!!auth);el.classList.toggle('offline',!online);el.querySelector('span').textContent=!online?'Sem conexão':auth?'Sala conectada':isAdmin?'Administração':'Sala privada';$('#offline-banner').hidden=online;}
function initials(name){return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'♪';}
function displayName(){return auth?(auth.name||instruments[auth.instrument].label):isAdmin?'Baterista':'Seu acesso';}
function renderAuth(){
  document.body.classList.toggle('admin-mode',isAdmin);$('#admin-nav').hidden=!isAdmin;$('#login-button').hidden=!!auth;$('#login-button').innerHTML=isAdmin?'Meu painel '+icon('settings'):'Abrir convite '+icon('arrow-right');
  $('#top-avatar').hidden=!auth;$('#top-avatar').textContent=initials(displayName());$('#profile-name').textContent=displayName();$('#profile-role').textContent=auth?auth.slot===0?'Criador desta sala':instruments[auth.instrument].label:isAdmin?'Painel de administração':'Abra o convite da sala';$('#avatar').textContent=initials(displayName());
  $('#access-banner').hidden=!!auth;$('#band-login').hidden=!!auth;$('#sidebar-room-name').textContent=room.room?.name||'Sala da banda';setConnection(navigator.onLine);renderRoom();updateTaskFlow();
}
function showView(view,{historyMode='replace',focus=false}={}){
  if(!viewNames.includes(view))view='capture';
  if((capturing||starting||finalizing)&&view!=='capture'){toast('Conclua a captação antes de trocar de tela.');history.replaceState({view:currentView},'',currentView==='capture'?'/':'/?tela='+currentView);return;}
  currentView=view;$$('.view').forEach(el=>el.hidden=el.id!=='view-'+view);$$('.nav-item').forEach(el=>{const active=el.dataset.view===view;el.classList.toggle('active',active);active?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current');});
  $('#page-label').textContent={admin:'Administração',capture:'Encontrar tom',history:'Histórico',band:'Minha banda',guide:'Como funciona'}[view];
  const path=view==='admin'?'/admin':view==='capture'?'/':'/?tela='+view;
  history[historyMode==='push'?'pushState':'replaceState']({view},'',path);
  if(view==='admin')loadDashboard().catch(e=>toast(e.message));
  window.scrollTo({top:0,behavior:'instant'});if(view==='history')renderHistory();if(view==='capture')drawWave(null);updateTaskFlow();if(focus){const heading=$('#view-'+view+' h1');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
}
function timeAgo(timestamp){const seconds=Math.max(0,Math.floor(Date.now()/1000)-timestamp);if(seconds<60)return 'Agora';if(seconds<3600)return `Há ${Math.floor(seconds/60)} min`;if(seconds<86400)return `Há ${Math.floor(seconds/3600)} h`;return new Date(timestamp*1000).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});}
function dateLabel(timestamp){return new Date(timestamp*1000).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function empty(title='Sua próxima música começa aqui.',description='Os tons que a banda compartilhar vão aparecer neste espaço.'){return `<div class="empty-state"><span>${icon('music')}</span><div><strong>${escape(title)}</strong><p>${escape(description)}</p></div></div>`;}
function eventRow(e){return `<article class="event-row"><div class="event-key">${keyLabel(e.tonic,e.mode)}</div><div class="event-text"><strong>${escape(e.title)}</strong><span>${escape(e.singer?e.singer+' · ':'')}${escape(keyName(e.tonic,e.mode))} · ${e.source==='manual'?'Confirmado por '+escape(e.author):'Estimado pelo trecho'}</span></div><div class="event-meta"><small>${timeAgo(e.created_at)}</small><span>${e.read_count}/3 músicos confirmaram</span></div>${auth&&auth.slot>0?`<button class="text-button ack-event" data-ack="${e.id}" title="Confirmar recebimento">${icon('check')} Recebido</button>`:''}</article>`;}
function renderRoom(){
  $('#history-count').textContent=room.events.length;$('#sidebar-room-name').textContent=room.room?.name||'Sala da banda';
  $('#erase-history').hidden=!(isAdmin&&auth&&room.room&&auth.room_id===room.room.id);$('#erase-history').disabled=!room.events.length;
  $('#recipient-row').innerHTML=room.members.filter(m=>m.slot>0).map(m=>`<span class="recipient ${m.state==='active'?'ready':''}" title="${escape(m.name||instruments[m.instrument].label)}">${icon(instruments[m.instrument].icon)} ${instruments[m.instrument].label}</span>`).join('');
  const latest=room.events[0];
  if(latest){$('#current-tone').classList.add('has-tone');$('#current-tone').innerHTML=`<div class="big-key">${keyLabel(latest.tonic,latest.mode)}</div><p>${escape(keyName(latest.tonic,latest.mode))}</p><span>${escape(latest.title)}${latest.singer?' · '+escape(latest.singer):''}<br>${timeAgo(latest.created_at)} · ${latest.source==='manual'?'Confirmado':'Estimado'}</span>`;const seen=room.acknowledgements.some(a=>a.event_id===latest.id&&a.member_id===auth?.id);$('#current-ack').hidden=!auth;$('#current-ack').innerHTML=`${auth?.slot>0?`<button class="button secondary small" data-ack="${latest.id}" ${seen?'disabled':''}>${icon('check')}${seen?'Você confirmou':'Recebido'}</button>`:''}<p>${latest.read_count}/3 músicos confirmaram${latest.push_accepted?' · '+latest.push_accepted+' avisos aceitos':''}</p>`;
  }else{$('#current-tone').classList.remove('has-tone');$('#current-tone').innerHTML='<div class="big-key">—</div><p>Aguardando o primeiro tom</p><span>Quando um tom for compartilhado,<br>ele aparece aqui para todo mundo.</span>';$('#current-ack').hidden=true;}
  $('#recent-events').innerHTML=room.events.length?room.events.slice(0,3).map(eventRow).join(''):empty();
  $('#members-grid').innerHTML=room.members.map(m=>`<article class="card member-card"><div class="member-icon">${icon(instruments[m.instrument].icon)}</div><h2>${instruments[m.instrument].label}</h2><p class="member-name">${escape(m.name||(m.slot===0?'Cria e organiza a sala':'Entra pelo convite, sem cadastro'))}</p>${m.slot===0?'<span class="owner-badge">CRIADOR DA SALA</span>':''}<div class="member-status"><span>${m.state==='active'?'● Aparelho conectado':'Aguardando entrada'}</span><span>${m.push_count?'Avisos ativados':'Avisos não ativados neste lugar'}</span></div>${isAdmin&&room.room&&m.slot>0&&m.state==='active'?`<button class="button secondary danger" data-remove="${m.id}">${icon('x')} Remover acesso</button>`:''}</article>`).join('');
  if(currentView==='history')renderHistory();
}
function renderHistory(){const query=$('#history-search').value.trim().toLocaleLowerCase('pt-BR');const events=room.events.filter(e=>`${e.title} ${e.singer} ${keyLabel(e.tonic,e.mode)} ${keyName(e.tonic,e.mode)}`.toLocaleLowerCase('pt-BR').includes(query));$('#history-events').innerHTML=events.length?events.map(eventRow).join(''):empty(query?'Nenhum tom encontrado.':'Ainda não há tons no histórico.',query?'Tente outra música, voz ou tonalidade.':'Compartilhe um tom para começar.');}
async function loadSession(){const data=await api('/api/session');auth=data.member;isAdmin=data.admin;csrf=data.csrf||'';adminCsrf=data.adminCsrf||'';vapidPublicKey=data.vapidPublicKey||null;renderAuth();if(auth)await refresh();}
async function refresh(){
  if(refreshing||!navigator.onLine)return;if(currentView==='admin'){if(isAdmin)await loadDashboard().catch(()=>setConnection(false));return;}if(!auth)return;refreshing=true;
  const roomId=auth.room_id,revision=roomRevision;
  try{const state=await api('/api/state');if(revision!==roomRevision||auth?.room_id!==roomId)return;room=state;renderRoom();setConnection(true);const latest=room.events[0];if(hasLoaded&&latest&&latest.id!==lastEventId)toast(`Novo tom: ${keyLabel(latest.tonic,latest.mode)} · ${latest.title}`);lastEventId=latest?.id||null;hasLoaded=true;}
  catch(e){setConnection(false);if(e.status===401){if(capturing)await stopCapture(true);toast(e.message);}console.info('A sala será sincronizada novamente.');}finally{refreshing=false;}
}
let modalTrigger=null;
$('#dialog').addEventListener('close',()=>{if(modalTrigger?.isConnected)modalTrigger.focus({preventScroll:true});});
function modal(title,body){const dialog=$('#dialog');if(!dialog.open)modalTrigger=document.activeElement;dialog.oncancel=null;$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" id="close-dialog" aria-label="Fechar">${icon('x')}</button></div>${body}`;$('#close-dialog').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();else dialog.querySelector('input,select,button')?.focus();}
function modalError(message){let el=$('#modal-error');if(!el){el=document.createElement('div');el.id='modal-error';el.className='error-message';el.setAttribute('role','alert');$('#dialog-content').append(el);}el.textContent=message;}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Copiado.');return true;}catch{toast('Não foi possível copiar. Selecione o link e copie manualmente.');return false;}}
function download(name,content,type='text/plain;charset=utf-8'){const blob=new Blob([content],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function readSharedLink(text,kind){try{const u=new URL(text.trim());if(u.origin!==location.origin)throw 0;const code=new URLSearchParams(u.hash.slice(1)).get(kind);if(!/^[A-Za-z0-9_-]{43}$/.test(code||''))throw 0;return code;}catch{throw new Error('Cole o link completo do Em Tom, incluindo a parte depois de #.');}}
function login(){if(isAdmin){showView('admin');return;}modal('Abra o convite.<br>Entre para tocar.',`<p class="dialog-description">Peça o link da sala ao baterista. Você entra sem senha ou cadastro: só escolhe seu instrumento. Se já recebeu o link, cole aqui.</p><form id="invitation-form" class="dialog-form"><label>Link do convite<input id="invitation-input" type="text" required autocomplete="off" spellcheck="false" placeholder="Cole o link enviado pelo baterista"></label><button class="button primary" type="submit">Abrir convite ${icon('arrow-right')}</button></form><p class="dialog-footnote">É você quem cria as salas? <button id="open-admin-area" class="text-button">Abrir administração</button></p>`);$('#invitation-form').onsubmit=e=>{e.preventDefault();try{onboarding(readSharedLink($('#invitation-input').value,'convite'));}catch(error){modalError(error.message);}};$('#open-admin-area').onclick=()=>{$('#dialog').close();showView('admin');};}
async function onboarding(code){
  if(isAdmin){showView('admin');toast('Abra a sala pelo painel para entrar como baterista.');return;}
  modal('Abrindo seu convite…','<p class="dialog-description">Conferindo os lugares disponíveis na sala.</p>');
  try{const data=await api('/api/invitation',{method:'POST',body:{code}});modal(escape(data.name),`<p class="dialog-description">Sem senha, e-mail ou cadastro. Escolha o instrumento que você toca e entre. O baterista já cuida da sala.</p>${data.available.length?`<form id="onboarding-form" class="dialog-form"><label>Seu instrumento<select id="member-instrument">${data.available.map(i=>`<option value="${i}">${instruments[i].label}</option>`).join('')}</select></label><label>Apelido (opcional)<input id="member-name" autocomplete="off" maxlength="30" placeholder="Pode deixar em branco"></label><button class="button primary" type="submit">Entrar na sala ${icon('arrow-right')}</button></form>`:'<p class="error-message">Os três lugares estão ocupados. Se trocou de aparelho, peça ao baterista para liberar seu instrumento.</p>'}<p class="dialog-footnote">Este navegador lembrará seu lugar por até 7 dias, enquanto a sala estiver ativa. Seu áudio fica no aparelho. Não encaminhe o convite para pessoas de fora da banda.</p>`);const form=$('#onboarding-form');if(form)form.onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await api('/api/room/join',{method:'POST',body:{code,instrument:$('#member-instrument').value,name:$('#member-name').value}});inviteCode=null;currentView='capture';await loadSession();$('#dialog').close();showView('capture');toast('Você entrou. Ative os avisos neste celular para receber os tons.');}catch(error){modalError(error.message);}finally{button.disabled=false;}};}catch(e){modal('Convite indisponível',`<p class="dialog-description">${escape(e.message)}</p><button class="button secondary" id="retry-invite">Tentar outro convite</button>`);$('#retry-invite').onclick=login;}
}
function showLink(title,description,url,{recovery=false,expires,roomId}={}){
  modal(title,`<p class="dialog-description">${description}</p><div class="key-box" id="shared-link"></div><div class="dialog-actions"><button id="copy-shared-link" class="button primary">${icon('copy')} Copiar ${recovery?'meu acesso':'convite'}</button>${recovery?'<button id="save-shared-link" class="button secondary">Salvar acesso</button>':'<button id="share-shared-link" class="button secondary">Compartilhar</button>'}</div>${expires?`<p class="dialog-footnote">Válido até ${dateLabel(expires)}. ${recovery?'Uso único. Guarde em local privado.':'Este convite abre somente os três lugares da sala. Quem já entrou mantém seu acesso.'}</p>`:''}${!recovery?'<button id="go-room" class="text-button link-room-action">Ir para a sala '+icon('arrow-right')+'</button>':''}`);
  $('#shared-link').textContent=url;$('#copy-shared-link').onclick=()=>copyText(url);
  if(recovery)$('#save-shared-link').onclick=()=>download('em-tom-meu-painel.txt',`EM TOM · ACESSO PRIVADO À ADMINISTRAÇÃO\n\n${url}\n\nUso único. Não envie este link aos músicos.\nGere um novo link de recuperação no painel após utilizá-lo.\n`);
  else{$('#share-shared-link').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Sala da banda · Em Tom',text:'Entre na sala, escolha seu instrumento e ative os avisos. Sem cadastro.',url});}catch(e){if(e.name!=='AbortError')toast('Copie o convite para compartilhar.');}}else await copyText(url);};$('#go-room').onclick=()=>{$('#dialog').close();if(isAdmin&&roomId&&auth?.room_id!==roomId)openRoom(roomId);else showView('capture');};}
}
async function loadDashboard(){
  $('#admin-locked').hidden=isAdmin;$('#admin-content').hidden=!isAdmin;$('#create-room').hidden=!isAdmin;if(!isAdmin)return;
  try{dashboard=await api('/api/admin/dashboard');renderDashboard();setConnection(true);}catch(e){if(e.status===401){isAdmin=false;adminCsrf='';dashboard={rooms:[],audit:[]};inviteCache.clear();if(auth?.slot===0){auth=null;csrf='';room={room:null,members:defaults,events:[],acknowledgements:[]};}renderAuth();$('#admin-locked').hidden=false;$('#admin-content').hidden=true;$('#create-room').hidden=true;}throw e;}
}
const actionNames={admin_access_activated:'Acesso administrativo ativado',admin_recovery_rotated:'Link de recuperação renovado',room_created:'Sala criada',invite_rotated:'Novo convite gerado',invitations_locked:'Novas entradas bloqueadas',room_extended:'Validade da sala renovada',member_removed:'Acesso de músico removido',history_erased:'Histórico apagado',room_closed:'Sala encerrada'};
function renderDashboard(){
  const now=dashboard.serverTime,active=dashboard.rooms.filter(r=>!r.closed_at&&r.expires>now);$('#stat-rooms').textContent=active.length;$('#stat-members').textContent=active.reduce((n,r)=>n+r.participants,0);
  $('#admin-rooms').innerHTML=active.length?active.map(r=>`<article class="card admin-room"><div class="admin-room-head"><span class="member-icon">${icon('users')}</span><div><h3>${escape(r.name)}</h3><p>Ativa até ${dateLabel(r.expires)} · ${r.participants}/3 músicos</p></div><span class="status-pill">● Ativa</span></div><div class="room-numbers"><span>${icon('bell')} ${r.notifications} aparelho(s) com avisos</span><span>${icon('music')} ${r.events} tons no histórico</span></div><div class="admin-room-actions"><button class="button primary" data-room-open="${r.id}">Abrir sala ${icon('arrow-right')}</button><button class="button secondary" data-room-invite="${r.id}">${icon('copy')} ${inviteCache.has(r.id)?'Copiar convite':'Gerar convite'}</button><button class="text-button" data-room-manage="${r.id}">Gerenciar ${icon('settings')}</button></div></article>`).join(''):empty('Nenhuma sala ativa.','Toque em “Criar sala” para começar. Salas encerradas ou expiradas saem desta lista automaticamente.');
  $('#admin-audit').innerHTML=dashboard.audit.length?dashboard.audit.map(a=>`<div class="audit-row"><span>${escape(actionNames[a.action]||'Ação administrativa')}</span><small>${timeAgo(a.created_at)}</small></div>`).join(''):'<p class="dialog-footnote">As ações do painel aparecerão aqui, sem registrar voz ou senhas.</p>';
}
function createRoom(){
  modal('Crie a sala.<br>Chame a banda.',`<p class="dialog-description">Você entra como baterista e criador da sala. Teclado, baixo e violão abrem o convite e escolhem seu lugar, sem cadastro.</p><form id="create-room-form" class="dialog-form"><label>Nome da sala<input id="room-name-input" maxlength="60" placeholder="Ex.: Ensaio de domingo" autocomplete="off"></label><button class="button primary" type="submit">Criar sala ${icon('arrow-right')}</button></form><p class="dialog-footnote">A sala dura 7 dias e pode ser renovada. O convite vale por 24 horas. Você pode bloquear novas entradas ou remover um acesso a qualquer momento.</p>`);
  $('#create-room-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const data=await api('/api/admin/rooms',{method:'POST',body:{name:$('#room-name-input').value}});inviteCache.set(data.roomId,{url:data.inviteUrl,expires:data.inviteExpires});currentView='capture';hasLoaded=false;await loadSession();showView('band');showLink('Sua sala está pronta.','Envie este convite para teclado, baixo e violão. Cada músico abre no próprio celular e escolhe seu instrumento.',data.inviteUrl,{expires:data.inviteExpires,roomId:data.roomId});}catch(error){modalError(error.message);}finally{button.disabled=false;}};
}
async function openRoom(id,view='capture'){try{await api('/api/admin/rooms/open',{method:'POST',body:{roomId:id}});currentView=view;hasLoaded=false;await loadSession();showView(view);}catch(e){toast(e.message);}}
async function roomInvite(id){
  const cached=inviteCache.get(id);if(cached&&cached.expires>Date.now()/1000){showLink('O convite da sua sala.','Envie este link aos três músicos. Quem já entrou pode voltar pelo mesmo navegador.',cached.url,{expires:cached.expires,roomId:id});return;}
  modal('Gerar um novo convite?',`<p class="dialog-description">O convite anterior desta sala deixará de funcionar. Quem já entrou continua conectado. O novo link vale por até 24 horas.</p><button id="confirm-new-invite" class="button primary">Gerar convite ${icon('copy')}</button>`);
  $('#confirm-new-invite').onclick=async e=>{e.currentTarget.disabled=true;try{const data=await api('/api/admin/rooms/invite',{method:'POST',body:{roomId:id}});inviteCache.set(id,data);showLink('Convite pronto.','Envie este link somente para teclado, baixo e violão.',data.url,{expires:data.expires,roomId:id});if(currentView==='admin')await loadDashboard();}catch(error){modalError(error.message);if($('#confirm-new-invite'))$('#confirm-new-invite').disabled=false;}};
}
function confirmAction(title,description,action){modal(title,`<p class="dialog-description">${description}</p><div class="dialog-actions"><button id="cancel-action" class="button secondary">Cancelar</button><button id="confirm-action" class="button primary">Confirmar</button></div>`);$('#cancel-action').onclick=()=>$('#dialog').close();$('#confirm-action').onclick=async e=>{e.currentTarget.disabled=true;try{await action();$('#dialog').close();}catch(error){modalError(error.message);if($('#confirm-action'))$('#confirm-action').disabled=false;}};}
function eraseHistory(id){
  if(!isAdmin||!id)return;
  confirmAction('Apagar o histórico?','Todos os tons e suas confirmações serão apagados desta sala para a banda inteira. A sala e os participantes continuam conectados. Esta ação não pode ser desfeita.',async()=>{
    await api('/api/admin/rooms/history',{method:'DELETE',body:{roomId:id}});
    if(room.room?.id===id){roomRevision++;room.events=[];room.acknowledgements=[];lastEventId=null;$('#history-search').value='';renderRoom();}
    if(currentView==='admin')await loadDashboard();
    toast('Histórico apagado.');
  });
}
function manageRoom(id){const r=dashboard.rooms.find(r=>r.id===id)||room.room;if(!r)return;modal(escape(r.name),`<p class="dialog-description">Só seu acesso administrativo pode gerenciar esta sala.</p><div class="settings-actions"><button id="manage-members" class="button secondary">${icon('users')} Ver participantes e remover acesso</button><button id="manage-lock" class="button secondary">${icon('lock')} Bloquear novos convites</button><button id="manage-extend" class="button secondary">${icon('refresh')} Renovar sala por 7 dias</button><button id="manage-erase" class="button secondary danger">${icon('history')} Apagar histórico da sala</button><button id="manage-close" class="button secondary danger">${icon('x')} Encerrar sala e apagar dados</button></div><p class="dialog-footnote">Renovar a sala não prolonga o acesso do aparelho de cada músico. Depois de 7 dias, ele entra de novo pelo convite.</p>`);
  $('#manage-members').onclick=async()=>{$('#dialog').close();await openRoom(id,'band');};
  $('#manage-lock').onclick=()=>confirmAction('Bloquear novas entradas?','Os convites deixam de funcionar. Os músicos já conectados continuam na sala.',async()=>{await api('/api/admin/rooms/lock',{method:'POST',body:{roomId:id}});inviteCache.delete(id);await loadDashboard();toast('Novas entradas bloqueadas.');});
  $('#manage-extend').onclick=async()=>{try{await api('/api/admin/rooms/extend',{method:'POST',body:{roomId:id}});$('#dialog').close();await loadDashboard();toast('Sala renovada por 7 dias.');}catch(e){modalError(e.message);}};
  $('#manage-erase').onclick=()=>eraseHistory(id);
  $('#manage-close').onclick=()=>confirmAction('Encerrar esta sala?','Todos os acessos e avisos serão revogados. O histórico e os apelidos serão apagados. Esta ação não pode ser desfeita.',async()=>{await api('/api/admin/rooms/close',{method:'POST',body:{roomId:id}});inviteCache.delete(id);if(auth?.room_id===id){auth=null;room={room:null,members:defaults,events:[],acknowledgements:[]};renderAuth();}await loadDashboard();toast('Sala encerrada e dados apagados.');});
}
function privacy(){modal('Sua banda.<br>Seus dados.',`<p class="dialog-description">O microfone só é ativado quando você permite. O áudio é analisado no próprio celular, não é gravado nem enviado ao servidor.</p><div class="privacy-list"><p><strong>Sem cadastro:</strong> não pedimos e-mail, telefone ou senha. Apelido é opcional.</p><p><strong>Sala privada:</strong> convite aleatório com validade, três lugares, remoção de acessos e sessões protegidas no navegador.</p><p><strong>Dados mínimos:</strong> instrumento, apelido opcional, tons compartilhados, confirmações e os dados técnicos necessários para avisos. O aviso na tela bloqueada não mostra apelidos ou nomes de músicas.</p><p><strong>Validade:</strong> tons e registros de administração duram até 7 dias. Você pode sair e remover seu apelido e seu acesso; o baterista pode apagar o histórico ou encerrar a sala.</p><p><strong>Acesso no Brasil:</strong> o servidor usa a localização da conexão. Uma VPN pode mudar essa localização; o convite continua obrigatório.</p></div><p class="dialog-footnote">Nenhum sistema é invulnerável. Compartilhe o convite somente com a banda e mantenha seu link administrativo privado.</p>`);}
function profile(){if(!auth){if(isAdmin)showView('admin');else login();return;}modal(escape(displayName()),`<p class="dialog-description">${auth.slot===0?'Bateria · criador da sala':instruments[auth.instrument].label} · ${escape(room.room?.name||'Sala da banda')}</p><div class="settings-actions"><button id="profile-push" class="button secondary">${icon('bell')} Avisos neste celular</button><button id="profile-privacy" class="button secondary">${icon('shield')} Privacidade dos dados</button>${isAdmin?'<button id="profile-admin" class="button secondary">'+icon('settings')+' Abrir painel de administração</button>':''}<button id="leave-room" class="button secondary danger">${icon('logout')} ${auth.slot===0?'Sair da sala neste aparelho':'Sair e remover meu acesso'}</button></div><p class="dialog-footnote">${auth.slot===0?'Seu painel continua disponível ao sair da sala.':'Ao sair, seu acesso, apelido, avisos e confirmações são removidos. Tons que você compartilhou ficam sem seu apelido até a exclusão do histórico. Para voltar, abra um convite válido.'}</p>`);$('#profile-push').onclick=notificationSettings;$('#profile-privacy').onclick=privacy;if(isAdmin)$('#profile-admin').onclick=()=>{$('#dialog').close();showView('admin');};$('#leave-room').onclick=()=>confirmAction('Sair desta sala?','Os avisos deste navegador serão desativados. Para voltar, você precisará abrir a sala novamente.',async()=>{const registration=await swReady?.catch(()=>null),sub=await registration?.pushManager?.getSubscription();await api('/api/room/leave',{method:'POST',body:{}});await sub?.unsubscribe().catch(()=>{});auth=null;csrf='';room={room:null,members:defaults,events:[],acknowledgements:[]};renderAuth();if(isAdmin)showView('admin');toast('Você saiu desta sala.');});}
function pushSupported(){return 'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;}
function notificationSettings(){
  if(!auth){login();return;}
  const supported=pushSupported(),denied=supported&&Notification.permission==='denied';
  modal('O próximo tom<br>chega até você.',`<p class="dialog-description">Receba os tons no celular, mesmo com a página fechada, quando seu navegador e aparelho permitirem.</p><div class="notification-details"><span>${icon('info')}</span><p>${!supported?'Este navegador ainda não disponibilizou notificações. No iPhone, adicione o site à Tela de Início e abra pelo ícone. No Android, use um navegador atualizado.':denied?'As notificações estão bloqueadas. Libere a permissão para este site nas configurações do navegador e volte aqui.':'No iPhone, primeiro adicione à Tela de Início e abra pelo ícone. Depois toque em ativar e permita os avisos.'}</p></div><div class="dialog-form"><button id="activate-notifications" class="button primary" ${!supported||denied||!vapidPublicKey?'disabled':''}>${icon('bell')} Ativar avisos neste celular</button><details class="advanced-options"><summary>Teste e outras opções</summary><button id="test-notifications" class="button secondary">Enviar aviso de teste</button><button id="disable-notifications" class="text-button">Desativar neste aparelho</button></details></div><p class="dialog-footnote">O aviso depende da internet, da permissão e dos modos de foco/economia do celular. A sala também se atualiza a cada 5 segundos enquanto está aberta. “Aceito” pelo serviço de avisos não comprova que o músico leu.</p>`);
  $('#activate-notifications').onclick=enablePush;$('#test-notifications').onclick=async e=>{e.currentTarget.disabled=true;try{const data=await api('/api/push/test',{method:'POST',body:{}});toast(data.accepted?'Aviso aceito pelo serviço. Confira seu celular.':'Nenhum aviso foi aceito. Ative os avisos neste aparelho primeiro.');}catch(error){modalError(error.message);}finally{if($('#test-notifications'))$('#test-notifications').disabled=false;}};
  $('#disable-notifications').onclick=async()=>{try{const registration=await swReady?.catch(()=>null),sub=await registration?.pushManager.getSubscription();if(sub){await api('/api/push',{method:'DELETE',body:{endpoint:sub.endpoint}});await sub.unsubscribe();}await refresh();toast('Avisos desativados neste aparelho.');$('#dialog').close();}catch(e){modalError(e.message);}};
}
function urlBytes(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));}
async function enablePush(e){
  const button=e.currentTarget;button.disabled=true;
  try{const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Os avisos não foram permitidos. Você pode tentar novamente nas configurações do navegador.');const registration=await swReady;if(!registration)throw new Error('Não foi possível preparar os avisos. Recarregue a página.');let subscription=await registration.pushManager.getSubscription();if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBytes(vapidPublicKey)});await api('/api/push',{method:'POST',body:subscription.toJSON()});await refresh();toast('Avisos ativados neste celular. Envie um teste para conferir.');$('#notifications-button .notification-dot').hidden=false;}
  catch(error){modalError(error.message||'Não foi possível ativar os avisos.');}finally{button.disabled=false;}
}
function drawWave(samples){const canvas=$('#waveform'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;}const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);const w=canvas.width,h=canvas.height,n=Math.floor(w/(5*dpr)),gap=w/n;for(let i=0;i<n;i++){let height;if(samples){const from=Math.floor(i*samples.length/n),to=Math.floor((i+1)*samples.length/n);let amp=0;for(let j=from;j<to;j++)amp=Math.max(amp,Math.abs(samples[j]));height=Math.max(2*dpr,Math.min(h*.9,amp*h*3));}else height=dpr*(3+Math.sin(i*.39)**2*7)*(0.25+0.75*Math.sin(Math.PI*i/n)**2);ctx.fillStyle=capturing?'#f18a42':i%5===0?'#b77e49':'#6a4a2d';ctx.beginPath();ctx.roundRect(i*gap,h/2-height/2,Math.max(dpr,gap-2.6*dpr),height,2*dpr);ctx.fill();}}
function captureUI(active){
  $('#manual-button').disabled=active||starting||finalizing;
  $('#capture-button').classList.toggle('primary',active||!result?.candidates.length);$('#capture-button').classList.toggle('secondary',!active&&!!result?.candidates.length);
  $('#capture-button').innerHTML=active?`${icon('stop')}<span>Concluir análise</span>${icon('arrow-right')}`:`${icon('mic')}<span>Ativar microfone</span>${icon('arrow-right')}`;
  $('#capture-status').innerHTML=active?'<i></i> Ouvindo a melodia':'<i></i> Pronto para ouvir';$('#capture-status').classList.toggle('recording',active);
  $('#microphone-hint').textContent=active?`Cante ou toque uma melodia solo. A análise termina em ${CAPTURE_SECONDS} segundos.`:'Aproxime o celular da voz ou do instrumento que faz a melodia.';
}
function captureProgress(seconds){
  elapsed=Math.min(CAPTURE_SECONDS,Math.max(0,seconds));
  $('#elapsed').textContent=`00:${String(Math.floor(elapsed)).padStart(2,'0')}`;
  $('#capture-progress').style.width=`${elapsed/CAPTURE_SECONDS*100}%`;
  const track=$('#capture-progress').parentElement;track.setAttribute('aria-valuenow',String(Math.floor(elapsed)));track.setAttribute('aria-valuetext',Math.floor(elapsed)+' de '+CAPTURE_SECONDS+' segundos');
}
function captureFailure(error){
  capturing=starting=finalizing=false;captureSession=null;captureUI(false);$('#capture-button').disabled=false;
  $('#live-frequency').textContent='O primeiro passo é dar o play na sua voz.';updateTaskFlow();
  if(error.name==='AbortError')return;
  toast({NotAllowedError:'Microfone bloqueado. Libere o acesso nas permissões do navegador.',NotFoundError:'Não encontramos um microfone neste aparelho.',NotReadableError:'O microfone está ocupado por outro aplicativo.',SecurityError:'Abra o site por HTTPS para usar o microfone.'}[error.name]||error.message||'Não foi possível iniciar a captação. Tente novamente.');
}
async function startCapture(){
  if(!auth){login();return;}if(starting||capturing||finalizing)return;
  starting=true;const generation=++captureGeneration;$('#capture-button').disabled=true;$('#capture-button').innerHTML=`${icon('mic')}<span>Aguardando microfone…</span>`;
  const current=()=>generation===captureGeneration;
  const waitTimer=setTimeout(()=>{if(starting&&current())toast('Permita o microfone no aviso do navegador para continuar.');},9000);
  const session=new AudioCapture({
    duration:CAPTURE_SECONDS,
    onProgress:seconds=>{if(current()&&capturing)captureProgress(seconds);},
    onPitch:data=>{
      if(!current()||!capturing)return;
      const p=data.pitch;
      $('#live-note').classList.toggle('detected',!!p);
      $('#live-note').innerHTML=p?`${p.note}<span>${p.octave}</span>`:'—<span></span>';
      $('#live-frequency').textContent=p?`${p.frequency.toFixed(1)} Hz · ${p.cents>0?'+':''}${p.cents} cents`:'Aguardando uma nota estável…';
      $('#capture-tip').textContent=data.clipped>.02?'Som muito alto. Afaste um pouco o celular.':data.rms<.0015?'Sinal baixo. Aproxime o celular.':data.voicedSeconds>0?`${data.voicedSeconds.toFixed(1)} s de notas estáveis`:'Ouvindo a melodia';
      drawWave(data.wave);
    },
    onFinishing:()=>{
      if(!current())return;capturing=false;finalizing=true;$('#capture-button').disabled=true;
      $('#capture-button').innerHTML=`${icon('wave')}<span>Concluindo análise…</span>`;
    },
    onResult:analysis=>{
      if(!current())return;
      capturing=starting=finalizing=false;captureSession=null;interrupted=!!analysis.interrupted;captureProgress(analysis.duration);
      captureUI(false);$('#capture-button').disabled=false;$('#capture-tip').textContent=interrupted?'Captação interrompida':'Trecho analisado';drawWave(null);
      result=analysis;sharedResult=false;selectedCandidate=0;pendingEvent=null;renderResult();if(result.reliable&&!interrupted)shareResult(true);
    },
    onError:error=>{if(current())captureFailure(error);}
  });
  captureSession=session;
  try{
    await session.start();if(!current())return;
    capturing=true;starting=false;interrupted=false;captureProgress(0);result=null;sharedResult=false;pendingEvent=null;analysisDraft.title='';analysisDraft.singer='';analysisDraft.expanded=false;updateTaskFlow();
    $('#analysis-result').hidden=true;$('#live-note').classList.remove('detected');$('#live-note').innerHTML='—<span></span>';
    $('#live-frequency').textContent='Aguardando uma nota estável…';captureUI(true);
  }catch(error){if(current())captureFailure(error);}
  finally{clearTimeout(waitTimer);if(current()){starting=false;$('#capture-button').disabled=finalizing;}}
}
function stopCapture(wasInterrupted=false){captureSession?.stop(wasInterrupted);}
function cancelCapture(){
  captureGeneration++;const session=captureSession;captureSession=null;capturing=starting=finalizing=false;
  session?.dispose();captureUI(false);$('#capture-button').disabled=false;
}
function renderResult(){
  updateTaskFlow();
  const panel=$('#analysis-result');panel.hidden=false;
  if(!result?.candidates.length){panel.innerHTML=`<div class="result-heading"><h2>Ainda não encontramos a melodia.</h2></div><p class="dialog-description">Cante um trecho com notas diferentes e aproxime o celular da voz. Uma nota isolada ou um ambiente com instrumentos não define o tom da música.</p><button class="button secondary" id="retry-capture">${icon('mic')} Tentar outro trecho</button>`;$('#retry-capture').onclick=startCapture;return;}
  const chosen=result.candidates[selectedCandidate],reliable=result.reliable&&!interrupted;
  panel.innerHTML=`<div class="result-heading"><h2>${reliable?'Tonalidade sugerida':'Vamos conferir o tom?'}</h2><span>Qualidade ${result.confidence}/100</span></div><div class="result-summary"><div class="result-key">${keyLabel(chosen.tonic,chosen.mode)}</div><div><strong>${keyName(chosen.tonic,chosen.mode)}</strong><p>${escape(interrupted?'A captação foi interrompida. Confirme antes de compartilhar.':result.reason)}</p></div></div><div class="candidate-options">${result.candidates.map((c,i)=>`<button type="button" class="candidate-button ${i===selectedCandidate?'selected':''}" aria-pressed="${i===selectedCandidate}" data-candidate="${i}">${c.label} · ${c.mode==='major'?'maior':'menor'}</button>`).join('')}</div><details class="advanced-options" id="result-details" ${analysisDraft.expanded?'open':''}><summary>Identificar música e voz (opcional)</summary><div class="inline-fields"><label>Música (opcional)<input id="result-title" maxlength="80" placeholder="Nome da música"></label><label>Quem canta (opcional)<input id="result-singer" maxlength="50" placeholder="Nome da pessoa"></label></div></details><div class="analysis-actions"><button id="share-result" class="button primary">${icon('broadcast')} ${reliable?'Compartilhar com a banda':'Confirmar e avisar a banda'}</button><button id="different-key" class="text-button">Escolher outro tom ${icon('arrow-up-right')}</button></div><p id="result-send-status" class="analysis-note">${reliable?'Uma análise definida será compartilhada automaticamente.':'A sugestão precisa da sua confirmação. Nenhum tom foi enviado.'} O índice de qualidade não é uma probabilidade de acerto.</p>`;
  $('#result-title').value=analysisDraft.title;$('#result-singer').value=analysisDraft.singer;
  $('#result-title').oninput=$('#result-singer').oninput=captureDraft;$('#result-details').ontoggle=()=>{analysisDraft.expanded=$('#result-details').open;};
  $('#share-result').onclick=()=>shareResult(false);$('#different-key').onclick=manual;
  panel.querySelectorAll('[data-candidate]').forEach(button=>button.onclick=()=>{if(sharing)return;captureDraft();selectedCandidate=Number(button.dataset.candidate);pendingEvent=null;renderResult();panel.querySelector('[data-candidate="'+selectedCandidate+'"]')?.focus({preventScroll:true});});
  panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
}
async function shareResult(automatic){
  if(!auth){login();return;}if(!result?.candidates.length||sharing)return;
  const chosen=result.candidates[selectedCandidate];
  if(!pendingEvent)pendingEvent={id:newEventId(),tonic:chosen.tonic,mode:chosen.mode,confidence:result.confidence,duration:result.duration,source:automatic?'estimated':'manual',title:$('#result-title')?.value||'',singer:$('#result-singer')?.value||''};
  sharing=true;updateTaskFlow();const button=$('#share-result');if(button){button.disabled=true;button.innerHTML=`${icon('broadcast')} Enviando para a banda…`;}
  try{await api('/api/events',{method:'POST',body:pendingEvent});$('#result-send-status').textContent='Tom compartilhado. Os avisos foram colocados na fila de envio; acompanhe as confirmações da banda.';if(button)button.innerHTML=`${icon('check')} Tom compartilhado`;sharedResult=true;updateTaskFlow();$('[data-candidate]')?.parentElement.querySelectorAll('button').forEach(b=>b.disabled=true);if($('#different-key'))$('#different-key').hidden=true;await refresh();toast(`${keyLabel(pendingEvent.tonic,pendingEvent.mode)} compartilhado com a banda.`);pendingEvent=null;}
  catch(error){if(button){button.disabled=false;button.innerHTML=`${icon('refresh')} Tentar enviar novamente`;}if($('#result-send-status'))$('#result-send-status').textContent='Envio não confirmado. Seu resultado está aqui; tente novamente com conexão.';updateTaskFlow();toast(error.message||'Não foi possível enviar. Tente novamente.');}
  finally{sharing=false;updateTaskFlow();}
}
function manual(){
  if(!auth){login();return;}
  modal('Você conhece o tom.<br>A banda fica sabendo.',`<p class="dialog-description">Escolha a tonalidade e envie para os três músicos. Este resultado ficará marcado como confirmado manualmente.</p><form id="manual-form" class="dialog-form"><div class="inline-fields"><label>Nota<select id="manual-tonic">${NOTES.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>Modo<select id="manual-mode"><option value="major">Maior</option><option value="minor">Menor</option></select></label></div><label>Música (opcional)<input id="manual-title" maxlength="80" placeholder="Nome da música"></label><label>Quem canta (opcional)<input id="manual-singer" maxlength="50" placeholder="Nome da pessoa"></label><button class="button primary" type="submit">${icon('broadcast')} Avisar a banda</button></form>`);
  for(const key of ['tonic','mode','title','singer']){$('#manual-'+key).value=manualDraft[key];$('#manual-'+key).addEventListener('input',e=>{manualDraft[key]=e.target.value;});}
  const eventId=newEventId();$('#manual-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter||$('#manual-form button[type="submit"]');button.disabled=true;try{await api('/api/events',{method:'POST',body:{id:eventId,tonic:Number($('#manual-tonic').value),mode:$('#manual-mode').value,confidence:0,duration:0,source:'manual',title:$('#manual-title').value,singer:$('#manual-singer').value}});manualDraft.title='';manualDraft.singer='';result=null;pendingEvent=null;$('#analysis-result').hidden=true;sharedResult=true;updateTaskFlow();$('#dialog').close();await refresh();toast('Tom compartilhado com a banda.');}catch(error){modalError(error.message);}finally{button.disabled=false;}};
}

document.addEventListener('click',async e=>{
  const nav=e.target.closest('[data-view]');if(nav){showView(nav.dataset.view,{historyMode:'push',focus:true});return;}
  const acknowledgement=e.target.closest('[data-ack]');if(acknowledgement){if(!auth){login();return;}try{acknowledgement.disabled=true;await api('/api/ack',{method:'POST',body:{eventId:acknowledgement.dataset.ack}});await refresh();toast('Recebimento confirmado.');}catch(error){toast(error.message);acknowledgement.disabled=false;}return;}
  const open=e.target.closest('[data-room-open]');if(open){await openRoom(open.dataset.roomOpen);return;}
  const invitation=e.target.closest('[data-room-invite]');if(invitation){await roomInvite(invitation.dataset.roomInvite);return;}
  const manage=e.target.closest('[data-room-manage]');if(manage){manageRoom(manage.dataset.roomManage);return;}
  const removal=e.target.closest('[data-remove]');if(removal){const id=removal.dataset.remove;confirmAction('Remover este acesso?','Este músico será desconectado e perderá os avisos. Os convites anteriores serão bloqueados. Gere um novo convite para liberar a entrada de um substituto.',async()=>{await api('/api/admin/rooms/remove',{method:'POST',body:{roomId:room.room.id,memberId:id}});inviteCache.delete(room.room.id);await refresh();toast('Acesso removido e convite anterior bloqueado. Gere um novo convite para o substituto.');});}
});
$('#login-button').onclick=login;$('#banner-login').onclick=login;$('#band-login').onclick=login;$('#profile-button').onclick=profile;$('#top-avatar').onclick=profile;
$('#notifications-button').onclick=notificationSettings;$('#enable-push-card').onclick=notificationSettings;$('#manual-button').onclick=manual;
$('#capture-button').onclick=()=>{if(capturing){stopCapture();return;}if(result?.candidates.length&&!sharedResult){confirmAction('Analisar outro trecho?','A sugestão atual ainda não foi compartilhada. Ela será substituída pela próxima análise.',async()=>{await startCapture();});return;}startCapture();};
$('#resume-analysis').onclick=()=>{showView('capture',{historyMode:'push'});$('#analysis-result').scrollIntoView({behavior:'auto',block:'center'});$('#share-result')?.focus({preventScroll:true});};
window.addEventListener('popstate',()=>{const view=location.pathname.startsWith('/admin')?'admin':new URLSearchParams(location.search).get('tela')||'capture';showView(view,{focus:true});});$('#history-search').oninput=renderHistory;
$('#erase-history').onclick=()=>{if(room.events.length)eraseHistory(room.room?.id);};
$('#export-history').onclick=()=>{if(!auth){login();return;}if(!room.events.length){toast('Ainda não há tons para exportar.');return;}download('em-tom-historico.json',JSON.stringify(room.events.map(e=>({musica:e.title,voz:e.singer,tom:keyLabel(e.tonic,e.mode),origem:e.source==='manual'?'manual':'estimado',qualidade:e.confidence,compartilhadoPor:e.author,data:new Date(e.created_at*1000).toISOString(),confirmacoes:e.read_count})),null,2),'application/json');};
window.addEventListener('online',()=>{setConnection(true);refresh();});window.addEventListener('offline',()=>setConnection(false));window.addEventListener('resize',()=>{if(!capturing)drawWave(null);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(starting)cancelCapture();else if(capturing||finalizing)stopCapture(true);clearInterval(pollTimer);}else{refresh();clearInterval(pollTimer);pollTimer=setInterval(refresh,5000);}});
window.addEventListener('pagehide',cancelCapture);
if('serviceWorker'in navigator){swReady=navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready).catch(()=>null);navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='refresh')refresh();});}
$('#create-room').onclick=createRoom;$('#refresh-admin').onclick=()=>loadDashboard().catch(e=>toast(e.message));
$('#paste-admin-link').onclick=()=>{modal('Seu painel de administração',`<p class="dialog-description">Cole seu link privado ou de recuperação. Ele não é o convite enviado aos músicos.</p><form id="admin-link-form" class="dialog-form"><label>Link de administração<input id="admin-link-input" required autocomplete="off" spellcheck="false"></label><button class="button primary" type="submit">Abrir meu painel</button></form>`);$('#admin-link-form').onsubmit=async e=>{e.preventDefault();try{const code=readSharedLink($('#admin-link-input').value,'administrar');await api('/api/admin/activate',{method:'POST',body:{code}});await loadSession();$('#dialog').close();showView('admin');}catch(error){modalError(error.message);}};};
$('#admin-recovery').onclick=()=>confirmAction('Gerar seu acesso de recuperação?','O link anterior de recuperação e os outros acessos administrativos serão revogados. Este aparelho continua conectado. Guarde o novo link em local privado.',async()=>{const data=await api('/api/admin/recovery',{method:'POST',body:{}});setTimeout(()=>showLink('Seu acesso de recuperação.','Este link dá controle do aplicativo. Guarde para trocar de aparelho. Não envie aos músicos. Após usá-lo, gere outro no painel.',data.url,{recovery:true,expires:data.expires}),0);});
$('#admin-privacy').onclick=privacy;
$('#admin-logout').onclick=()=>confirmAction('Sair da administração?','Guarde seu link de recuperação antes de sair. Ele será necessário para abrir o painel novamente.',async()=>{await api('/api/admin/logout',{method:'POST',body:{}});isAdmin=false;auth=null;csrf='';adminCsrf='';inviteCache.clear();room={room:null,members:defaults,events:[],acknowledgements:[]};renderAuth();showView('admin');toast('Administração desconectada neste aparelho.');});
async function bootstrap(){
  if(location.pathname.startsWith('/admin')||adminCode)showView('admin');else if(viewNames.includes(initialView)&&initialView!=='admin')showView(initialView);
  try{await loadSession();if(adminCode&&!isAdmin){try{await api('/api/admin/activate',{method:'POST',body:{code:adminCode}});}catch(error){if(error.status!==401)throw error;await loadSession();if(!isAdmin)throw error;}if(!isAdmin)await loadSession();}adminCode=null;
    if(inviteCode){if(auth){toast('Este aparelho já está em uma sala. Saia dela para usar outro convite.');showView('capture');}else await onboarding(inviteCode);}
    else if(isAdmin||location.pathname.startsWith('/admin'))showView('admin');
  }catch(e){renderAuth();setConnection(false);toast(e.message);if(location.pathname.startsWith('/admin'))showView('admin');}
}
renderRoom();drawWave(null);bootstrap();pollTimer=setInterval(refresh,5000);
