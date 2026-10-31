/* Fine Form — header e imagens editoriais da marca */
(()=>{'use strict';
const root=document.querySelector('.site-header[data-header],header.site-header,[data-header]');
if(!root||window.__fineFormHeaderV4)return;window.__fineFormHeaderV2=true;
const ICON={search:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 5 5"/></svg>',bell:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',arrow:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>'};
const pages=[['Início','/'],['Cuidados','/#cuidados'],['Fine Care','/#care'],['Como funciona','/#como-funciona'],['Avaliações','/#avaliacoes'],['Sobre a Fine Form','/#sobre'],['Dúvidas','/#duvidas'],['Acompanhar pedido','/acompanhar/'],['Informações','/informacoes/'],['Pedir orçamento','/atendimento/']];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addHeader(){
 // Rebind after the app renders the header: the public HTML already includes a static version.
 root.innerHTML='<div class="ff-new-header"><a class="ff-logo-link" href="/" aria-label="Fine Form, página inicial"><span class="ff-logo-symbol" aria-hidden="true"><img src="/assets/logo-original.png" width="48" height="48" alt=""></span><span class="ff-brand-word">FINE FORM<small>ESTÉTICA AUTOMOTIVA</small></span></a><div class="ff-organic-pod"><button type="button" class="ff-head-search" aria-label="Pesquisar serviços e informações">'+ICON.search+'<span>Pesquisar...</span></button><a class="ff-head-bell" href="/acompanhar/" title="Acompanhar pedido" aria-label="Acompanhar meu pedido">'+ICON.bell+'</a><button type="button" class="ff-head-avatar" aria-expanded="false" aria-controls="ff-header-menu" title="Abrir menu" aria-label="Abrir menu"><span class="ff-avatar-circle" aria-hidden="true">FF</span></button></div><a class="ff-head-cta" href="/atendimento/">Pedir orçamento '+ICON.arrow+'</a></div><nav class="ff-nav-popover" id="ff-header-menu" hidden aria-label="Navegação principal">'+pages.map(([name,path])=>'<a '+(name==='Pedir orçamento'?'class="ff-nav-quote" ':'')+'href="'+path+'">'+esc(name)+'</a>').join('')+'</nav>';
 const menu=root.querySelector('.ff-nav-popover'),trigger=root.querySelector('.ff-head-avatar');
 trigger.addEventListener('click',e=>{e.stopPropagation();const open=menu.hidden;menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));});
 root.querySelector('.ff-head-search').addEventListener('click',openSearch);
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')}));
}
let lastFocus=null;
function openSearch(){let panel=document.getElementById('ff-search-modal');if(panel){panel.hidden=false;panel.querySelector('input')?.focus();return;}
 lastFocus=document.activeElement;
 panel=document.createElement('div');panel.id='ff-search-modal';panel.className='ff-new-overlay';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Pesquisar na Fine Form');
 panel.innerHTML='<div class="ff-search-sheet"><div class="ff-search-sheet-head"><strong>O que você procura?</strong><button type="button" class="ff-search-close" aria-label="Fechar pesquisa">×</button></div><input class="ff-search-input" type="search" aria-label="Buscar no site" placeholder="Cuidados, lavagem, orçamento..." autocomplete="off"><div class="ff-search-results" role="list"></div></div>';
 document.body.appendChild(panel);
 const search=panel.querySelector('input'),list=panel.querySelector('.ff-search-results');
 const entries=[...pages,['Lavagem Essencial','/#cuidados'],['Lavagem Premium','/#cuidados'],['Polimento','/#cuidados'],['Vitrificação','/#cuidados'],['Bancos e interior','/#cuidados']];
 function render(){const text=search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const filtered=entries.filter(([name])=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(text)).slice(0,12);list.innerHTML=filtered.length?filtered.map(([name,url])=>'<a href="'+url+'">'+esc(name)+'<span aria-hidden="true">↗</span></a>').join(''):'<p>Nenhum resultado. Tente outro termo.</p>';list.querySelectorAll('a').forEach(x=>x.addEventListener('click',()=>closeSearch()));}
 function closeSearch(){panel.hidden=true;if(lastFocus?.focus)lastFocus.focus();}
 search.addEventListener('input',render);panel.querySelector('.ff-search-close').addEventListener('click',closeSearch);panel.addEventListener('click',e=>{if(e.target===panel)closeSearch()});panel.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();if(e.key==='Tab'){const f=[...panel.querySelectorAll('button:not([disabled]),input,a')];const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});render();search.focus();}
 document.addEventListener('click',e=>{const m=root.querySelector('.ff-nav-popover'),t=root.querySelector('.ff-head-avatar');if(m&&!m.hidden&&!root.contains(e.target)){m.hidden=true;t?.setAttribute('aria-expanded','false')}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=root.querySelector('.ff-nav-popover'),t=root.querySelector('.ff-head-avatar');if(m)m.hidden=true;if(t)t.setAttribute('aria-expanded','false')}});
