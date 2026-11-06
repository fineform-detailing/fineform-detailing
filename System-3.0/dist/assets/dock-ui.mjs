// Panel actions reuse the public site capsule styles and scroll behavior.
export function bindDockVisibility(nav,{window,scrollTarget=window}={}){
 const document=nav.ownerDocument,links=[...nav.querySelectorAll('.ff-dock-link')];
 let timer=0,lastY=scrollTarget===window?window.scrollY||0:scrollTarget.scrollTop||0;
 const show=hidden=>{
  if(hidden&&nav.contains(document.activeElement))return;
  nav.classList.toggle('ff-dock-scroll-hidden',hidden);
  for(const link of links)link.tabIndex=hidden?-1:(nav.getAttribute('role')==='tablist'&&link.getAttribute('aria-selected')!=='true'?-1:0);
 };
 const scroll=()=>{
  const y=scrollTarget===window?window.scrollY||0:scrollTarget.scrollTop||0;
  if(Math.abs(y-lastY)<1)return;
  lastY=y;show(true);window.clearTimeout(timer);timer=window.setTimeout(()=>show(false),300);
 };
 const keyboard=()=>{
  const input=document.activeElement;
  nav.classList.toggle('ff-dock-keyboard',Boolean(window.innerWidth<=760&&input?.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]')));
 };
 const focusout=()=>window.queueMicrotask(keyboard);
 const pageshow=()=>{window.clearTimeout(timer);show(false);keyboard();};
 scrollTarget.addEventListener('scroll',scroll,{passive:true});
 window.addEventListener('pageshow',pageshow);window.addEventListener('resize',keyboard,{passive:true});
 document.addEventListener('focusin',keyboard);document.addEventListener('focusout',focusout);
 return ()=>{
  window.clearTimeout(timer);scrollTarget.removeEventListener('scroll',scroll);
  window.removeEventListener('pageshow',pageshow);window.removeEventListener('resize',keyboard);
  document.removeEventListener('focusin',keyboard);document.removeEventListener('focusout',focusout);
 };
}

export function mountActionDock({container,items,label,window=container.ownerDocument.defaultView,scrollTarget=window,tablist=false}){
 const document=container.ownerDocument,nav=document.createElement('nav');
 nav.className='ff-dock';nav.setAttribute('aria-label',label);
 if(tablist)nav.setAttribute('role','tablist');
 const buttons=items.map(({id,label,icon,attributes={}})=>{
  const button=document.createElement('button');button.type='button';button.className='ff-dock-link';button.dataset.dock=id;
  button.setAttribute('aria-label',label);
  if(tablist){button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.tabIndex=-1;}
  for(const [key,value] of Object.entries(attributes))button.setAttribute(key,value);
  const glyph=document.createElement('span');glyph.className='ff-dock-icon';glyph.innerHTML=icon;
  const text=document.createElement('span');text.className='ff-dock-label';text.textContent=label;
  button.append(glyph,text);nav.append(button);return button;
 });
 container.append(nav);
 let current;
 const select=id=>{
  if(current===id)return;
  current=id;nav.dataset.active=id||'';
  nav.style.setProperty('--dock-columns',items.map(item=>item.id===id?'2.3fr':'1fr').join(' '));
  buttons.forEach((button,index)=>{
   const active=items[index].id===id;button.classList.toggle('is-selected',active);
   if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
   if(tablist){button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  });
 };
 const stop=bindDockVisibility(nav,{window,scrollTarget});
 return {nav,select,destroy(){stop();nav.remove();}};
}
