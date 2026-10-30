import{mountCarSurface}from'./car-surface.mjs';
const host=document.querySelector('[data-home-car]');
if(host){const viewer=mountCarSurface(host,{root:'./'}),buttons=[...document.querySelectorAll('[data-home-focus]')];const select=id=>buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.homeFocus===id)));host.addEventListener('car-view-change',()=>select('geral'));for(const button of buttons)button.addEventListener('click',()=>{viewer.setView(button.dataset.homeFocus);select(button.dataset.homeFocus);});}
