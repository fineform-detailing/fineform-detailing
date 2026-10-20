import './folder-float.css';
import './studio-motion.css';

// Native interactions: CSS owns animation frames; JS only reacts to user actions.
const care=[
 {image:'assets/modern-gt3.webp',width:933,height:1400,mobile:'assets/modern-gt3-mobile.webp',alt:'Detalhe de um Porsche 911 GT3 moderno, fotografia editorial de Erik Fabian',title:'Pintura e brilho.',label:'Pintura',description:'Realce, correção por polimento e proteção cerâmica. O teste da pintura define o caminho.',href:'atendimento/?mode=guidance&area=pintura'},
 {image:'assets/modern-interior.webp',width:1100,height:1100,mobile:'assets/modern-interior-mobile.webp',alt:'Interior de um BMW moderno, fotografia editorial de Divaris Shirichena',title:'De dentro para fora.',label:'Interior',description:'Bancos, plásticos, painel e carpete. O cuidado muda conforme o material e a necessidade.',href:'atendimento/?mode=guidance&area=interior'},
 {image:'assets/modern-ducati.webp',width:1600,height:1068,mobile:'assets/modern-ducati-mobile.webp',alt:'Ducati Panigale V4R em iluminação vermelha, fotografia editorial de Jan Kopřiva',title:'Também em duas rodas.',label:'Moto',description:'Limpeza estética das superfícies acessíveis. Moto Premium, com respeito aos materiais e às áreas de contato.',href:'atendimento/?vehicle=moto&service=motoPremium'}
];
const gallery=document.getElementById('react-gallery');
if(gallery){
 gallery.innerHTML='<div class="explorer-inner"><div class="explorer-media"><div class="native-stack" role="group" aria-label="Explore os cuidados para seu veículo">'+care.map((item,i)=>'<button type="button" class="native-card" data-card="'+i+'" aria-label="Próxima foto de cuidado" tabindex="'+(i===0?'0':'-1')+'"><img src="'+item.image+'" srcset="'+item.mobile+' 560w, '+item.image+' '+item.width+'w" sizes="(max-width:700px) calc(100vw - 92px), 500px" alt="'+item.alt+'" loading="lazy" decoding="async" width="'+item.width+'" height="'+item.height+'" draggable="false"></button>').join('')+'</div><span class="photo-tag">FINE FORM / OLHAR EDITORIAL</span></div><div class="explorer-detail"><div class="explorer-navigation"><span class="explorer-counter" aria-live="polite"></span><div class="gallery-controls"><button type="button" class="previous-photo next-photo" aria-label="Cuidado anterior">←</button><button type="button" class="next-photo" data-next>Próximo <span aria-hidden="true">↗</span></button></div></div><div class="explorer-caption"><h3></h3><p></p><a class="button dark-button">Quero cuidar desta parte <span aria-hidden="true">↗</span></a></div><p class="drag-help">Deslize a foto para o lado, toque nela ou use as setas.</p><div class="gallery-dots" role="group" aria-label="Escolher cuidado">'+care.map((item,i)=>'<button type="button" data-dot="'+i+'" aria-label="'+item.label+'"></button>').join('')+'</div></div></div>';
 const cards=[...gallery.querySelectorAll('[data-card]')],dots=[...gallery.querySelectorAll('[data-dot]')];
 let active=0,start=null,dragged=false;
 function show(next){
  const moveFocus=cards.includes(document.activeElement);active=(next+care.length)%care.length;const item=care[active];
  cards.forEach((card,i)=>{
   const depth=(i-active+care.length)%care.length;
   card.dataset.depth=depth;card.tabIndex=depth===0?0:-1;card.setAttribute('aria-hidden',String(depth!==0));
  });
  dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
  gallery.querySelector('.explorer-counter').textContent='0'+(active+1)+' / 03 · '+item.label;
  const caption=gallery.querySelector('.explorer-caption');
  caption.querySelector('h3').textContent=item.title;caption.querySelector('p').textContent=item.description;caption.querySelector('a').href=item.href;
  if(moveFocus)cards[active].focus({preventScroll:true});
 }
 show(0);
 gallery.querySelector('[data-next]').addEventListener('click',()=>show(active+1));
 gallery.querySelector('.previous-photo').addEventListener('click',()=>show(active-1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
 for(const card of cards){
  card.addEventListener('pointerdown',event=>{if(event.isPrimary!==false){start={x:event.clientX,y:event.clientY};dragged=false;try{card.setPointerCapture(event.pointerId);}catch{}}},{passive:true});
  card.addEventListener('pointerup',event=>{
   if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
   if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){dragged=true;show(active+(dx<0?1:-1));}
  },{passive:true});
  card.addEventListener('pointercancel',()=>{start=null;dragged=false;},{passive:true});
  card.addEventListener('click',()=>{if(!dragged)show(active+1);dragged=false;});
 }
 gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(active+(event.key==='ArrowRight'?1:-1));if(event.target.matches('[data-card]'))cards[active].focus({preventScroll:true});}});
}

const folder=document.getElementById('react-folder');
if(folder){
 folder.innerHTML='<div class="summary-folder"><button type="button" class="folder-float" aria-expanded="false" aria-describedby="folder-description" aria-label="Ver os itens do resumo: veículo, cuidado e data e horário"><span class="folder-back" aria-hidden="true"></span><span class="folder-notes" aria-hidden="true">'+['Seu veículo','O cuidado','Data e horário'].map((label,i)=>'<span class="folder-sheet sheet-'+i+'"><span class="sheet-number">0'+(i+1)+'</span><b>'+label+'</b><span class="sheet-line"></span><span class="sheet-line short"></span></span>').join('')+'</span><span class="folder-front" aria-hidden="true"><span>FINE FORM / SEU RESUMO</span><b>Pronto para<br>a nossa conversa.</b><span class="folder-plus">+</span></span></button><p id="folder-description" class="folder-hint">Seu veículo, o cuidado e a preferência de data e horário, juntos no resumo. Toque para abrir.</p></div>';
 const button=folder.querySelector('button');let pinned=false;
 const open=value=>{button.classList.toggle('is-open',value);button.setAttribute('aria-expanded',String(value));button.querySelector('.folder-plus').textContent=value?'−':'+';};
 button.addEventListener('click',()=>{pinned=!pinned;open(pinned);});
 button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover)').matches)open(true);});
 button.addEventListener('pointerleave',()=>{if(!pinned)open(false);});
 button.addEventListener('blur',()=>{pinned=false;open(false);});
 button.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=false;open(false);}});
}

const ticker=document.getElementById('react-velocity');
if(ticker){
 ticker.innerHTML='<div class="native-marquee" aria-hidden="true"><div class="native-marquee-track"><span>LIMPAR. CORRIGIR. PROTEGER. ✳&nbsp; LIMPAR. CORRIGIR. PROTEGER. ✳&nbsp;</span><span>LIMPAR. CORRIGIR. PROTEGER. ✳&nbsp; LIMPAR. CORRIGIR. PROTEGER. ✳&nbsp;</span></div></div>';
 let visible=false;
 const update=()=>ticker.classList.toggle('is-running',visible&&!document.hidden&&(window.ffMotion?.enabled?.()??!matchMedia('(prefers-reduced-motion:reduce)').matches));
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);update();});observer.observe(ticker);}
 document.addEventListener('visibilitychange',update);window.addEventListener('ff:motion',update);
}

const closing=document.querySelector('#react-closing .closing-panel');
closing?.classList.add('native-glow');
