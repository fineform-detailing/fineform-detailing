import {mountVehicleMap,areaForCare} from './vehicle-map.mjs';
import {careImageMarkup,visualFor} from './care-visuals.mjs';
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
let state=defaults(),step=0,remember=false,sending=false,mapFocus=null;
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
function choice({value,title,description,selected,action='service',extra=''}){return '<button type="button" class="choice-card '+(action==='plan'?'care-plan-choice ':'')+(selected?'selected':'')+'" data-action="'+action+'" data-value="'+value+'" aria-pressed="'+selected+'"><h3>'+title+'</h3><p>'+description+'</p>'+extra+'</button>';}
function quoteBlock(selection=state){
 const quote=quoteFor(selection);
 if(!quote.items.length)return '<aside class="quote-box"><div class="quote-head"><h3>Seu orçamento</h3><span class="quote-label">ESTIMATIVA</span></div><p>Mateus ajuda você a escolher os cuidados e confirmar o valor.</p></aside>';
 const details=quote.items.map(item=>'<div><dt>'+esc(item.label)+(item.kind==='monthly'?' · mensalidade':item.kind==='complement'?' · complemento':'')+'</dt><dd>'+money(item.price)+'</dd></div>').join('');
 const credit=quote.discount?'<div class="quote-credit"><dt>Etapas em comum</dt><dd>−'+money(quote.discount)+'</dd></div>':'';
 const label=quote.recurring?(quote.additional?'Total deste pedido':'Total mensal'):quote.hasBase?'Total do atendimento':'Subtotal dos cuidados escolhidos';
 const planNote=quote.recurring&&quote.additional?'<p>Mensalidade: '+money(quote.recurring)+'/mês. Adicionais nesta visita: '+money(quote.additional)+'. Nas próximas mensalidades, o plano continua '+money(quote.recurring)+'.</p>':'';
 const guidance=!quote.hasBase?'<p>O orçamento completo será definido após escolher o cuidado principal com Mateus.</p>':'';
 return '<aside class="quote-box" aria-label="Seu orçamento"><div class="quote-head"><h3>Seu orçamento</h3><span class="quote-label">ESTIMATIVA</span></div><dl>'+details+credit+'</dl><div class="quote-total"><span>'+label+'</span><strong>'+money(quote.total)+'</strong></div>'+planNote+guidance+'<p class="quote-note">Valores para os cuidados descritos. Atendimento confirmado na conversa.</p></aside>';
}
function stepVehicle(){return heading('Vamos começar<br>pelo seu veículo.','Carro ou moto: o cuidado começa conhecendo quem acompanha você.')+'<div class="vehicle-options" role="group" aria-label="Tipo de veículo">'+['car','moto'].map(type=>'<button class="choice-card '+(state.vehicle===type?'selected':'')+'" type="button" data-action="vehicle" data-value="'+type+'" aria-pressed="'+(state.vehicle===type)+'"><span class="choice-icon">'+icon(type)+'</span><h3>'+(type==='car'?'Meu carro':'Minha moto')+'</h3></button>').join('')+'</div><label class="field"><span>Qual é a marca e o modelo? *</span><input name="model" autocomplete="off" maxlength="80" placeholder="'+(state.vehicle==='car'?'Ex.: Honda Civic 2020':'Ex.: Honda CB 500 2022')+'" value="'+esc(state.model)+'" required><small>O ano é opcional. A placa será cadastrada por Mateus quando o veículo chegar.</small></label>';
}
function stepCare(){
 let html=heading('Qual cuidado<br>você procura?','Escolha por onde começar. Se estiver em dúvida, Mateus ajuda na conversa.');
 html+='<div class="mode-tabs" role="group" aria-label="Modalidade de atendimento">'+[['single','Um atendimento'],['plan','Care mensal'],['guidance','Quero orientação']].map(([v,l])=>'<button type="button" class="'+(state.mode===v?'active':'')+'" data-action="mode" data-value="'+v+'" aria-pressed="'+(state.mode===v)+'">'+l+'</button>').join('')+'</div>';

 if(state.mode==='single'){
  const serviceChoice=s=>'<button type="button" class="choice-card care-visual-choice '+(state.service===s.id?'selected':'')+'" data-action="service" data-value="'+s.id+'" aria-pressed="'+(state.service===s.id)+'" aria-description="'+esc(s.description)+'"><span class="care-choice-image">'+careImageMarkup(s.id)+'<span class="care-choice-check" aria-hidden="true">✓</span></span><span class="care-choice-body"><h3>'+s.label+'</h3><p>'+visualFor(s.id).short+'</p><small>'+money(s.price)+'</small></span></button>';
  const list=services.filter(s=>s.vehicle===state.vehicle);
  const groups=[{id:'wash',label:'Lavagem e manutenção',items:list.filter(s=>s.class!=='Classe C')},{id:'interior',label:'Interior',items:list.filter(s=>s.id==='fullClean')},{id:'paint',label:'Pintura e proteção',items:list.filter(s=>s.class==='Classe C'&&s.id!=='fullClean')}];
  html+=groups.filter(g=>g.items.length).map(g=>'<section class="care-choice-group" aria-labelledby="care-group-'+g.id+'"><h3 id="care-group-'+g.id+'">'+g.label+'</h3><div class="choice-stack care-choice-grid" role="group" aria-label="'+g.label+'">'+g.items.map(serviceChoice).join('')+'</div></section>').join('');
 }
 if(state.mode==='plan')html+='<div class="choice-stack" role="group" aria-label="Plano mensal">'+plans.filter(p=>p.vehicle===state.vehicle).map(p=>choice({value:p.id,title:p.name,description:p.description,selected:state.plan===p.id,action:'plan',extra:'<small>'+money(p.price)+'/mês'+'</small>'})).join('')+'</div><div class="note-box">Interesse em uma assinatura para um veículo. A placa será conferida e cadastrada pessoalmente antes da ativação do Care.</div>';
 if(state.mode==='guidance')html+='<div class="note-box">Tudo bem não conhecer o nome do serviço. Selecione suas prioridades e conte, no final, o que você gostaria de melhorar.</div>';
 html+='<fieldset class="fieldset-clean" style="margin-top:26px"><legend class="field-label legend">O que é importante para você? <small>(opcional)</small></legend><div class="goals">'+goals.filter(g=>state.vehicle==='car'||g!=='Interior').map(g=>'<button class="goal-button '+(state.goals.includes(g)?'selected':'')+'" type="button" data-action="goal" data-value="'+g+'" aria-pressed="'+state.goals.includes(g)+'">'+g+'</button>').join('')+'</div></fieldset>';
 return html;
}
function stepDetails(){
 const included=includedFor(state);
 let html=heading('Vamos aos<br>detalhes.','Marque os cuidados de interesse. A avaliação orienta o que é adequado para o seu veículo.');
 if(state.mode==='plan')html+='<div class="note-box">Os adicionais abaixo consideram a visita Premium do plano. Nos serviços completos, o orçamento considera as etapas já incluídas.</div>';
 html+='<div>'+compatibleExtras(state.vehicle).map(e=>{const replaced=e.id==='exteriorPlastic'&&state.extras.includes('plasticCoating');const inc=included.includes(e.id);return '<label class="extra-choice '+(inc?'included':'')+'"><input type="checkbox" name="extra" value="'+e.id+'" '+(!replaced&&(inc||state.extras.includes(e.id))?'checked ':'')+(inc||replaced?'disabled ':'')+'><span><b>'+e.label+'</b><small>'+e.description+'</small>'+(replaced?'<span class="included-badge">SUBSTITUÍDO PELA VITRIFICAÇÃO</span>':inc?'<span class="included-badge">JÁ INCLUÍDO · QUANDO COMPATÍVEL</span>':'<span class="option-price">'+money(extraPriceFor(e,state))+(extraPriceFor(e,state)!==extraPrice(e,state.vehicle)?' · complemento no Extra':'')+'</span>')+'</span></label>';}).join('')+'</div>';
 if(state.vehicle==='car'){
  const available=availableTreatments(state);
  if(available.length)html+='<section class="optional-care-section" aria-label="Tratamentos para combinar"><fieldset class="fieldset-clean" style="margin-top:30px"><legend class="field-label legend">Tratamentos para combinar <small>(opcional)</small></legend>'+available.map(s=>{const price=treatmentPrice(s.id,state);return '<label class="extra-choice"><input type="checkbox" name="treatment" value="'+s.id+'" '+(state.treatments.includes(s.id)?'checked':'')+'><span><b>'+s.label+'</b><small>'+s.description+'</small><span class="option-price">'+money(price)+(price!==s.price?' · acréscimo, com preparação já contemplada':' · atendimento avulso')+'</span></span></label>';}).join('')+'</fieldset><p class="privacy-note">Os níveis de polimento são alternativas. A vitrificação já inclui realce; no Extra, a higienização e o polimento Premium já estão contemplados. O total abaixo já desconta a lavagem de preparação repetida.</p></section>';
  if(hasCoating(state))html+='<div class="note-box">A finalização será com revestimento cerâmico, em substituição à cera. Produto, cura e entrega serão combinados com Mateus.</div>';
 }
 const s=findService(baseFor(state));if(s?.notice)html+='<div class="note-box">'+s.notice+'</div>';
 return html;
}
function stepPreference(){
 let html=heading('Quando seria<br>bom para você?','Indique sua preferência. A disponibilidade e a duração serão combinadas pessoalmente.');
 html+='<div class="note-box">Esta escolha não bloqueia uma vaga. Seu atendimento fica confirmado somente após a conversa com Mateus.</div><label class="field"><span>Data de preferência</span><input name="date" type="date" min="'+todaySP()+'" value="'+esc(state.date)+'"></label>';
 html+='<label class="field"><span>Horário de preferência</span><select name="time" '+(!validDate(state.date)?'disabled':'')+'><option value="">Prefiro combinar o horário</option>'+timesFor(state.date).map(t=>'<option value="'+t+'" '+(t===state.time?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
 html+='<label class="check-line"><input type="checkbox" name="flexibleDate" '+(state.flexibleDate?'checked':'')+'><span>Tenho flexibilidade ou prefiro combinar a data pela conversa.</span></label><div class="hours-note"><span>Segunda a sábado · 9h às 17h30</span><span>Domingo · 9h às 12h</span><span>Atendemos feriados, mediante combinação.</span></div>';
 return html;
}
function interest(){return state.mode==='plan'?findPlan(state.plan)?.name||'Care mensal':state.mode==='guidance'?'Orientação com Mateus':findService(state.service)?.label||'A combinar';}
function stepContact(){
 let html=heading('Agora, vamos<br>conversar.','Revise suas escolhas e envie uma solicitação de orçamento. Você recebe um link para acompanhar a análise de Mateus.');
 html+='<dl class="review-list"><div><dt>VEÍCULO<button type="button" class="review-edit" data-review-step="0" aria-label="Editar veículo">Editar</button></dt><dd>'+esc(state.model)+' · '+(state.vehicle==='car'?'Carro':'Moto')+'</dd></div><div><dt>INTERESSE<button type="button" class="review-edit" data-review-step="1" aria-label="Editar cuidado">Editar</button></dt><dd>'+esc(interest())+'</dd></div><div><dt>PREFERÊNCIA<button type="button" class="review-edit" data-review-step="3" aria-label="Editar data e horário">Editar</button></dt><dd>'+(state.date?esc(state.date.split('-').reverse().join('/')):'Data a combinar')+' · '+(state.time?esc(state.time):'Horário a combinar')+'</dd></div><div><dt>CUIDADOS ADICIONAIS<button type="button" class="review-edit" data-review-step="2" aria-label="Editar adicionais">Editar</button></dt><dd>'+esc([...normalizeExtras(state).map(id=>extras.find(x=>x.id===id).label),...normalizeTreatments(state).map(id=>findService(id).label)].join(', ')||'Vamos definir pela conversa')+'</dd></div></dl>';
 html+='<label class="field"><span>Como podemos chamar você? *</span><input name="name" autocomplete="given-name" maxlength="80" value="'+esc(state.name)+'" placeholder="Seu nome" required></label><label class="field"><span>Seu WhatsApp com DDD *</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="'+esc(state.phone)+'" placeholder="(11) 99999-9999" required><small>Usado por Mateus para combinar o atendimento.</small></label><label class="field"><span>Quer contar mais alguma coisa?</span><textarea name="notes" maxlength="600" placeholder="Ex.: manchas no banco, marcas na pintura, uma viagem chegando…">'+esc(state.notes)+'</textarea><small>Até 600 caracteres. Não envie documentos, dados sensíveis ou dados de terceiros. Fotos podem ser combinadas diretamente na conversa.</small></label><label class="check-line"><input type="checkbox" name="ack" '+(state.ack?'checked':'')+' required><span>Entendo que envio uma solicitação de orçamento, sujeita à aceitação de Mateus, sem reserva ou cobrança automática. Li as informações de privacidade e atendimento abaixo.</span></label>';
 html+='<p class="privacy-inline">Nome, telefone, veículo e escolhas serão usados pela Fine Form para responder ao pedido e organizar o atendimento. Isso não autoriza publicidade. <a href="../privacidade/">Privacidade</a> · <a href="../termos/">Termos</a> · <a href="../cancelamento-e-reembolso/">Cancelamento e reembolso</a>.</p><label class="check-line"><input type="checkbox" name="rememberLink" '+(state.rememberLink?'checked':'')+'><span>Guardar o link privado deste pedido neste aparelho por até 90 dias (opcional). Evite em aparelhos compartilhados.</span></label>';
 html+='<p class="request-disclosure">'+REQUEST_NOTICE+' O local será combinado antes da confirmação do atendimento.</p>';
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
 const keepY=window.scrollY,keepX=window.scrollX;
 const showMap=state.vehicle==='car'&&[1,2].includes(step)&&window.matchMedia('(min-width:1001px)').matches,aside=$('#visual-care-aside');
 if(aside){aside.hidden=!showMap;if(showMap)mountVehicleMap(aside,state,{focus:mapFocus,root:'../'});else aside.innerHTML='';}
 document.querySelector('.booking-aside')?.classList.toggle('visual-care-on',showMap);
 content.innerHTML=renderers[step]()+ (step>=1?quoteBlock():'');
 $('#step-count').textContent='ETAPA 0'+(step+1)+' / 05';
 updateProgress();persist();
 $('#previous-step').hidden=step===0;$('#next-step').innerHTML=step===4?'Enviar solicitação de orçamento <span>↗</span>':(step===2?'Continuar para data <span>→</span>':step===3?'Revisar pedido <span>→</span>':'Continuar <span>→</span>');
 $('#form-error').textContent='';
 if(focus){content.querySelector('h2').focus({preventScroll:true});document.querySelector('.booking-panel').scrollIntoView({behavior:'instant',block:'start'});}else{window.scrollTo({top:keepY,left:keepX,behavior:'instant'});}
}
content.addEventListener('click',event=>{
 const edit=event.target.closest('[data-review-step]');if(edit&&!sending){step=Number(edit.dataset.reviewStep);render(true);return;}
 const button=event.target.closest('[data-action]');if(sending||!button)return;
 const action=button.dataset.action,value=button.dataset.value;
 if(action==='service')mapFocus=areaForCare(value);else if(['vehicle','mode','plan'].includes(action))mapFocus=null;
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
  mapFocus=e.checked?areaForCare(e.value):null;
  state.extras=state.extras.filter(x=>x!==e.value);if(e.checked){if(e.value==='leather')state.extras=state.extras.filter(x=>x!=='fabric');if(e.value==='fabric')state.extras=state.extras.filter(x=>x!=='leather');state.extras.push(e.value);}tidy();render();content.querySelector('input[name="extra"][value="'+e.value+'"]')?.focus({preventScroll:true});
 }else if(e.name==='treatment'){
  mapFocus=e.checked?areaForCare(e.value):null;
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
 result.innerHTML='<div class="result-mark" aria-hidden="true">↗</div><h2 class="wizard-title" tabindex="-1">Sua solicitação<br>foi recebida.</h2><p class="wizard-lead">Seu orçamento foi registrado no painel de Mateus. A solicitação aguarda análise e aceitação manual. Guarde o link para acompanhar a resposta.</p>'+'<section class="system-card receipt"><strong>'+esc(quote.reference)+'</strong><a class="tracking-link" href="'+esc(link)+'">'+esc(link)+'</a><div class="system-actions"><a class="button orange" href="'+esc(link)+'">Acompanhar pedido ↗</a><button class="button outline" id="copy-tracking" type="button">Copiar link</button></div><p class="system-muted">Este link é privado. Receber a solicitação não confirma o atendimento. Serviço, data e horário dependem da confirmação de Mateus.</p></section><div id="booking-customer-notice"></div>'+quoteBlock(quote.selection)+'<details class="result-tools"><summary>Resumo e outras opções</summary><pre class="summary-pre"></pre><div class="result-actions"><button class="button outline primary-send" type="button" id="send-whatsapp">'+esc(preferredContact(window.FINE_FORM_CONFIG||{}).label)+' <span>↗</span></button><button class="button outline" type="button" id="send-email">Enviar por e-mail <span>↗</span></button><button class="button outline" type="button" id="copy-summary">Copiar resumo <span>⧉</span></button><button class="button outline" type="button" id="download-summary">Baixar .md <span>↓</span></button><button class="text-link" type="button" id="share-summary">Compartilhar ↗</button><button class="text-link" type="button" id="edit-summary">Preparar outro pedido</button></div></details><p class="result-message">Sua solicitação está no painel. O site não faz cobranças nem reserva horários automaticamente. Você pode abrir o WhatsApp para conversar ou compartilhar o resumo.</p>';
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
