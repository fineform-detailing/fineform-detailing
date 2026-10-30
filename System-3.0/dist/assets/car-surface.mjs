const labels={geral:'Vista do carro. Arraste para girar.',pintura:'Pintura em destaque',interior:'Interior revelado',vidros:'Vidros em destaque',rodas:'Rodas em destaque',acabamentos:'Acabamentos em destaque'};
export function mountCarSurface(host,{root='../',view='geral',onViewChange}={}){
 if(!host)return null;
 const src=name=>root+'assets/'+name;
 let frame=0,scene=view,start=null,disposed=false,loaded=false;
 const surface=document.createElement('div');surface.className='fn-turntable';surface.hidden=true;surface.setAttribute('role','img');surface.setAttribute('aria-label','Visualização ilustrativa do veículo. Arraste para girar.');host.append(surface);
 const detail=document.createElement('img');detail.className='fn-part-view';detail.alt='';detail.width=800;detail.height=500;detail.hidden=true;host.append(detail);
 const fallback=host.querySelector('.fn-car-fallback');
 const sheet=new host.ownerDocument.defaultView.Image();sheet.onload=()=>{if(disposed)return;loaded=true;surface.style.backgroundImage='url("'+src('car-turns.webp')+'")';if(scene==='geral'){surface.hidden=false;if(fallback)fallback.hidden=true;}};
 function ensureSheet(){if(!sheet.src)sheet.src=src('car-turns.webp');}
 function angle(value){frame=(value%8+8)%8;surface.style.backgroundPosition=(frame*100/7)+'% 50%';}
 function show(id='geral'){
  if(disposed)return;scene=labels[id]?id:'geral';host.dataset.carView=scene;host.setAttribute('aria-label',labels[scene]);detail.hidden=true;surface.hidden=true;
  if(scene==='geral'){if(fallback)fallback.hidden=loaded;surface.hidden=!loaded;}
  else{const path=src('car-'+scene+'.webp');if(fallback)fallback.hidden=false;detail.onload=()=>{if(scene===id&&!disposed){detail.hidden=false;if(fallback)fallback.hidden=true;}};detail.src=path;if(detail.complete&&detail.naturalWidth){detail.hidden=false;if(fallback)fallback.hidden=true;}}
 }
 host.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button>0)return;start={x:e.clientX,y:e.clientY,frame};ensureSheet();});
 host.addEventListener('pointermove',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.3){if(scene!=='geral'){show('geral');onViewChange?.('geral');host.dispatchEvent(new host.ownerDocument.defaultView.CustomEvent('car-view-change',{bubbles:true,detail:{view:'geral'}}));}angle(start.frame-Math.round(dx/30));}});
 for(const type of ['pointerup','pointercancel','pointerleave'])host.addEventListener(type,()=>{start=null;});
 host.addEventListener('pointerenter',ensureSheet,{once:true});
 angle(0);show(view);
 const observer=new host.ownerDocument.defaultView.MutationObserver(()=>{if(!host.isConnected)dispose();});if(host.isConnected)observer.observe(host.ownerDocument,{subtree:true,childList:true});
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();sheet.onload=null;detail.onload=null;surface.remove();detail.remove();}
 return{setView:show,setAngle:angle,dispose};
}
