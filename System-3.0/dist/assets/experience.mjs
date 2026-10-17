const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=false;
try{paused=localStorage.getItem('ff-motion-paused')==='1';}catch{}
const enabled=()=>!reduced.matches&&!paused;
window.ffMotion={enabled};
const button=$('#motion-toggle');
function apply(){
 document.body.classList.toggle('motion-paused',paused);
 if(button){button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Retomar animações decorativas':'Pausar animações decorativas');button.firstElementChild.textContent=paused?'▶':'Ⅱ';}
 window.dispatchEvent(new CustomEvent('ff:motion',{detail:{enabled:enabled()}}));
}
button?.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('ff-motion-paused',paused?'1':'0');}catch{}apply();});
reduced.addEventListener('change',apply);apply();
const hero=$('.ff-hero'),photo=$('[data-hero-image]');
let frame=0,point=null;
function paint(){
 frame=0;
 if(hero){
  const rect=hero.getBoundingClientRect(),part=Math.max(0,Math.min(1,-rect.top/Math.max(rect.height,1)));
  const active=enabled()&&!document.hidden;
  hero.style.setProperty('--hero-shift',(active?part*(innerWidth<600?8:16):0)+'px');
  hero.style.setProperty('--hero-scale',active?String(1.035+part*.03):'1');
  if(point&&photo&&active){photo.style.setProperty('--pointer-x',point.x+'%');photo.style.setProperty('--pointer-y',point.y+'%');}
 }
}
const queue=()=>{if(!frame)frame=requestAnimationFrame(paint);};
window.addEventListener('scroll',queue,{passive:true});
window.addEventListener('resize',queue,{passive:true});
window.addEventListener('ff:motion',()=>{if(!enabled())photo?.classList.remove('is-pointed');queue();});
document.addEventListener('visibilitychange',queue);
photo?.addEventListener('pointermove',event=>{
 if(!enabled()||event.pointerType!=='mouse'||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;
 const rect=photo.getBoundingClientRect();if(!rect.width||!rect.height)return;
 point={x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))};
 photo.classList.add('is-pointed');queue();
},{passive:true});
photo?.addEventListener('pointerleave',()=>{point=null;photo.classList.remove('is-pointed');});
queue();

// Content is visible without JS; once-only reveals are enabled progressively.
const revealSelector='.ff-section>.section-index,.menu-heading,.manifesto-copy,.service-row,.treatment-item,.extra-item,.explorer-heading,#react-gallery,.process-layout,.care-heading,.care-showcase,.personal-layout,.faq-list,.closing-panel';
const show=element=>{element.dataset.revealState='visible';observer?.unobserve(element);};
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)show(entry.target);});},{threshold:.08,rootMargin:'0px 0px -30px 0px'}):null;
function watchContent(){
 if(document.body.dataset.page!=='home')return;
 $$(revealSelector).forEach(element=>{
  if(element.dataset.revealState)return;
  const rect=element.getBoundingClientRect();
  if(!enabled()||!observer||(rect.top>=0&&rect.top<innerHeight-30)){element.dataset.revealState='visible';return;}
  const siblings=[...element.parentElement.children],index=siblings.indexOf(element);
  element.style.setProperty('--reveal-delay',Math.min(index,3)*65+'ms');
  element.dataset.revealState='pending';observer.observe(element);
 });
}
watchContent();
window.addEventListener('ff:menu',watchContent);
window.addEventListener('ff:motion',()=>{if(!enabled())$$('[data-reveal-state=pending]').forEach(show);else watchContent();});
document.addEventListener('focusin',event=>{const pending=event.target.closest('[data-reveal-state=pending]');if(pending)show(pending);});
