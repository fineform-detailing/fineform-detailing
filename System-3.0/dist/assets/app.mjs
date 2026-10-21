import {mountCarePlans} from './care-plans.mjs';
import {legalFooter} from './legal-footer.mjs';
import {services,extras,plans,findService,money,extraPrice,polishIds} from './catalog.mjs';
import {socialContacts,emailMessage,preferredContact,whatsappMessage} from './contacts.mjs';
const cfg=window.FINE_FORM_CONFIG||{};
const root=document.body.dataset.root||'./';
const $=(s,scope=document)=>scope.querySelector(s);
const $$=(s,scope=document)=>[...scope.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const socialIcons={whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 3 21l5-1a9 9 0 1 0-3-2Z"/><path d="M9 7c-2 3 2 7 5 8l2-2-2-1-1 1c-2-1-3-2-3-4l1-1-2-1Z"/></svg>',instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle class="icon-dot" cx="17" cy="7" r="1"/></svg>',tiktok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v12a4 4 0 1 1-4-4M14 4c1 3 3 4 6 4"/></svg>',email:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>'};
function socialMarkup(){return socialContacts(cfg).map(s=>'<a class="social-link" data-social="'+s.key+'" href="'+escape(s.url)+'"'+(s.key!=='email'?' target="_blank" rel="noopener noreferrer"':'')+'>'+socialIcons[s.key]+'<span>'+s.label+'</span></a>').join('');}
const brand='<a class="brand" href="'+root+'" aria-label="Fine Form, página inicial"><span class="brand-title">FINE FORM</span></a>';
const header=$('[data-header]');
if(header)header.innerHTML=brand+'<nav class="nav-links" id="main-nav" aria-label="Navegação principal"><a href="'+root+'#cuidados">Cuidados</a><a href="'+root+'#care">Planos</a><a href="'+root+'#sobre">Sobre</a><a href="'+root+'#avaliacoes">Avaliações</a><a href="'+root+'acompanhar/">Meus pedidos</a></nav><div class="header-actions"><a class="header-cta" href="'+root+'atendimento/">Vamos conversar <span aria-hidden="true">↗</span></a><button type="button" class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir menu">☰</button></div>';
const footer=$('[data-footer]');
if(footer){footer.className='site-footer';footer.innerHTML='<div class="footer-strip"><span class="footer-copyright">© '+new Date().getFullYear()+' FINE FORM</span><a class="footer-symbol" href="'+root+'" aria-label="Fine Form, página inicial"><img src="'+root+'assets/logo-original.png" alt="" width="44" height="44"></a><nav class="footer-socials" aria-label="Redes sociais e contatos da Fine Form">'+socialContacts(cfg).map(s=>'<a data-social="'+s.key+'" href="'+escape(s.url)+'" aria-label="'+s.label+'"'+(s.key!=='email'?' target="_blank" rel="noopener noreferrer"':'')+'>'+socialIcons[s.key]+'</a>').join('')+'</nav></div><div class="footer-bottom"><a href="'+root+'links/">Todos os links ↗</a><div class="footer-utilities"><a href="'+root+'privacidade/">Privacidade</a><button type="button" data-cookie-settings>Cookies e dados</button><a href="'+root+'creditos/">Créditos</a><button class="motion-toggle" id="motion-toggle" type="button" aria-pressed="false" aria-label="Pausar animações decorativas"><span aria-hidden="true">Ⅱ</span><span class="motion-label">Animações</span></button></div></div>';}

if(footer)footer.insertAdjacentHTML('beforeend',legalFooter);

$$('[data-social-links]').forEach(nav=>nav.innerHTML=socialMarkup());
$('.nav-toggle')?.addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');$('#main-nav').classList.toggle('open',open);});
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>{$('#main-nav').classList.remove('open');$('.nav-toggle').setAttribute('aria-expanded','false');$('.nav-toggle').setAttribute('aria-label','Abrir menu');}));

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#main-nav')?.classList.contains('open')){$('#main-nav').classList.remove('open');const toggle=$('.nav-toggle');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menu');toggle.focus();}});
const dialogs=$('#shared-dialogs');
if(dialogs)dialogs.innerHTML='<dialog id="content-dialog" class="dialog" aria-labelledby="dialog-title"><button class="dialog-close" aria-label="Fechar">×</button><div id="dialog-content"></div></dialog>';
const dialog=$('#content-dialog');
function showDialog(html){if(!dialog)return;$('#dialog-content').innerHTML=html;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
function closeDialog(){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
$('.dialog-close')?.addEventListener('click',closeDialog);
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
let toastTimer;
function toast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),4500);}
function contact(text='Olá, Mateus! Tudo bem? Gostaria de cuidar do meu veículo na Fine Form. Pode me ajudar a escolher o serviço e combinar um horário?'){
 const route=preferredContact(cfg);
 if(route.kind==='email'){window.open(emailMessage(cfg,text),'_self');toast('Revise o e-mail e envie pelo seu aplicativo.');return true;}
 if(route.kind==='unavailable'){
  showDialog('<p class="eyebrow dark">ATENDIMENTO PESSOAL</p><h2 id="dialog-title">Vamos conversar.</h2><p>O canal de contato será disponibilizado em breve. Enquanto isso, você pode preparar seu resumo e baixá-lo para conversar com Mateus.</p><a class="button dark-button" href="'+root+'atendimento/">Preparar meu resumo ↗</a>');return false;
 }
 window.open(whatsappMessage(cfg,text),'_blank','noopener,noreferrer');
 toast('Revise a mensagem e toque em enviar no WhatsApp.');return true;
}
function emailContact(text){const url=emailMessage(cfg,text);if(!url)return false;window.open(url,'_self');toast('Revise o e-mail e envie pelo seu aplicativo.');return true;}
window.ff={toast,contact,emailContact,config:cfg,escape,root,contactRoute:preferredContact(cfg)};
document.addEventListener('click',e=>{
 const contactButton=e.target.closest('[data-contact]');if(contactButton){e.preventDefault();contact();}
 if(e.target.closest('[data-privacy]'))location.href=root+'privacidade/';
 const serviceButton=e.target.closest('[data-service]');if(serviceButton)openService(serviceButton.dataset.service);
 if(e.target.closest('[data-all-details]')){const d=$('.area-menu');if(d){d.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}
});
function serviceDetails(service){
 if(!service.sections)return '<ul>'+service.includes.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>';
 return '<div class="service-breakdown">'+service.sections.map(section=>'<section><h3>'+escape(section.title)+'</h3><ul>'+section.items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul></section>').join('')+'</div>';
}
function openService(id){
 const s=findService(id);if(!s)return;
 showDialog('<p class="eyebrow dark">'+'O QUE ESTÁ INCLUÍDO / '+(s.vehicle==='moto'?'MOTOS':'CARROS')+'</p><h2 id="dialog-title">'+s.label+'</h2><p>'+s.description+'</p>'+serviceDetails(s)+(s.notice?'<p class="notice-box">'+s.notice+'</p>':'')+(s.price?'<small>'+'Valor do serviço: '+money(s.price)+'. Duração e agenda confirmadas antes do atendimento.</small>':'<small>Orçamento específico após avaliação.</small>')+'<a class="button dark-button" href="'+root+'atendimento/?vehicle='+s.vehicle+'&service='+s.id+'">Tenho interesse <span>↗</span></a>');
}
let menuVehicle='car',menuAnimation=null;
const menuMotionAllowed=()=>window.ffMotion?.enabled?.()??!matchMedia('(prefers-reduced-motion: reduce)').matches;
window.addEventListener('ff:motion',event=>{if(!event.detail.enabled){menuAnimation?.cancel();menuAnimation=null;}});
function renderMenu(vehicle='car',slide=false){
 const grid=$('#service-grid');if(!grid)return;
 if(vehicle===menuVehicle&&grid.children.length)return;
 menuAnimation?.cancel();menuAnimation=null;
 const ids=vehicle==='car'?['essential','premium','extra']:['motoPremium'];
 grid.innerHTML=ids.map((id,i)=>{const s=findService(id);return '<article class="service-row '+(id==='extra'?'service-complete':'')+'"><span class="menu-number">0'+(i+1)+'</span><div class="menu-row-copy"><h3>'+s.label+'</h3><p class="service-positioning">'+escape(s.tag)+'</p><p>'+s.description+'</p></div><div class="menu-row-price"><small>ATENDIMENTO AVULSO</small><strong>'+money(s.price)+'</strong></div><button class="service-open" type="button" data-service="'+id+'" aria-label="Ver o que está incluído no '+s.label+'"><span>Ver cuidado</span><b aria-hidden="true">↗</b></button></article>';}).join('');
 if(vehicle==='moto')grid.innerHTML+='<article class="service-row"><span class="menu-number">02</span><div class="menu-row-copy"><h3>Cuidados por área</h3><p>Revitalização ou vitrificação dos plásticos externos, descontaminação das rodas e realce de uma peça pintada.</p></div><button class="service-open" type="button" data-all-details><span>Explorar</span><b aria-hidden="true">↗</b></button></article><article class="service-row"><span class="menu-number">03</span><div class="menu-row-copy"><h3>Care Moto</h3><p>Duas visitas Moto Premium por mês.</p></div><div class="menu-row-price"><small>POR MÊS</small><strong>'+money(plans.find(p=>p.id==='careMoto').price)+'</strong></div><a class="service-open" href="'+root+'atendimento/?plan=careMoto"><span>Conhecer</span><b aria-hidden="true">↗</b></a></article>';
 const treatments=$('#paint-treatments');
 if(treatments){treatments.hidden=vehicle!=='car';$('#treatment-grid').innerHTML=[...polishIds,'coating'].map((id,i)=>{const s=findService(id);return '<article class="treatment-item"><span class="treatment-number">0'+(i+1)+'</span><div><h4>'+s.label+'</h4><p>'+s.description+'</p><button class="text-link" type="button" data-service="'+id+'">Ver o cuidado ↗</button></div><span class="treatment-price">'+money(s.price)+'</span></article>';}).join('');}
 $('#extra-menu').innerHTML=(vehicle==='car'?'<div class="extra-item"><div class="extra-title"><h4>Higienização completa</h4><span>'+money(findService('fullClean').price)+'</span></div><p>'+findService('fullClean').description+'</p><button class="text-link" type="button" data-service="fullClean">Ver escopo ↗</button></div>':'')+extras.filter(x=>x.vehicle===vehicle||x.vehicle==='both').map(x=>'<div class="extra-item"><div class="extra-title"><h4>'+x.label+'</h4><span>'+money(extraPrice(x,vehicle))+'</span></div><p>'+x.description+'</p></div>').join('');
 $$('[data-menu-vehicle]').forEach(b=>{b.classList.toggle('active',b.dataset.menuVehicle===vehicle);b.setAttribute('aria-pressed',String(b.dataset.menuVehicle===vehicle));});
 const selector=$('.menu-tabs .segmented');if(selector)selector.dataset.vehicle=vehicle;
 menuVehicle=vehicle;
 window.dispatchEvent(new CustomEvent('ff:menu',{detail:{vehicle}}));
 if(slide&&menuMotionAllowed()&&typeof grid.animate==='function'){
  const direction=vehicle==='moto'?1:-1;
  menuAnimation=grid.animate([{opacity:.35,transform:'translateX('+direction*18+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
 }
}
$$('[data-menu-vehicle]').forEach(b=>b.addEventListener('click',()=>renderMenu(b.dataset.menuVehicle,true)));
renderMenu();
if($('#plan-grid'))mountCarePlans($('#plan-grid'),{plans,money,root});

document.addEventListener('click',e=>{if(e.target.closest('[data-credits]'))showDialog('<p class="eyebrow dark">FINE FORM / CRÉDITOS</p><h2 id="dialog-title">Um olhar,<br>várias referências.</h2><p>As fotografias são editoriais. Não representam veículos atendidos, resultados da Fine Form ou parceria com fabricantes.</p><ul class="credits-list"><li>McLaren: <a href="https://unsplash.com/photos/IL_guQy_deI" target="_blank" rel="noopener noreferrer">Kristóf Bogár</a>.</li><li>Porsche GT3: <a href="https://unsplash.com/photos/fetaeac5EJA" target="_blank" rel="noopener noreferrer">Erik Fabian</a>.</li><li>Interior BMW 2022: <a href="https://unsplash.com/photos/Siu4aqCJK04" target="_blank" rel="noopener noreferrer">Divaris Shirichena</a>.</li><li>Ducati Panigale: <a href="https://unsplash.com/photos/N-z_T1pbpeQ" target="_blank" rel="noopener noreferrer">Jan Kopřiva</a>.</li><li>Fotos sob <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">licença Unsplash</a>.</li><li>Stack, ScrollVelocity e Border Glow: <a href="https://reactbits.dev/" target="_blank" rel="noopener noreferrer">React Bits / David Haz</a>, MIT + Commons Clause; adaptações para Fine Form.</li><li>Interação de pasta adaptada para a Fine Form, inspirada no <a href="https://reactbits.dev/micro/folder-float" target="_blank" rel="noopener noreferrer">Folder Float / React Bits</a>.</li><li>Manrope e Barlow Condensed: SIL Open Font License. Símbolo e cores: identidade original da Fine Form.</li></ul>');});
