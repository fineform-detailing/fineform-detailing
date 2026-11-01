import {mountCustomerNotice} from './customer-notifications.mjs';
import {api,submissionToken,trackingUrl,saveBookmark,copyText,clearPendingSubmission} from './system.mjs';
import {preferredContact} from './contacts.mjs';
import {PRIVACY_VERSION,DRAFT_TTL,readDraft} from './privacy-storage.mjs';
import {REQUEST_NOTICE} from './business-stage.mjs';
import {services,extras,plans,money,findService,findPlan,compatibleExtras,extraPrice,extraPriceFor,polishIds,availableTreatments,treatmentPrice,hasCoating,normalizeExtras,normalizeTreatments,includedFor,baseFor,todaySP,validDate,timesFor,validatePreference,createSummary,quoteFor} from './catalog.mjs';
const $=s=>document.querySelector(s);
const content=$('#wizard-content'),form=$('#care-form');
if(!form)throw new Error('Missing care form');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const goals=['Manutenção','Interior','Pintura','Rodas','Acabamentos','Quero orientação'];
const key='ff-care-draft-v1';
const defaults=()=>({vehicle:'car',model:'',mode:'single',service:'essential',plan:'',goals:[],extras:[],treatments:[],date:'',time:'',flexibleDate:true,name:'',phone:'',notes:'',ack:false,rememberLink:false});
let state=defaults(),step=0,remember=false,sending=false;
function sanitize(raw){
 const next=defaults();
 if(!raw||typeof raw!=='object')return next;
 next.vehicle=raw.vehicle==='moto'?'moto':'car';
 next.mode=['single','plan','guidance'].includes(raw.mode)?raw.mode:'single';
 const savedService=findService(raw.service);
 next.service=savedService?.vehicle===next.vehicle?savedService.id:next.vehicle==='car'?'essential':'motoPremium';
 next.plan=plans.some(x=>x.id===raw.plan&&x.vehicle===next.vehicle)?raw.plan:next.vehicle==='car'?'careEssential':'careMoto';
 for(const k of ['model','name','phone','date','time','notes'])next[k]=typeof raw[k]==='string'?raw[k].slice(0,k==='notes'?600:80):'';
 next.goals=Array.isArray(raw.goals)?raw.goals.filter(x=>goals.includes(x)):[];
 next.extras=Array.isArray(raw.extras)?raw.extras.filter(x=>typeof x==='string'):[];
 next.treatments=Array.isArray(raw.treatments)?raw.treatments.filter(x=>typeof x==='string'):[];
 next.flexibleDate=raw.flexibleDate!==false;
 next.treatments=normalizeTreatments(next);next.extras=normalizeExtras(next);
 return next;
}
try{const saved=readDraft(localStorage);if(saved){state=sanitize(saved);remember=true;step=Number.isInteger(saved.draftStep)?Math.max(0,Math.min(4,saved.draftStep)):0;}}catch{}
const params=new URLSearchParams(location.search);
if(params.get('vehicle')==='moto')state.vehicle='moto';
if(params.get('vehicle')==='car')state.vehicle='car';
const incomingService=findService(params.get('service'));
if(incomingService){state.vehicle=incomingService.vehicle;state.service=incomingService.id;state.mode='single';state.extras=[];state.treatments=[];}
const incomingPlan=findPlan(params.get('plan'));
if(incomingPlan){state.vehicle=incomingPlan.vehicle;state.plan=incomingPlan.id;state.mode='plan';state.extras=[];state.treatments=[];}
if(params.get('mode')==='guidance')state.mode='guidance';
const areaGoal={pintura:'Pintura',interior:'Interior',rodas:'Rodas',exterior:'Acabamentos'}[params.get('area')];
if(areaGoal){state.goals=[areaGoal];state.mode='guidance';}
state=sanitize(state);
if(state.model.trim().length<2||incomingService||incomingPlan||params.has('vehicle')||params.has('mode')||areaGoal)step=0;
if(step===4&&validatePreference(state))step=3;
const resumedStep=step;
$('#remember-draft').checked=remember;
function persist(){if(!remember)return;try{localStorage.setItem(key,JSON.stringify({...state,draftStep:step,ack:false,rememberLink:false,expiresAt:Date.now()+DRAFT_TTL}));}catch{remember=false;$('#remember-draft').checked=false;window.ff?.toast('Não foi possível guardar o rascunho. Você pode continuar normalmente.');}}
function tidy(){state.treatments=normalizeTreatments(state);state.extras=normalizeExtras(state);persist();}
function icon(type){return type==='car'?'<svg viewBox="0 0 100 50" aria-hidden="true"><path d="M9 32 13 22 26 18 37 9 64 9 80 20 91 24 93 36H8Z M28 18H76 M39 10 34 18 M61 10 67 18 M12 25H23 M83 27H91"/><circle cx="27" cy="36" r="8"/><circle cx="76" cy="36" r="8"/><circle cx="27" cy="36" r="3"/><circle cx="76" cy="36" r="3"/></svg>':'<svg viewBox="0 0 100 50" aria-hidden="true"><circle cx="23" cy="35" r="11"/><circle cx="79" cy="35" r="11"/><path d="m23 35 16-22h13l13 8-20 14H23l26-1-10-18 M52 13 61 8 72 8 79 35 M70 8 69 3H60 M28 12h19 M36 18 49 22 64 20"/></svg>';}
function heading(title,lead){return '<h2 class="wizard-title" tabindex="-1">'+title+'</h2><p class="wizard-lead">'+lead+'</p>';}
const bookingBrief={
 essential:'Lavagem externa, rodas, vidros e limpeza leve do interior.',
 premium:'Lavagem Essencial, frestas, proteção interna e cera.',
 extra:'Higienização profunda, exterior e vidros. Sem polimento.',
 fullClean:'Higienização de bancos e interior, com secagem combinada.',
 polishLight:'Realça brilho e ameniza marcas leves da pintura.',
 polishPremium:'Corte, refino e lustro conforme avaliação da pintura.',
 coating:'Proteção cerâmica na pintura após preparo técnico.',
 motoPremium:'Lavagem estética e acabamento compatível para sua moto.',
 careEssential:'1 Premium e 1 Essencial por mês.',
 careFrequent:'1 Premium e 3 Essenciais por mês.',
 careMoto:'2 lavagens Moto Premium por mês.',
 exteriorPlastic:'Limpeza e revitalização de plásticos externos.',
 plasticCoating:'Cerâmica em plásticos externos, com cura. Em motos, não aplicar em pneus, freios, banco, manoplas ou pedaleiras.',
 leather:'Limpeza e condicionamento do couro, sem reparos.',
 fabric:'Higienização do tecido, com secagem combinada.',
 wheelIron:'Descontaminação ferrosa das rodas acessíveis.',
 paintIron:'Descontaminação ferrosa da pintura, sem polimento.',
 glassCare:'Limpeza e proteção dos vidros; marcas removíveis.',
 motoPolish:'Realce de uma peça elegível, após avaliação.'
};
const shortFor=item=>bookingBrief[item.id]||item.description;
function choice({value,title,description,selected,action='service',extra=''}){return '<button type="button" class="choice-card '+(selected?'selected':'')+'" data-action="'+action+'" data-value="'+value+'" aria-pressed="'+selected+'"><h3>'+title+'</h3><p>'+description+'</p>'+extra+'</button>';}
function quoteBlock(selection=state){
 const quote=quoteFor(selection);
 if(!quote.items.length)return '<aside class="quote-box"><h3>Prévia do orçamento</h3><p>Selecione o cuidado principal para visualizar os valores.</p></aside>';
 const details=quote.items.map(item=>'<div><dt>'+esc(item.label)+(item.kind==='monthly'?' · mensalidade':item.kind==='complement'?' · complemento':'')+'</dt><dd>'+money(item.price)+'</dd></div>').join('');
 const credit=quote.discount?'<div class="quote-credit"><dt>Etapas em comum</dt><dd>−'+money(quote.discount)+'</dd></div>':'';
 const label=quote.recurring?(quote.additional?'Total deste pedido':'Total mensal'):quote.hasBase?'Total do atendimento':'Subtotal dos cuidados escolhidos';
 const planNote=quote.recurring&&quote.additional?'<p>Mensalidade: '+money(quote.recurring)+'/mês. Adicionais nesta visita: '+money(quote.additional)+'. Nas próximas mensalidades, o plano continua '+money(quote.recurring)+'.</p>':'';
 const guidance=!quote.hasBase?'<p>O orçamento completo será definido após escolher o cuidado principal com Mateus.</p>':'';
 return '<aside class="quote-box" aria-label="Seu orçamento"><h3>Prévia do orçamento</h3><dl>'+details+credit+'</dl><div class="quote-total"><span>'+label+'</span><strong>'+money(quote.total)+'</strong></div>'+planNote+guidance+'<p class="quote-note">Valor estimado. Confirmação após avaliação.</p></aside>';
}
function stepVehicle(){return heading('Seu veículo, nosso ponto de partida.','Conte qual carro ou moto vai receber o cuidado.')+'<div class="vehicle-options" role="group" aria-label="Tipo de veículo">'+['car','moto'].map(type=>'<button class="choice-card '+(state.vehicle===type?'selected':'')+'" type="button" data-action="vehicle" data-value="'+type+'" aria-pressed="'+(state.vehicle===type)+'"><span class="choice-icon">'+icon(type)+'</span><h3>'+(type==='car'?'Meu carro':'Minha moto')+'</h3></button>').join('')+'</div><label class="field"><span>Qual é a marca e o modelo? *</span><input name="model" autocomplete="off" maxlength="80" placeholder="'+(state.vehicle==='car'?'Ex.: Honda Civic 2020':'Ex.: Honda CB 500 2022')+'" value="'+esc(state.model)+'" required><small>O ano é opcional. A placa será cadastrada por Mateus quando o veículo chegar.</small></label>';
}
function stepCare(){
 let html=heading('Escolha o cuidado certo.','Compare os serviços e selecione o que deseja melhorar.');
 html+='<div class="mode-tabs" role="group" aria-label="Modalidade de atendimento">'+[['single','Um atendimento'],['plan','Care mensal'],['guidance','Quero orientação']].map(([v,l])=>'<button type="button" class="'+(state.mode===v?'active':'')+'" data-action="mode" data-value="'+v+'" aria-pressed="'+(state.mode===v)+'">'+l+'</button>').join('')+'</div>';
 if(state.mode==='single'){
  const serviceChoice=s=>choice({value:s.id,title:s.label,description:shortFor(s),selected:state.service===s.id,extra:'<strong class="booking-choice-price">'+money(s.price)+'</strong>'});
  const vehicleServices=services.filter(s=>s.vehicle===state.vehicle&&s.id!=='polishMedium');
  html+='<div class="choice-stack" role="group" aria-label="Cuidado principal">'+vehicleServices.filter(s=>s.class!=='Classe C').map(serviceChoice).join('')+'</div>';
  const treatments=vehicleServices.filter(s=>s.class==='Classe C');
  if(treatments.length)html+='<section class="booking-treatments" aria-label="Higienização, polimentos e vitrificação"><h3>Higienização, polimentos e vitrificação</h3><div class="choice-stack" role="group" aria-label="Tratamento principal">'+treatments.map(serviceChoice).join('')+'</div></section>';
 }
 if(state.mode==='plan')html+='<div class="choice-stack" role="group" aria-label="Plano mensal">'+plans.filter(p=>p.vehicle===state.vehicle).map(p=>choice({value:p.id,title:p.name,description:shortFor(p),selected:state.plan===p.id,action:'plan',extra:'<strong class="booking-choice-price">'+money(p.price)+'<span>/mês</span></strong>'})).join('')+'</div><p class="booking-inline-notice">O Care é ativado após conferência e cadastro presencial da placa.</p>';
 if(state.mode==='guidance')html+='<p class="booking-inline-notice">Indique o que merece atenção; a recomendação final depende da avaliação.</p>';
 html+='<fieldset class="fieldset-clean" style="margin-top:26px"><legend class="field-label legend">O que é importante para você? <small>(opcional)</small></legend><div class="goals">'+goals.filter(g=>state.vehicle==='car'||g!=='Interior').map(g=>'<button class="goal-button '+(state.goals.includes(g)?'selected':'')+'" type="button" data-action="goal" data-value="'+g+'" aria-pressed="'+state.goals.includes(g)+'">'+g+'</button>').join('')+'</div></fieldset>';
 return html;
}
function stepDetails(){
 const included=includedFor(state);
 let html=heading('Cada superfície importa.','Adicione apenas o que faz sentido para o seu veículo.');
 if(state.mode==='plan')html+='';
 html+='<div>'+compatibleExtras(state.vehicle).map(e=>{const replaced=e.id==='exteriorPlastic'&&state.extras.includes('plasticCoating');const inc=included.includes(e.id);return '<label class="extra-choice '+(inc?'included':'')+'"><input type="checkbox" name="extra" value="'+e.id+'" '+(!replaced&&(inc||state.extras.includes(e.id))?'checked ':'')+(inc||replaced?'disabled ':'')+'><span><b>'+e.label+'</b><small>'+shortFor(e)+'</small>'+(replaced?'<span class="included-badge">SUBSTITUÍDO PELA VITRIFICAÇÃO</span>':inc?'<span class="included-badge">JÁ INCLUÍDO · QUANDO COMPATÍVEL</span>':'<span class="option-price">'+money(extraPriceFor(e,state))+(extraPriceFor(e,state)!==extraPrice(e,state.vehicle)?' · complemento':'')+'</span>')+'</span></label>';}).join('')+'</div>';
 if(state.vehicle==='car'){
  const available=availableTreatments(state);
  if(available.length)html+='<section class="booking-treatments" aria-label="Tratamentos adicionais de pintura"><h3>Acrescente um tratamento de pintura</h3><fieldset class="fieldset-clean" style="margin-top:30px"><legend class="field-label legend">Tratamentos para combinar <small>(opcional)</small></legend>'+available.map(s=>{const price=treatmentPrice(s.id,state);return '<label class="extra-choice"><input type="checkbox" name="treatment" value="'+s.id+'" '+(state.treatments.includes(s.id)?'checked':'')+'><span><b>'+s.label+'</b><small>'+shortFor(s)+'</small><span class="option-price">'+money(price)+(price!==s.price?' · complemento':'')+'</span></span></label>';}).join('')+'</fieldset></section>';
  if(hasCoating(state))html+='<p class="booking-inline-notice">A vitrificação substitui a cera. A cura e a entrega serão confirmadas na avaliação.</p>';
 }
 const s=findService(baseFor(state));if(s?.notice)html+='<p class="booking-inline-notice">'+s.notice+'</p>';
 return html;
}
function stepPreference(){
 let html=heading('Qual dia funciona melhor?','Sugira uma data e horário. A agenda será confirmada pessoalmente.');
 html+='<label class="field"><span>Data de preferência</span><input name="date" type="date" min="'+todaySP()+'" value="'+esc(state.date)+'"></label>';
 html+='<label class="field"><span>Horário de preferência</span><select name="time" '+(!validDate(state.date)?'disabled':'')+'><option value="">Prefiro combinar o horário</option>'+timesFor(state.date).map(t=>'<option value="'+t+'" '+(t===state.time?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
 html+='<label class="check-line"><input type="checkbox" name="flexibleDate" '+(state.flexibleDate?'checked':'')+'><span>Tenho flexibilidade ou prefiro combinar a data pela conversa.</span></label><div class="hours-note"><span>Segunda a sábado · 9h às 17h30</span><span>Domingo · 9h às 12h</span><span>Atendemos feriados, mediante combinação.</span></div>';
 return html;
}
function interest(){return state.mode==='plan'?findPlan(state.plan)?.name||'Care mensal':state.mode==='guidance'?'Orientação com Mateus':findService(state.service)?.label||'A combinar';}
function stepContact(){
 let html=heading('Seu pedido, do seu jeito.','Confira os dados, envie o pedido e acompanhe pelo link privado.');
 html+='<dl class="review-list"><div><dt>VEÍCULO<button type="button" class="review-edit" data-review-step="0" aria-label="Editar veículo">Editar</button></dt><dd>'+esc(state.model)+' · '+(state.vehicle==='car'?'Carro':'Moto')+'</dd></div><div><dt>INTERESSE<button type="button" class="review-edit" data-review-step="1" aria-label="Editar cuidado">Editar</button></dt><dd>'+esc(interest())+'</dd></div><div><dt>PREFERÊNCIA<button type="button" class="review-edit" data-review-step="3" aria-label="Editar data e horário">Editar</button></dt><dd>'+(state.date?esc(state.date.split('-').reverse().join('/')):'Data a combinar')+' · '+(state.time?esc(state.time):'Horário a combinar')+'</dd></div><div><dt>CUIDADOS ADICIONAIS<button type="button" class="review-edit" data-review-step="2" aria-label="Editar adicionais">Editar</button></dt><dd>'+esc([...normalizeExtras(state).map(id=>extras.find(x=>x.id===id).label),...normalizeTreatments(state).map(id=>findService(id).label)].join(', ')||'Vamos definir pela conversa')+'</dd></div></dl>';
 html+='<label class="field"><span>Como podemos chamar você? *</span><input name="name" autocomplete="given-name" maxlength="80" value="'+esc(state.name)+'" placeholder="Seu nome" required></label><label class="field"><span>Seu WhatsApp com DDD *</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="'+esc(state.phone)+'" placeholder="(11) 99999-9999" required><small>Usado por Mateus para combinar o atendimento.</small></label><label class="field"><span>Quer contar mais alguma coisa?</span><textarea name="notes" maxlength="600" placeholder="Ex.: manchas no banco, marcas na pintura, uma viagem chegando…">'+esc(state.notes)+'</textarea><small>Até 600 caracteres. Não envie documentos, dados sensíveis ou dados de terceiros. Fotos podem ser combinadas diretamente na conversa.</small></label><label class="check-line"><input type="checkbox" name="ack" '+(state.ack?'checked':'')+' required><span>Entendo que este é um pedido de orçamento, sem reserva ou cobrança automática.</span></label>';
 html+='<label class="check-line"><input type="checkbox" name="rememberLink" '+(state.rememberLink?'checked':'')+'><span>Salvar o link privado neste aparelho por até 90 dias (opcional).</span></label>';
 html+='<p class="request-disclosure">Data, local e execução serão confirmados antes do atendimento.</p>';
 html+='<label class="sr-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>';
 return html;
}
const renderers=[stepVehicle,stepCare,stepDetails,stepPreference,stepContact];
const stepLabels=['Seu veículo','O cuidado','Os detalhes','Sua preferência','Vamos conversar'];
function updateProgress(sent=false){
 const done=sent?5:step,track=$('#wizard-progress').parentElement;
 track.setAttribute('role','progressbar');track.setAttribute('aria-label','Conclusão do pedido');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','5');track.setAttribute('aria-valuenow',String(done));track.setAttribute('aria-valuetext',sent?'Pedido enviado':done+' de 5 etapas concluídas');
 $('#wizard-progress').style.width=(done*20)+'%';
 $('#wizard-status').textContent=sent?'Pedido enviado. Acompanhe a resposta pelo seu link.':['5 etapas curtas. Comece pelo veículo.','Veículo informado. Escolha o cuidado.','Faltam 3 etapas. Os adicionais são opcionais.','Faltam 2 etapas. A data pode ficar a combinar.','Última etapa: revise e envie seu pedido.'][step];
 [...document.querySelectorAll('#step-nav li')].forEach((li,i)=>{li.classList.toggle('active',!sent&&i===step);li.classList.toggle('done',sent||i<step);li.innerHTML='<button type="button" data-go-step="'+i+'" '+(sent||i>=step?'disabled':'')+'><b>'+String(i+1).padStart(2,'0')+'</b><span>'+stepLabels[i]+'</span></button>';if(!sent&&i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
}
$('#step-nav').addEventListener('click',event=>{const button=event.target.closest('[data-go-step]');if(sending||!button||button.disabled)return;const target=Number(button.dataset.goStep);if(target<step){step=target;render(true);}});
function render(focus=false){
 content.innerHTML=renderers[step]()+ (step>=1?quoteBlock():'');$('#step-count').textContent='ETAPA 0'+(step+1)+' / 05';
 updateProgress();persist();
 $('#previous-step').hidden=step===0;$('#next-step').innerHTML=step===4?'Enviar pedido <span>↗</span>':(step===2?'Continuar para data <span>→</span>':step===3?'Revisar pedido <span>→</span>':'Continuar <span>→</span>');
 $('#form-error').textContent='';
 if(focus){content.querySelector('h2').focus({preventScroll:true});if(innerWidth<760)document.querySelector('.booking-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
}
content.addEventListener('click',event=>{
 const edit=event.target.closest('[data-review-step]');if(edit&&!sending){step=Number(edit.dataset.reviewStep);render(true);return;}
 const button=event.target.closest('[data-action]');if(sending||!button)return;
 const action=button.dataset.action,value=button.dataset.value;
 if(action==='vehicle'){
  if(state.vehicle!==value){state.vehicle=value;state.service=value==='moto'?'motoPremium':'essential';state.plan=value==='moto'?'careMoto':'careEssential';state.extras=[];state.treatments=[];state.goals=state.goals.filter(g=>value==='car'||g!=='Interior');}
 }
 if(action==='mode'){state.mode=value;if(value==='plan'&&!plans.some(p=>p.id===state.plan&&p.vehicle===state.vehicle))state.plan=state.vehicle==='car'?'careEssential':'careMoto';}
 if(action==='service')state.service=value;
 if(action==='plan')state.plan=value;
 if(action==='goal')state.goals=state.goals.includes(value)?state.goals.filter(g=>g!==value):[...state.goals,value];
 tidy();render();const next=[...content.querySelectorAll('[data-action]')].find(x=>x.dataset.action===action&&x.dataset.value===value);next?.focus({preventScroll:true});
});
content.addEventListener('input',event=>{
 const e=event.target;if(['model','name','phone','notes'].includes(e.name)){state[e.name]=e.value;if(e.hasAttribute('aria-invalid')){e.removeAttribute('aria-invalid');e.removeAttribute('aria-describedby');$('#form-error').textContent='';}persist();}
});
content.addEventListener('change',event=>{
 const e=event.target;
 if(e.name==='extra'){
  state.extras=state.extras.filter(x=>x!==e.value);if(e.checked){if(e.value==='leather')state.extras=state.extras.filter(x=>x!=='fabric');if(e.value==='fabric')state.extras=state.extras.filter(x=>x!=='leather');state.extras.push(e.value);}tidy();render();content.querySelector('input[name="extra"][value="'+e.value+'"]')?.focus({preventScroll:true});
 }else if(e.name==='treatment'){
  state.treatments=state.treatments.filter(x=>x!==e.value);if(e.checked){if(polishIds.includes(e.value))state.treatments=state.treatments.filter(x=>!polishIds.includes(x));state.treatments.push(e.value);}tidy();render();content.querySelector('input[name="treatment"][value="'+e.value+'"]')?.focus({preventScroll:true});
 }else if(e.name==='date'){
  state.date=e.value;state.time='';persist();render();content.querySelector('[name="date"]')?.focus({preventScroll:true});
 }else if(e.name==='time'){state.time=e.value;persist();}
 else if(e.name==='flexibleDate'){state.flexibleDate=e.checked;persist();}
 else if(e.name==='ack'){state.ack=e.checked;}
 else if(e.name==='rememberLink'){state.rememberLink=e.checked;}
});
function error(message,field){$('#form-error').textContent=message;const input=field?content.querySelector('[name="'+field+'"]'):null;if(input){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','form-error');input.focus();}}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(sending)return;
 if(step===0&&state.model.trim().length<2)return error('Conte a marca e o modelo do veículo para continuar.','model');
 if(step===1&&state.mode==='single'&&!services.some(s=>s.id===state.service&&s.vehicle===state.vehicle))return error('Escolha um cuidado para o seu veículo.');
 if(step===1&&state.mode==='plan'&&!plans.some(p=>p.id===state.plan&&p.vehicle===state.vehicle))return error('Escolha um plano para o seu veículo.');
 if(step===3){const message=validatePreference(state);if(message)return error(message,'date');}
 if(step===4){
  const message=validatePreference(state);if(message){step=3;render(true);return error(message,'date');}
  if(state.name.trim().length<2)return error('Conte seu nome para preparar o resumo.','name');
  if(!/^(?:55)?\d{10,11}$/.test(state.phone.replace(/\D/g,'')))return error('Informe seu WhatsApp com DDD.','phone');
  if(!state.ack)return error('Confirme que o pedido depende de uma conversa com Mateus.','ack');
  tidy();sending=true;form.inert=true;$('#reset-draft').disabled=true;$('#next-step').disabled=true;$('#next-step').textContent='Enviando…';
  try{const payload={...state,privacyVersion:PRIVACY_VERSION,website:content.querySelector('[name="website"]')?.value||''};const token=submissionToken(payload);const {quote}=await api('/api/quotes',{method:'POST',body:{...payload,submissionToken:token}});saveBookmark(quote.id,token,quote.reference,{remember:state.rememberLink});showResult(quote,token);clearPendingSubmission();}
  catch(e){error(e.message);}
  finally{sending=false;form.inert=false;$('#reset-draft').disabled=false;$('#next-step').disabled=false;$('#next-step').innerHTML='Enviar solicitação de orçamento <span>↗</span>';}
  return;
 }
 step++;render(true);
});
$('#previous-step').addEventListener('click',()=>{if(sending)return;step=Math.max(0,step-1);render(true);});
$('#remember-draft').addEventListener('change',e=>{remember=e.target.checked;if(remember)persist();else try{localStorage.removeItem(key);}catch{}window.ff?.toast(remember?'Rascunho guardado somente neste aparelho.':'Rascunho removido do aparelho.');});
$('#reset-draft').addEventListener('click',()=>{
 if(!confirm('Recomeçar e apagar o rascunho deste aparelho?'))return;
 state=defaults();step=0;remember=false;$('#remember-draft').checked=false;try{localStorage.removeItem(key);}catch{}
 $('#summary-result').hidden=true;form.hidden=false;render(true);window.ff?.toast('Rascunho apagado. Vamos começar novamente.');
});
async function copy(text){
 try{if(!navigator.clipboard)throw Error('clipboard unavailable');await navigator.clipboard.writeText(text);window.ff?.toast('Resumo copiado. Você pode colar na conversa.');}
 catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();let ok=false;try{ok=document.execCommand('copy');}catch{}area.remove();window.ff?.toast(ok?'Resumo copiado.':'A cópia automática não está disponível. Use o download.');}
}
function download(text){const blob=new Blob([text],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='fine-form-meu-cuidado.md';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);window.ff?.toast('Download solicitado. Seu pedido permanece no painel de Mateus.');}
function showResult(quote,token){
 updateProgress(true);try{localStorage.removeItem(key);}catch{}remember=false;$('#remember-draft').checked=false;document.querySelector('.save-draft').hidden=true;$('#draft-status').hidden=true;
 const link=trackingUrl(quote.id,token),summary=createSummary(quote.selection)+'\n\n*Pedido '+quote.reference+'*\nAcompanhar: '+link;form.hidden=true;const result=$('#summary-result');result.hidden=false;
 result.innerHTML='<div class="result-mark" aria-hidden="true">↗</div><h2 class="wizard-title" tabindex="-1">Pedido enviado.<br>Próximo passo: conversar.</h2><p class="wizard-lead">Seu pedido foi registrado para avaliação. Acompanhe o retorno pelo link privado; a data será confirmada diretamente.</p>'+'<section class="system-card receipt"><strong>'+esc(quote.reference)+'</strong><a class="tracking-link" href="'+esc(link)+'">'+esc(link)+'</a><div class="system-actions"><a class="button orange" href="'+esc(link)+'">Acompanhar pedido ↗</a><button class="button outline" id="copy-tracking" type="button">Copiar link</button></div><p class="system-muted">Este link é privado. Receber a solicitação não confirma o atendimento. Serviço, data e horário dependem da confirmação de Mateus.</p></section><div id="booking-customer-notice"></div>'+quoteBlock(quote.selection)+'<section class="result-tools" aria-label="Compartilhar seu resumo"><h3>Seu resumo, pronto para compartilhar</h3><pre class="summary-pre"></pre><div class="result-actions"><button class="button outline primary-send" type="button" id="send-whatsapp">'+esc(preferredContact(window.FINE_FORM_CONFIG||{}).label)+' <span>↗</span></button><button class="button outline" type="button" id="send-email">Enviar por e-mail <span>↗</span></button><button class="button outline" type="button" id="copy-summary">Copiar resumo <span>⧉</span></button><button class="button outline" type="button" id="download-summary">Baixar .md <span>↓</span></button><button class="text-link" type="button" id="share-summary">Compartilhar ↗</button><button class="text-link" type="button" id="edit-summary">Preparar outro pedido</button></div></section><p class="result-message">Sua solicitação está no painel. O site não faz cobranças nem reserva horários automaticamente. Você pode abrir o WhatsApp para conversar ou compartilhar o resumo.</p>';
 mountCustomerNotice(document.getElementById('booking-customer-notice'),quote,token).catch(()=>{});
 $('.summary-pre').textContent=summary;
 $('#copy-tracking').addEventListener('click',()=>copyText(link).then(()=>window.ff?.toast('Link copiado.')).catch(e=>window.ff?.toast(e.message)));
 $('#send-whatsapp').addEventListener('click',()=>window.ff?.contact(summary));
 $('#send-email').addEventListener('click',()=>window.ff?.emailContact(summary));
 $('#copy-summary').addEventListener('click',()=>copy(summary));
 $('#download-summary').addEventListener('click',()=>download(summary));
 $('#edit-summary').addEventListener('click',()=>{result.hidden=true;form.hidden=false;document.querySelector('.save-draft').hidden=false;state=defaults();step=0;try{sessionStorage.removeItem('ff-pending-submission');}catch{}render(true);});
 $('#share-summary').addEventListener('click',async()=>{
  if(!navigator.share){download(summary);return;}
  try{await navigator.share({title:'Meu cuidado — Fine Form',text:summary});}
  catch(e){if(e.name!=='AbortError')window.ff?.toast('Não foi possível compartilhar. Você pode copiar ou baixar o resumo.');}
 });
 result.querySelector('h2').focus({preventScroll:true});result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
window.addEventListener('ff:saved-data-cleared',()=>{remember=false;$('#remember-draft').checked=false;});
render();
if(remember){$('#draft-status').hidden=false;$('#draft-status').textContent=resumedStep?'Rascunho retomado na etapa '+(resumedStep+1)+'. Suas escolhas estão aqui.':'Seu rascunho foi retomado. Você pode continuar de onde parou.';}
