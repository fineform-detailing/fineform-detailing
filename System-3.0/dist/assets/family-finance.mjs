const app=document.querySelector('#app'),toast=document.querySelector('#toast'),logout=document.querySelector('#logout'),headerBell=document.querySelector('#header-bell');
const headerCaption=document.querySelector('#header-caption'),headerTitle=document.querySelector('#header-title');
let current=null,overview=null,invite=null,mode='login',timer=null;
const money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=s=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
const fullDate=s=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=name=>String(name||'CF').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
function flash(message){toast.textContent=message;toast.classList.add('show');clearTimeout(flash.timer);flash.timer=setTimeout(()=>toast.classList.remove('show'),3200)}
async function api(path,options={}){
 const headers={'Content-Type':'application/json',...(options.headers||{})};
 const response=await fetch('/api/finance'+path,{credentials:'same-origin',headers,...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Não foi possível concluir a operação.');
 return data;
}
function setHeader(user=null){
 if(user){
  headerCaption.textContent=user.role==='admin'?'GESTÃO FINANCEIRA':'ÁREA FAMILIAR';
  headerTitle.textContent=user.name.split(' ')[0];
  headerBell.hidden=false;logout.hidden=false;
 }else{
  headerCaption.textContent='ÁREA PRIVADA';
  headerTitle.textContent='Controle financeiro';
  headerBell.hidden=true;logout.hidden=true;
 }
}
function authView(){
 setHeader(null);
 const isSetup=mode==='adminSetup';
 const isRegister=mode==='register';
 const title=isSetup?'Configurar administrador':isRegister?'Criar meu acesso':'Acessar minha conta';
 const subtitle=isSetup?'Crie o acesso exclusivo que administra o planejamento financeiro familiar.':isRegister?'O cadastro dos familiares utiliza um convite individual fornecido pelo administrador.':'Entre com o e-mail e a senha cadastrados para acessar seu espaço financeiro.';
 app.innerHTML=`<section class="auth-shell">
  <div class="auth-copy">
   <h1>${isSetup?'Uma conta.\nTodo o controle.':'Suas finanças.<br><em>Em equilíbrio.</em>'}</h1>
   <p>${isSetup?'Este administrador pertence somente ao Controle Financeiro. Ele não utiliza nem acessa a conta administrativa de outro site.':'Acompanhe contribuições, vencimentos e confirmações em um só lugar. Cada pessoa acessa apenas as informações permitidas para sua conta.'}</p>
   <div class="auth-highlight"><span class="highlight-icon">✓</span><span>Acesso individual, informações organizadas e pagamentos conferidos.</span></div>
  </div>
  <section class="auth-card">
   <h2>${title}</h2><p>${subtitle}</p>
   <form id="auth-form">
    ${isRegister||isSetup?'<div class="field"><label for="auth-name">NOME</label><input id="auth-name" name="name" autocomplete="name" required minlength="2" maxlength="90"></div>':''}
    ${isRegister||isSetup?'<div class="field"><label for="auth-code">'+(isSetup?'CÓDIGO DE PRIMEIRO ACESSO':'CÓDIGO DO CONVITE')+'</label><input id="auth-code" name="code" autocomplete="one-time-code" required minlength="'+(isSetup?'20':'8')+'"></div>':''}
    <div class="field"><label for="auth-email">E-MAIL</label><input id="auth-email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="auth-password">SENHA ${isRegister?'(MÍNIMO 10 CARACTERES)':isSetup?'(MÍNIMO 12 CARACTERES)':''}</label><input id="auth-password" name="password" type="password" autocomplete="${isRegister||isSetup?'new-password':'current-password'}" required minlength="${isSetup?12:isRegister?10:1}"></div>
    <button type="submit">${isSetup?'Criar administrador':isRegister?'Criar minha conta':'Entrar no financeiro'} <span aria-hidden="true">↗</span></button>
   </form>
   <div class="switch">${isSetup?'Já configurou o administrador?':isRegister?'Já possui um acesso?':'Recebeu um convite familiar?'} <button id="switch-mode" type="button">${isSetup||isRegister?'Voltar ao login': 'Criar acesso familiar'}</button></div>
   <div id="admin-setup-entry"></div>
   <div class="auth-security"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/></svg> Sessão privada e protegida</div>
  </section>
 </section>`;
 document.querySelector('#switch-mode').onclick=()=>{
  if(mode==='adminSetup'||mode==='register')mode='login';
  else mode='register';
  authView();
 };
 document.querySelector('#auth-form').onsubmit=async event=>{
  event.preventDefault();
  const values=Object.fromEntries(new FormData(event.currentTarget));
  const endpoint=isSetup?'/admin/setup':isRegister?'/register':'/login';
  const submit=event.currentTarget.querySelector('button[type=submit]');
  submit.disabled=true;
  try{const result=await api(endpoint,{method:'POST',body:JSON.stringify(values)});current=result.user;mode='login';await load();}
  catch(error){flash(error.message);submit.disabled=false;}
 };
 if(mode==='login'){
  api('/admin/setup-status').then(result=>{
   const target=document.querySelector('#admin-setup-entry');
   if(result.available&&target)target.innerHTML='<button class="admin-setup-link" type="button" id="open-admin-setup">Configurar o administrador deste financeiro</button>';
   const button=document.querySelector('#open-admin-setup');
   if(button)button.onclick=()=>{mode='adminSetup';authView()};
  }).catch(()=>{});
 }
}
function status(item){
 const label={pending:'Pendente',reported:'Informado · aguardando conferência',confirmed:'Confirmado',overdue:'Em atraso'}[item.status]||item.status;
 return '<span class="status '+esc(item.status)+'">'+label+'</span>';
}
function icon(name){
 const paths={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  payments:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  alerts:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>'
 };
 return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.home)+'</svg>';
}
function nav(){
 return '<nav class="bottom-nav" aria-label="Navegação do financeiro">'+
  '<button class="active" type="button" data-target="inicio">'+icon('home')+'<span>Início</span></button>'+
  '<button type="button" data-target="pagamentos">'+icon('payments')+'<span>Pagamentos</span></button>'+
  '<button type="button" data-target="avisos">'+icon('alerts')+'<span>Avisos</span></button>'+
  '<button type="button" data-target="conta">'+icon('account')+'<span>Conta</span></button>'+
 '</nav>';
}
function render(){
 const user=overview.user,admin=user.role==='admin',items=overview.items||[],summary=overview.summary||{expected:0,confirmed:0,pending:0,progress:0};
 current=user;setHeader(user);
 const pending=[...items].filter(x=>x.status!=='confirmed').sort((a,b)=>a.due_date.localeCompare(b.due_date));
 const next=pending[0]||null;
 const paymentRows=items.length?items.map((item,index)=>{
  const owner=item.person_role==='father'?'Pai':'Mãe';
  const action=admin?(item.status!=='confirmed'?'<button class="mini-action confirm" data-id="'+esc(item.id)+'">Confirmar recebimento</button>':''):(item.status==='pending'||item.status==='overdue'?'<button class="mini-action report" data-id="'+esc(item.id)+'">Informar pagamento</button>':item.status==='reported'?'<span class="muted">Aguardando conferência</span>':'');
  return '<article class="payment-item" style="animation-delay:'+Math.min(index*35,280)+'ms">'+
   '<div class="payment-main"><strong class="payment-label">'+esc(item.label)+'</strong><div class="payment-meta">'+(admin?owner+' <span class="bullet"></span> ':'')+'Vence em '+date(item.due_date)+'</div></div>'+
   '<div class="payment-side"><strong class="payment-amount">'+money(item.amount)+'</strong>'+status(item)+'<div class="payment-actions">'+action+'</div></div></article>';
 }).join(''):'<div class="empty">Nenhuma contribuição cadastrada por enquanto.</div>';
 const adminArea=admin?'<section id="acessos" class="content-section"><div class="section-title"><div><small>PERMISSÕES</small><h2>Acessos da família</h2><p>Crie os acessos individuais para seu pai e sua mãe.</p></div></div><div class="admin-tools"><article class="tool-card"><h3>Acesso do pai</h3><p>Convite individual para consultar os lançamentos e informar pagamentos.</p><button id="invite-father" type="button">Gerar convite ↗</button></article><article class="tool-card"><h3>Acesso da mãe</h3><p>Convite individual para acompanhar a contribuição prevista para março.</p><button id="invite-mother" type="button">Gerar convite ↗</button></article></div><div id="invite-result">'+(invite?'<div class="invite-card"><div><span class="eyebrow">CONVITE · '+(invite.role==='father'?'PAI':'MÃE')+'</span><p>Uso único · expira em sete dias.</p><div class="invite-code">'+esc(invite.code)+'</div></div><button id="copy-invite" type="button">Copiar código</button></div>':'')+'</div><div class="tool-card" style="margin-top:12px"><h3>Regras do planejamento</h3><p>Pai: R$ 800 no fim de cada mês, de novembro/2026 a março/2027, mais R$ 3.000 extras em dezembro. Mãe: R$ 4.000 em março/2027.</p></div></section>':'';
 app.innerHTML=
 '<section id="inicio" class="dashboard-welcome"><div class="welcome-user"><div class="avatar">'+esc(initials(user.name))+'</div><div><small>'+(admin?'Bem-vindo de volta':'Olá, seja bem-vindo')+'</small><strong>'+esc(user.name)+'</strong></div></div><div class="welcome-date">PLANEJAMENTO 2026 — 2027</div></section>'+
 '<section class="dashboard-hero"><div><h1>'+(admin?'Tudo em um só lugar.':'Seu planejamento.<br><em>Sem surpresas.</em>')+'</h1><p>'+(admin?'Acompanhe o total previsto, confira os pagamentos informados e gerencie os acessos familiares.':'Veja suas contribuições, confira os vencimentos e informe quando realizar um pagamento.')+'</p></div><div class="hero-decoration" aria-hidden="true"></div></section>'+
 '<section class="finance-layout">'+
  '<article class="feature-card"><div class="card-topline"><small>RESUMO DO PLANEJAMENTO</small><span class="live-pill">Atualizado</span></div><span class="total-label">Total previsto</span><strong class="total-amount">'+money(summary.expected)+'</strong><p class="total-note">'+money(summary.confirmed)+' já confirmado de '+money(summary.expected)+'</p><div class="progress-head"><span>Progresso de recebimento</span><strong>'+summary.progress+'%</strong></div><div class="progress-track"><div class="progress-fill" style="width:'+Math.max(0,Math.min(100,summary.progress))+'%"></div></div><div class="stats-grid"><div class="stat-card"><span class="stat-icon">✓</span><small>Confirmado</small><strong>'+money(summary.confirmed)+'</strong></div><div class="stat-card pending"><span class="stat-icon">◷</span><small>Em aberto</small><strong>'+money(summary.pending)+'</strong></div></div></article>'+
  '<article class="next-card">'+(next?'<div><div class="next-top"><small>PRÓXIMO VENCIMENTO</small><span class="next-icon">↗</span></div><div class="next-date">'+fullDate(next.due_date)+'</div><h3>'+esc(next.label)+'</h3><strong class="next-amount">'+money(next.amount)+'</strong><p>'+(admin?(next.person_role==='father'?'Contribuição do pai':'Contribuição da mãe'):'Lembre-se de informar o pagamento após realizar a transferência.')+'</p></div><button class="next-action" type="button" data-target="pagamentos">Ver pagamentos '+icon('arrow')+'</button>':'<div><div class="next-top"><small>PRÓXIMO VENCIMENTO</small><span class="next-icon">✓</span></div><h3>Todos os pagamentos estão confirmados.</h3><p>Não há contribuições pendentes neste momento.</p></div>')+'</article>'+
 '</section>'+
 '<section id="pagamentos" class="content-section"><div class="section-title"><div><small>ACOMPANHAMENTO</small><h2>'+(admin?'Contribuições da família':'Seus pagamentos')+'</h2><p>Valores, vencimentos e situação de cada lançamento.</p></div><span class="section-count">'+items.length+' LANÇAMENTOS</span></div><div class="payment-list">'+paymentRows+'</div></section>'+
 adminArea+
 '<section id="avisos" class="content-section"><div class="section-title"><div><small>ATUALIZAÇÕES</small><h2>Central de avisos</h2><p>Alertas de vencimento e movimentações da sua conta.</p></div><button class="mini-action" id="enable-notifications" type="button">Ativar avisos</button></div><div id="notifications" class="notice-list"><div class="empty">Carregando avisos…</div></div></section>'+
 '<section id="conta" class="content-section"><div class="section-title"><div><small>ACESSO</small><h2>Sua conta</h2><p>Dados de acesso deste ambiente financeiro.</p></div></div><div class="account-card"><div><strong>'+esc(user.name)+'</strong><p>'+esc(user.email)+' · '+(admin?'Administrador':'Acesso familiar')+'</p></div><button class="mini-action" id="logout-inline" type="button">Sair da conta</button></div></section>'+
 nav();
 document.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>goTo(button.dataset.target)));
 document.querySelectorAll('.report').forEach(button=>button.onclick=async()=>{
  const note=prompt('Observação do pagamento (opcional):')||'';
  try{await api('/contributions/'+button.dataset.id+'/report',{method:'POST',body:JSON.stringify({note})});flash('Pagamento informado para conferência.');await load();}
  catch(error){flash(error.message);}
 });
 document.querySelectorAll('.confirm').forEach(button=>button.onclick=async()=>{
  if(!confirm('Confirmar que este valor foi recebido?'))return;
  try{await api('/contributions/'+button.dataset.id+'/confirm',{method:'POST',body:JSON.stringify({})});flash('Recebimento confirmado.');await load();}
  catch(error){flash(error.message);}
 });
 if(admin){
  document.querySelector('#invite-father').onclick=()=>makeInvite('father');
  document.querySelector('#invite-mother').onclick=()=>makeInvite('mother');
  const copy=document.querySelector('#copy-invite');
  if(copy)copy.onclick=()=>navigator.clipboard.writeText(invite.code).then(()=>flash('Código copiado.')).catch(()=>flash('Não foi possível copiar automaticamente.'));
 }
 document.querySelector('#enable-notifications').onclick=async()=>{
  if(!('Notification'in window)){flash('Este navegador não oferece notificações.');return;}
  const permission=await Notification.requestPermission();
  flash(permission==='granted'?'Avisos ativados enquanto o painel estiver aberto.':'Permissão de notificação não concedida.');
 };
 document.querySelector('#logout-inline').onclick=logoutAction;
 loadNotifications();
}
function goTo(target){
 const el=document.getElementById(target);if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 document.querySelectorAll('.bottom-nav [data-target]').forEach(button=>button.classList.toggle('active',button.dataset.target===target));
}
async function makeInvite(role){
 try{invite=await api('/invites',{method:'POST',body:JSON.stringify({role})});render();flash('Convite gerado. Compartilhe em particular.');}
 catch(error){flash(error.message);}
}
async function loadNotifications(){
 const element=document.querySelector('#notifications');if(!element)return;
 try{
  const response=await api('/notifications');
  element.innerHTML=response.items.length?response.items.map(item=>'<article class="notice-item"><span class="notice-symbol">•</span><div><strong>'+esc(item.title)+'</strong><p>'+esc(item.message)+'</p></div></article>').join(''):'<div class="empty">Nenhum aviso por enquanto. Os próximos vencimentos aparecerão aqui.</div>';
  if('Notification'in window&&Notification.permission==='granted'){
   const newest=response.items.find(item=>!item.sent_at);
   if(newest&&!sessionStorage.getItem('family-notice-'+newest.id)){new Notification(newest.title,{body:newest.message,tag:newest.id});sessionStorage.setItem('family-notice-'+newest.id,'1');}
  }
 }catch{}
}
async function load(){
 try{
  overview=await api('/overview');current=overview.user;render();
  if(timer)clearInterval(timer);
  timer=setInterval(async()=>{
   try{overview=await api('/overview');const scrollY=window.scrollY;render();window.scrollTo({top:scrollY,behavior:'instant'});}
   catch{}
  },60000);
 }catch(error){
  if(error.message.toLowerCase().includes('entre'))authView();
  else app.innerHTML='<section class="auth-card"><h2>Não foi possível carregar</h2><p>'+esc(error.message)+'</p><button type="button" onclick="location.reload()">Tentar novamente</button></section>';
 }
}
async function logoutAction(){
 try{await api('/logout',{method:'POST',body:'{}'});}catch{}
 current=null;overview=null;invite=null;mode='login';if(timer)clearInterval(timer);setHeader(null);authView();
}
logout.onclick=logoutAction;
headerBell.onclick=()=>goTo('avisos');
(async()=>{
 try{const session=await api('/session');if(session.user){current=session.user;await load();}else authView();}
 catch{authView();}
})();
