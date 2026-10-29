// Manual navigation keeps each plan readable without advancing while someone reads.
export function mountCarePlans(host, {plans, money, root}) {
 const photos=[['modern-gt3.webp','Porsche 911 GT3 moderno, fotografia editorial',933,1400],['modern-mclaren.webp','McLaren moderno preto, fotografia editorial',1200,1800],['modern-ducati.webp','Ducati Panigale, fotografia editorial',1600,1068]];
 host.innerHTML='<div class="care-stage" role="region" aria-roledescription="carrossel" aria-label="Planos Fine Form Care" tabindex="0">'+plans.map((p,i)=>'<article class="care-feature" data-plan="'+p.id+'" aria-labelledby="plan-title-'+p.id+'"'+(i?' hidden':'')+'><div class="care-photo"><img src="'+root+'assets/'+photos[i][0]+'" srcset="'+root+'assets/'+photos[i][0].replace('.webp','-mobile.webp')+' 560w, '+root+'assets/'+photos[i][0]+' '+photos[i][2]+'w" sizes="(max-width:700px) calc(100vw - 44px), 500px" width="'+photos[i][2]+'" height="'+photos[i][3]+'" decoding="async" alt="'+photos[i][1]+'" loading="lazy" draggable="false"><span>FINE FORM <b>CARE</b></span></div><div class="care-copy"><p class="care-kind">'+(p.vehicle==='car'?'Para seu carro':'Para sua moto')+' · plano mensal</p><h3 id="plan-title-'+p.id+'">'+p.name+'</h3><p class="care-description">'+p.description+'</p><div class="care-price"><strong>'+money(p.price)+'</strong><span>/ mês</span></div><dl class="care-facts"><div><dt>Visitas no mês</dt><dd>'+p.visits+' atendimentos</dd></div><div><dt>Economia mensal</dt><dd>'+money(p.saving)+'</dd></div></dl><a class="button dark-button care-interest" href="'+root+'atendimento/?plan='+p.id+'">Quero este plano <span aria-hidden="true">↗</span></a><p class="care-agreement">Para um veículo cadastrado. Agenda combinada com Mateus.</p></div></article>').join('')+'</div><div class="care-controls"><button type="button" class="care-arrow" data-plan-step="-1" aria-label="Ver plano anterior">←</button><div class="care-selectors" role="group" aria-label="Escolher plano">'+plans.map((p,i)=>'<button type="button" data-plan-index="'+i+'" aria-pressed="'+(i===0)+'"><span class="care-dot" aria-hidden="true"></span>'+p.name+'</button>').join('')+'</div><button type="button" class="care-arrow" data-plan-step="1" aria-label="Ver próximo plano">→</button></div><p class="care-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p>';
 host.insertBefore(host.querySelector('.care-controls'),host.querySelector('.care-stage'));
 const stage=host.querySelector('.care-stage'), cards=[...host.querySelectorAll('.care-feature')], selectors=[...host.querySelectorAll('[data-plan-index]')];
 let active=0, gesture=null;
 function select(index){
  const next=(index+plans.length)%plans.length;if(next===active)return;
  const moveFocus=cards[active].contains(document.activeElement);
  active=next;
  cards.forEach((card,i)=>{card.hidden=i!==active;});
  selectors.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===active)));
  host.querySelector('.care-status').textContent=plans[active].name+', '+money(plans[active].price)+' por mês. Plano '+(active+1)+' de '+plans.length+'.';
  if(moveFocus)cards[active].querySelector('a').focus({preventScroll:true});
  host.dispatchEvent(new CustomEvent('ff:plan',{detail:{id:plans[active].id}}));
 }
 host.querySelectorAll('[data-plan-step]').forEach(button=>button.addEventListener('click',()=>select(active+Number(button.dataset.planStep))));
 selectors.forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.planIndex))));
 host.addEventListener('keydown',event=>{
  const keys={ArrowRight:active+1,ArrowLeft:active-1,Home:0,End:plans.length-1};
  if(!(event.key in keys)||event.altKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();select(keys[event.key]);
 });
 stage.addEventListener('pointerdown',event=>{
  if(event.isPrimary===false||event.button>0||event.target.closest('a,button'))return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
  try{stage.setPointerCapture(event.pointerId);}catch{}
 });
 stage.addEventListener('pointerup',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)select(active+(dx<0?1:-1));
 });
 stage.addEventListener('pointercancel',()=>{gesture=null;});
 stage.addEventListener('lostpointercapture',()=>{gesture=null;});
 return {select};
}
