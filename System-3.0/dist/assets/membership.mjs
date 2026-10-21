import {api,escape as e,dateLabel,visitLabel,trackingUrl,submissionToken,saveBookmark,copyText,watchUpdates} from './system.mjs';
import {PRIVACY_VERSION} from './privacy-storage.mjs';
import {creditKinds,chooseCredit,visitAvailability} from './membership-state.mjs';
import {findPlan,money,todaySP,timesFor,compatibleExtras,extraPrice,extraPriceFor,includedFor,availableTreatments,treatmentPrice,polishIds,normalizeTreatments,normalizeExtras,planVisitQuote,validatePreference} from './catalog.mjs';
import {plateLabel,registeredPlateLabel} from './plates.mjs';
const host=document.getElementById('membership-content'),live=document.getElementById('live-state');
const id=new URLSearchParams(location.search).get('id'),token=new URLSearchParams(location.hash.slice(1)).get('t');
let subscription,stop,initialized=false,submitting=false;
let draft={mode:'single',vehicle:'car',service:'premium',treatments:[],extras:[],date:'',time:'',flexibleDate:true,notes:''};
const labels={active:'Ativo',paused:'Pausado',cancelled:'Cancelado',scheduled:'Agendada',in_progress:'Em cuidado',completed:'Concluída',cancelledVisit:'Cancelada'};
const empty='<div class="system-empty"><h2>Abra seu link privado do Care.</h2><p>Mateus envia esse link quando o plano é ativado. Se perdeu o acesso, fale com ele.</p><a class="button orange" href="https://wa.me/5511959473298">Falar com Mateus ↗</a></div>';
function renderOverview(){
 const s=subscription,p=findPlan(s.planId),c=s.cycle;
 document.getElementById('care-overview').innerHTML='<section class="system-card"><span class="status-badge status-'+e(s.status)+'">'+labels[s.status]+'</span><h2 style="margin-top:20px">'+e(p.name)+'</h2><p>Olá, '+e(s.name)+'. Este Care acompanha '+e(s.model)+'.</p><div class="plate-lock"><span>VEÍCULO VINCULADO AO CARE</span><strong>'+e(registeredPlateLabel(s))+'</strong><p>As lavagens são exclusivas deste veículo. Outros carros ou motos precisam de atendimento avulso ou de outra assinatura.</p></div><div class="system-note">'+(c?'Ciclo: '+dateLabel(c.starts_on)+' até '+dateLabel(previousDay(c.ends_on))+'.<br>Mensalidade do ciclo: '+money(c.price_cents/100)+' · '+(c.paid?'Pagamento confirmado':'Pagamento pendente')+(c.expired?'<br><strong>Seu ciclo terminou. Fale com Mateus para renovar.</strong>':c.notStarted?'<br>O saldo estará disponível na data de início.':''):'Fale com Mateus para ativar seu próximo ciclo.')+'</div><div class="credit-grid">'+(c?Object.entries(c.credits).filter(([,v])=>v.quota>0).map(([k,v])=>'<div class="credit-box"><h3>'+visitLabel[k]+'</h3><strong>'+v.available+'</strong><span> de '+v.quota+' disponíveis</span><p>'+v.done+' concluída(s) · '+v.reserved+' reservada(s)</p></div>').join(''):'')+'</div><p class="system-muted">Uma visita aceita reserva uma lavagem. Quando concluída, ela entra no seu histórico. O saldo é do ciclo e não acumula. Renovação e pagamento são combinados com Mateus.</p><div class="system-actions"><button class="button outline" id="refresh-care" type="button">Atualizar saldo</button><button class="button outline" id="copy-care" type="button">Copiar meu link</button><a class="button orange" href="https://wa.me/5511959473298?text='+encodeURIComponent('Olá, Mateus! Gostaria de conversar sobre meu '+p.name+' para '+s.model+' · placa '+registeredPlateLabel(s)+'.')+'">Falar sobre meu Care ↗</a></div></section><div class="system-grid"><section class="system-card"><h2>Visitas deste ciclo.</h2>'+(s.visits.length?'<div class="system-list">'+s.visits.map(v=>'<div class="system-row"><span><strong>'+visitLabel[v.kind]+'</strong><small>'+dateLabel(v.date)+(v.time?' · '+e(v.time):'')+' · '+e(plateLabel(v.plate))+'</small></span><span class="status-badge status-'+e(v.status)+'">'+(v.status==='cancelled'?'Cancelada':labels[v.status])+'</span></div>').join('')+'</div>':'<p class="system-muted">Sua primeira visita deste ciclo ainda será combinada.</p>')+'</section><section class="system-card"><h2>Seus ciclos.</h2><div class="system-list">'+s.history.map(h=>'<div class="system-row"><span><strong>'+dateLabel(h.start)+' — '+dateLabel(previousDay(h.end))+'</strong><small>'+money(h.price)+' · '+(h.paid?'Pago':'Pendente')+'<br>'+Object.entries(h.credits||{}).filter(([,v])=>v.quota>0).map(([k,v])=>visitLabel[k]+': '+v.done+'/'+v.quota+' realizada(s)').join(' · ')+'</small></span><span>'+ (h.id===c?.id?'Em consulta':'Histórico')+'</span></div>').join('')+'</div></section></div>';
 if((s.visitHistory||[]).length)document.getElementById('care-overview').insertAdjacentHTML('beforeend','<section class="system-card"><details><summary>Ver lavagens de ciclos anteriores</summary><div class="system-list">'+(s.visitHistory||[]).map(v=>'<div class="system-row"><span>'+visitLabel[v.kind]+'<small>'+dateLabel(v.date)+(v.time?' · '+e(v.time):'')+' · '+e(plateLabel(v.plate))+'</small></span><span>'+visitStatesForHistory(v.status)+'</span></div>').join('')+'</div></details></section>');
 document.getElementById('refresh-care').onclick=()=>load().catch(showError);
 document.getElementById('copy-care').onclick=()=>copyText(trackingUrl(id,token,'assinatura')).then(()=>window.ff?.toast('Link copiado.')).catch(showError);
 if(initialized)syncAvailability();
}
function visitStatesForHistory(s){return s==='cancelled'?'Cancelada':labels[s];}
function previousDay(s){return new Date(new Date(s+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10);}
function renderForm(){
 const c=subscription.cycle,kinds=creditKinds(subscription),kind=chooseCredit(subscription);
 draft.vehicle=subscription.vehicle;draft.service=kind==='moto'?'motoPremium':kind||(subscription.vehicle==='moto'?'motoPremium':'premium');
 document.getElementById('care-request').innerHTML='<section class="system-card"><h2>Seu próximo cuidado.</h2><p class="system-muted" id="care-availability">'+e(visitAvailability(subscription,kind).reason)+'</p><form id="visit-request" novalidate><div class="system-note" id="care-plate-lock">Placa vinculada: <strong>'+e(registeredPlateLabel(subscription))+'</strong>. Confira se você trará este veículo.</div><label class="system-field"><span>Lavagem incluída no Care</span><select name="creditKind">'+kinds.map(([k,v])=>'<option value="'+k+'" '+(k===kind?'selected':'')+(Number(v.available)<1?' disabled':'')+'>'+visitLabel[k]+' · '+v.available+' disponível(is)</option>').join('')+'</select></label><div class="system-grid"><label class="system-field"><span>Data de preferência</span><input name="date" type="date" min="'+todaySP()+'" max="'+(c?previousDay(c.ends_on):todaySP())+'"></label><label class="system-field"><span>Horário</span><select name="time"><option value="">A combinar</option></select></label></div><div id="visit-addons"></div><div class="system-note" id="visit-total"></div><label class="system-field"><span>Observações (opcional)</span><textarea name="notes" maxlength="600" placeholder="Conte algo sobre esta visita."></textarea></label><label class="system-check"><input name="ack" type="checkbox" required><span>Solicito esta visita e entendo que o saldo será reservado quando Mateus aceitar.</span></label><p class="privacy-inline">A Fine Form usa os dados desta visita para organizar o atendimento. Evite dados sensíveis nas observações. <a href="../privacidade/">Privacidade</a> · <a href="../termos/">Termos</a> · <a href="../cancelamento-e-reembolso/">Cancelamento</a>.</p><label class="system-check"><input name="rememberLink" type="checkbox"><span>Guardar o link desta visita neste aparelho por até 90 dias (opcional).</span></label><label class="sr-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p id="visit-error" class="system-error" role="alert" hidden></p><p id="visit-status" class="system-muted" role="status" aria-live="polite"></p><button class="button orange" type="submit" id="request-visit-button" aria-busy="false" aria-describedby="visit-status" '+(!visitAvailability(subscription,kind).allowed?'disabled':'')+'>Solicitar visita ↗</button><a id="visit-support" class="underlined-link" style="margin:18px 0" href="https://wa.me/5511959473298" hidden>Falar com Mateus ↗</a></form><div id="visit-receipt"></div></section>';
 const form=document.getElementById('visit-request');
 form.addEventListener('change',event=>{
  if(submitting)return;
  const el=event.target;
  if(el.name==='creditKind'){draft.service=el.value==='moto'?'motoPremium':el.value;draft.extras=[];draft.treatments=[];renderAddons();}
  else if(el.name==='date'){draft.date=el.value;draft.time='';form.elements.time.innerHTML='<option value="">A combinar</option>'+timesFor(draft.date).map(t=>'<option>'+t+'</option>').join('');}
  else if(el.name==='time')draft.time=el.value;
  else if(el.name==='extra'||el.name==='treatment'){
   const key=el.name==='extra'?'extras':'treatments';draft[key]=draft[key].filter(v=>v!==el.value);
   if(el.checked){if(key==='treatments'&&polishIds.includes(el.value))draft[key]=draft[key].filter(v=>!polishIds.includes(v));if(key==='extras'&&['leather','fabric'].includes(el.value))draft[key]=draft[key].filter(v=>!['leather','fabric'].includes(v));draft[key].push(el.value);}
   draft.extras=normalizeExtras(draft);draft.treatments=normalizeTreatments(draft);renderAddons();
  }
  syncAvailability();
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitting)return;
  const error=document.getElementById('visit-error');error.hidden=true;
  const availability=visitAvailability(subscription,form.elements.creditKind.value);
  const invalid=message=>{error.textContent=message;error.hidden=false;error.scrollIntoView({block:'nearest'});};
  if(!availability.allowed){invalid(availability.reason);syncAvailability();return;}
  if(!form.elements.ack.checked){invalid('Marque a autorização acima para enviar sua solicitação.');form.elements.ack.focus();return;}
  const payload={...draft,date:form.elements.date.value,time:form.elements.time.value,creditKind:form.elements.creditKind.value,notes:form.elements.notes.value,website:form.elements.website.value,ack:true,privacyVersion:PRIVACY_VERSION};
  const preferenceError=validatePreference(payload);if(preferenceError){invalid(preferenceError);return;}
  if(payload.date&&(payload.date<subscription.cycle.starts_on||payload.date>=subscription.cycle.ends_on)){invalid('Escolha uma data dentro do período do seu ciclo.');return;}
  submitting=true;form.inert=true;syncAvailability();
  try{
   const submission=submissionToken(payload,'ff-care-request-'+id);
   const {quote}=await api('/api/subscriptions/'+id+'/requests',{method:'POST',token,body:{...payload,submissionToken:submission}});
   saveBookmark(quote.id,submission,quote.reference,{remember:form.elements.rememberLink.checked});const link=trackingUrl(quote.id,submission);
   document.getElementById('visit-receipt').innerHTML='<div class="system-success"><strong>Visita solicitada · '+e(quote.reference)+'</strong><p>Seu saldo será reservado quando Mateus aceitar. Acompanhe este pedido pelo link abaixo.</p><a class="button orange" href="'+e(link)+'">Acompanhar visita ↗</a><div class="system-actions"><button class="button outline" id="another-visit" type="button">Solicitar outra lavagem</button></div></div>';
   form.hidden=true;
   document.getElementById('another-visit').onclick=()=>{draft={...draft,treatments:[],extras:[],date:'',time:'',notes:''};try{sessionStorage.removeItem('ff-care-request-'+id);}catch{}renderForm();syncAvailability();document.getElementById('visit-request').scrollIntoView({block:'start'});};
   try{await load();}catch(error){showError(error);}
  }catch(err){invalid(err.message);}
  finally{submitting=false;form.inert=false;syncAvailability();}
 });
 renderAddons();syncAvailability();
}
function syncAvailability(){
 const form=document.getElementById('visit-request');if(!form)return;
 const select=form.elements.creditKind,selected=chooseCredit(subscription,select.value),kinds=creditKinds(subscription);
 select.innerHTML=kinds.map(([kind,credit])=>'<option value="'+kind+'" '+(kind===selected?'selected':'')+(Number(credit.available)<1?' disabled':'')+'>'+visitLabel[kind]+' · '+credit.available+' disponível(is)</option>').join('');
 select.value=selected;
 const service=selected==='moto'?'motoPremium':selected||(subscription.vehicle==='moto'?'motoPremium':'premium');
 if(draft.service!==service){draft.service=service;draft.treatments=normalizeTreatments(draft);draft.extras=normalizeExtras(draft);renderAddons();}
 document.getElementById('care-plate-lock').textContent='Placa vinculada: '+registeredPlateLabel(subscription)+'. Confira se você trará este veículo.';
 const cycle=subscription.cycle;
 form.elements.date.min=cycle?.starts_on>todaySP()?cycle.starts_on:todaySP();
 form.elements.date.max=cycle?previousDay(cycle.ends_on):todaySP();
 const availability=visitAvailability(subscription,selected),button=document.getElementById('request-visit-button');
 button.disabled=submitting||!availability.allowed;
 button.setAttribute('aria-busy',String(submitting));
 button.textContent=submitting?'Enviando solicitação…':availability.allowed?'Solicitar visita ↗':'Visita indisponível';
 const hint=submitting?'Enviando seu pedido. Aguarde a confirmação.':!availability.allowed?availability.reason:!form.elements.ack.checked?'Marque a autorização acima para enviar sua solicitação.':availability.reason;
 document.getElementById('visit-status').textContent=hint;
 document.getElementById('care-availability').textContent=availability.reason;
 document.getElementById('visit-support').hidden=availability.allowed||submitting;
}
function renderAddons(){
 const included=includedFor(draft),box=document.getElementById('visit-addons');
 box.innerHTML='<h3 style="font-size:16px;margin:22px 0">Quer adicionar algum cuidado?</h3><div class="system-choices">'+compatibleExtras(draft.vehicle).filter(x=>!included.includes(x.id)&&!(x.id==='exteriorPlastic'&&draft.extras.includes('plasticCoating'))).map(x=>'<label class="system-choice"><input type="checkbox" name="extra" value="'+x.id+'" '+(draft.extras.includes(x.id)?'checked':'')+'><span>'+e(x.label)+' · '+money(extraPriceFor(x,draft))+'<small>'+e(x.description)+'</small></span></label>').join('')+availableTreatments(draft).map(x=>'<label class="system-choice"><input type="checkbox" name="treatment" value="'+x.id+'" '+(draft.treatments.includes(x.id)?'checked':'')+'><span>'+e(x.label)+' · '+money(treatmentPrice(x.id,draft))+'<small>'+e(x.description)+'</small></span></label>').join('')+'</div>';
 const budget=planVisitQuote(draft);document.getElementById('visit-total').innerHTML='<strong>Lavagem: incluída no Care.</strong><br>Adicionais desta visita: <strong>'+money(budget.total)+'</strong>'+(budget.discount?'<br>Já descontadas as etapas em comum: '+money(budget.discount)+'.':'')+'<br>Sem nova cobrança de mensalidade neste pedido.';
}
async function load(){const data=await api('/api/subscriptions/'+id,{token});subscription=data.subscription;if(!initialized){host.innerHTML='<div id="care-overview"></div><div id="care-request"></div>';}renderOverview();if(!initialized){renderForm();initialized=true;}}
function showError(error){live.textContent='Não foi possível atualizar';if(error.status===404){stop?.();host.innerHTML=empty;}else{let box=document.getElementById('care-error');if(!box){box=document.createElement('p');box.id='care-error';box.className='system-error';box.setAttribute('role','alert');host.prepend(box);}box.textContent=error.message;}}
if(!id||!token)host.innerHTML=empty;else load().then(()=>{stop=watchUpdates({scope:'subscription',id,token,onChange:()=>load().catch(showError),onState:s=>{live.dataset.live=s;live.textContent=s==='live'?'Saldo e visitas atualizados ao vivo':s==='connecting'?'Conectando atualizações…':'Saldo carregado • atualização periódica ativa';}});}).catch(showError);
window.addEventListener('pagehide',event=>{if(!event.persisted)stop?.();});