let scheduled=false;const hdrObs=new MutationObserver(()=>{if(!root.querySelector('.ff-new-header')&&!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;addHeader()})}});hdrObs.observe(root,{childList:true});
function updatePhotography(){const base='/assets/ff-20261031-';const photomaps={wash:base+'wash.avif',car:base+'car.avif',interior:base+'interior.avif',polish:base+'polish.avif',chemical:base+'chemical.avif',process:base+'process.avif'};
 let serviceIndex=0;document.querySelectorAll('main img').forEach(img=>{
  if(img.dataset.ffPhotoUpdated)return;
  const src=img.getAttribute('src')||'',alt=(img.alt||'').toLowerCase(),ctx=img.closest('section,figure,article')?.className||'';
  if(/logo|icon|avatar|qrcode|brand|seal|badge|symbol|svg/i.test(src)||/logo|símbolo|simbolo|ícone|icone/i.test(alt))return;
  let kind=null;
  if(img.closest('.hero-image')||/hero-detail-wash/i.test(src))kind='wash';
  else if(img.closest('.gallery-fallback,#react-gallery,.explorer-section')||/modern-gt3/i.test(src))kind='car';
  else if(/seat|banco|leather|interior|couro/i.test(src+' '+alt))kind='interior';
  else if(/polish|paint|correction|vitrif|polimento/i.test(src+' '+alt))kind='polish';
  else if(/chemical|bottle|dilui|product/i.test(src+' '+alt))kind='chemical';
  else if(img.closest('.service-list,.care-showcase,.paint-treatments'))kind=['process','interior','polish','chemical'][serviceIndex++%4];
  if(!kind)return;
  img.src=photomaps[kind];img.removeAttribute('srcset');img.removeAttribute('sizes');img.loading=img.closest('.hero-image')?'eager':'lazy';img.decoding='async';img.dataset.ffPhotoUpdated=kind;
 });}
function addPhotoDeck(){if(document.querySelector('.ff-photo-deck')||document.body.dataset.page!=='home')return;const anchor=document.querySelector('.menu-section');if(!anchor)return;const deck=document.createElement('div');deck.className='ff-photo-deck';deck.setAttribute('aria-label','Detalhes dos cuidados Fine Form');const photos=[['car','Acabamento externo de veículo preto'],['wash','Lavagem detalhada da carroceria'],['interior','Limpeza de banco e revestimentos'],['polish','Equipamento para polimento da pintura'],['chemical','Dosagem de produto de limpeza automotiva'],['process','Lavagem manual da parte frontal do veículo']];deck.innerHTML=photos.map(([f,a])=>'<img src="/assets/ff-20261031-'+f+'.avif" loading="lazy" decoding="async" alt="'+esc(a)+'">').join('');anchor.insertAdjacentElement('afterend',deck);}
let busy=false;const siteObs=new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{busy=false;updatePhotography();addPhotoDeck()})});siteObs.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addHeader();updatePhotography();addPhotoDeck()},{once:true});else{addHeader();updatePhotography();addPhotoDeck()}
})();
