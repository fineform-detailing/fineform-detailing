import './folder-float.css';
import './studio-motion.css';

const motionAllowed=()=>window.ffMotion?.enabled?.()??!matchMedia('(prefers-reduced-motion: reduce)').matches;
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
 let active=0,start=null,dragged=false,dragFrame=0,dragX=0;
 const animations=new Set(),leaving=new WeakMap();
 function clearMotion(){
  if(dragFrame)cancelAnimationFrame(dragFrame);dragFrame=0;
  for(const animation of animations)animation.cancel();animations.clear();
  for(const card of cards){leaving.delete(card);card.classList.remove('is-dragging','is-leaving');card.style.removeProperty('--drag-x');card.style.removeProperty('--drag-angle');}
 }
 function play(element,keyframes,options,finish=()=>{}){
  if(!motionAllowed()||typeof element.animate!=='function'){finish();return;}
  const animation=element.animate(keyframes,options);animations.add(animation);
  const done=()=>{animations.delete(animation);finish();};animation.finished.then(done,done);
 }
 function show(next,animate=true){
  const previous=active,fromX=dragX,moveFocus=cards.includes(document.activeElement),requested=(next+care.length)%care.length;
  const direction=next<active?1:-1;
  clearMotion();dragX=0;
  active=requested;const item=care[active];
  cards.forEach((card,i)=>{
   const depth=(i-active+care.length)%care.length;
   card.dataset.depth=depth;card.tabIndex=depth===0?0:-1;card.setAttribute('aria-hidden',String(depth!==0));
  });
  dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
  gallery.querySelector('.explorer-counter').textContent='0'+(active+1)+' / 03 · '+item.label;
  const caption=gallery.querySelector('.explorer-caption');
  caption.querySelector('h3').textContent=item.title;caption.querySelector('p').textContent=item.description;caption.querySelector('a').href=item.href;
  if(animate&&previous!==active&&motionAllowed()){
   const outgoing=cards[previous],run={};leaving.set(outgoing,run);outgoing.classList.add('is-leaving');
   play(outgoing,[{transform:'translate3d('+fromX+'px,0,0) rotate('+Math.max(-7,Math.min(7,fromX/24))+'deg)',opacity:1},{transform:'translate3d('+(direction*108)+'%,5%,0) rotate('+(direction*13)+'deg)',opacity:0}],{duration:330,easing:'cubic-bezier(.22,.65,.2,1)'},()=>{if(leaving.get(outgoing)===run){leaving.delete(outgoing);outgoing.classList.remove('is-leaving');}});
   [...caption.children].forEach((child,i)=>play(child,[{opacity:.5,transform:'translate3d(0,12px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:420,delay:i*40,easing:'cubic-bezier(.18,.8,.2,1)'}));
  }
  if(moveFocus)cards[active].focus({preventScroll:true});
 }
 show(0,false);
 gallery.querySelector('[data-next]').addEventListener('click',()=>show(active+1));
 gallery.querySelector('.previous-photo').addEventListener('click',()=>show(active-1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
 for(const card of cards){
  card.addEventListener('pointerdown',event=>{if(event.isPrimary!==false&&!(event.button>0)){clearMotion();dragX=0;start={x:event.clientX,y:event.clientY,id:event.pointerId,card};dragged=false;try{card.setPointerCapture(event.pointerId);}catch{}}},{passive:true});
  card.addEventListener('pointermove',event=>{
   if(!start||start.card!==card||start.id!==event.pointerId)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.3)return;
   dragged=true;dragX=Math.max(-240,Math.min(240,dx));
   if(!motionAllowed()||dragFrame)return;
   dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(!start)return;card.classList.add('is-dragging');card.style.setProperty('--drag-x',dragX+'px');card.style.setProperty('--drag-angle',Math.max(-7,Math.min(7,dragX/24))+'deg');});
  },{passive:true});
  card.addEventListener('pointerup',event=>{
   if(!start||start.card!==card||start.id!==event.pointerId)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
   if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){dragged=true;show(active+(dx<0?1:-1));}else{clearMotion();dragX=0;}
  },{passive:true});
  card.addEventListener('pointercancel',()=>{start=null;dragged=false;dragX=0;clearMotion();},{passive:true});
  card.addEventListener('lostpointercapture',()=>{start=null;},{passive:true});
  card.addEventListener('click',()=>{if(!dragged)show(active+1);dragged=false;});
 }
 gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(active+(event.key==='ArrowRight'?1:-1));if(event.target.matches('[data-card]'))cards[active].focus({preventScroll:true});}});
 window.addEventListener('ff:motion',()=>{if(!motionAllowed()){start=null;clearMotion();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){start=null;clearMotion();}});
 window.addEventListener('pagehide',clearMotion);
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

// A short, local ripple gives touch feedback without a permanent animation loop.
document.addEventListener('pointerdown',event=>{
 if(event.isPrimary===false||event.button>0||!motionAllowed())return;
 const button=event.target.closest?.('.button,.header-cta,.next-photo,.care-arrow');
 if(!button||button.disabled||typeof button.animate!=='function')return;
 const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*2;
 const wave=document.createElement('span');wave.className='ff-tap-wave';wave.setAttribute('aria-hidden','true');
 Object.assign(wave.style,{width:size+'px',height:size+'px',left:(event.clientX-rect.left-size/2)+'px',top:(event.clientY-rect.top-size/2)+'px'});
 button.querySelectorAll('.ff-tap-wave').forEach(old=>old.remove());button.append(wave);
 const animation=wave.animate([{transform:'scale(.15)',opacity:.17},{transform:'scale(1)',opacity:0}],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'});
 const stop=()=>animation.cancel(),cleanup=()=>{wave.remove();window.removeEventListener('ff:motion',stop);};
 window.addEventListener('ff:motion',stop,{once:true});animation.finished.then(cleanup,cleanup);
},{passive:true});
