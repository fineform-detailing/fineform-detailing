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
const desktop=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 851px)');
let frame=0,point=null,inView=true,listening=false,heroTop=0,heroHeight=1;
const measure=()=>{if(hero){heroTop=hero.offsetTop;heroHeight=Math.max(hero.offsetHeight,1);}};
function paint(){
 frame=0;
 if(!hero)return;
 const active=enabled()&&desktop.matches&&inView&&!document.hidden;
 const part=active?Math.max(0,Math.min(1,(scrollY-heroTop)/heroHeight)):0;
 hero.style.setProperty('--hero-shift',(part*14)+'px');
 hero.style.setProperty('--hero-scale',active?String(1.025+part*.02):'1');
 if(point&&photo&&active){photo.style.setProperty('--pointer-x',point.x+'%');photo.style.setProperty('--pointer-y',point.y+'%');}
}
const queue=()=>{if(!frame)frame=requestAnimationFrame(paint);};
function sync(){
 const active=Boolean(hero)&&enabled()&&desktop.matches&&inView&&!document.hidden;
 if(active!==listening){listening=active;if(active)window.addEventListener('scroll',queue,{passive:true});else window.removeEventListener('scroll',queue);}
 if(!active)photo?.classList.remove('is-pointed');queue();
}
window.addEventListener('resize',()=>{measure();sync();},{passive:true});
window.addEventListener('ff:motion',sync);desktop.addEventListener('change',sync);
 document.addEventListener('visibilitychange',sync);
if(hero&&typeof IntersectionObserver==='function'){const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});visibility.observe(hero);}
if(hero&&typeof ResizeObserver==='function'){const size=new ResizeObserver(measure);size.observe(hero);}
photo?.addEventListener('pointermove',event=>{
 if(!enabled()||!desktop.matches||event.pointerType!=='mouse')return;
 const rect=photo.getBoundingClientRect();if(!rect.width||!rect.height)return;
 point={x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))};
 photo.classList.add('is-pointed');queue();
},{passive:true});
photo?.addEventListener('pointerleave',()=>{point=null;photo.classList.remove('is-pointed');});
measure();sync();

// Content is visible without JS; once-only reveals are enabled progressively.
const revealSelector='.ff-section>.section-index,.menu-heading,.manifesto-copy,.service-row,.treatment-item,.extra-item,.explorer-heading,#react-gallery,.process-layout,.care-heading,.care-showcase,.personal-layout,.faq-list,.closing-panel,.reviews-heading,.reviews-list';
const show=element=>{element.dataset.revealState='visible';observer?.unobserve(element);};
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)show(entry.target);});},{threshold:.08,rootMargin:'0px 0px -30px 0px'}):null;
function watchContent(){
 if(document.body.dataset.page!=='home')return;
 const candidates=$$(revealSelector).filter(element=>!element.dataset.revealState).map(element=>({element,rect:element.getBoundingClientRect()}));
 candidates.forEach(({element,rect})=>{
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
