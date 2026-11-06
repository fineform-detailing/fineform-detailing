import {escape as e,statusLabel} from './system.mjs';
import {plateInputAttrs} from './plates.mjs';

const steps=[['pending','Recebido'],['accepted','Aceito'],['in_progress','Em cuidado'],['ready','Pronto'],['completed','Retirado']];
const nextStatus={pending:'accepted',accepted:'in_progress',in_progress:'ready',ready:'completed'};
const actions={accepted:['Aceitar','m5 12 4 4L19 6'],in_progress:['Iniciar atendimento','m9 5 10 7-10 7Z'],ready:['Pronto para retirar','m5 12 4 4L19 6'],completed:['Retirado','M4 12h15m-5-5 5 5-5 5'],declined:['Recusar','m6 6 12 12M6 18 18 6'],cancelled:['Cancelar','m6 6 12 12M6 18 18 6']};
const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';

export function attendanceMarkup(q){
 const index=steps.findIndex(([id])=>id===q.status),next=nextStatus[q.status];
 const button=status=>'<button type="button" class="ff-quick-status'+(status===next?' ff-service-primary':' ff-service-secondary')+'" data-quick-quote-status="'+status+'">'+icon(actions[status][1])+'<span>'+actions[status][0]+'</span></button>';
 return '<section class="ff-quote-quick ff-service-card" aria-label="Atendimento"><div class="ff-service-heading"><h3>Atendimento</h3><span>'+e(statusLabel[q.status])+'</span></div>'+
 '<ol class="ff-service-progress" aria-label="Etapas do atendimento">'+steps.map(([id,label],i)=>'<li'+(i===index?' aria-current="step"':'')+' class="'+(i<index?'is-done':'')+'"><span aria-hidden="true">'+(i<index?'✓':String(i+1))+'</span><small>'+label+'</small></li>').join('')+'</ol>'+
 '<form id="quote-edit"><div class="ff-service-schedule"><label class="system-field"><span>Data do atendimento</span><input name="scheduledDate" type="date" value="'+e(q.scheduledDate||q.preferredDate||'')+'"></label><label class="system-field"><span>Horário</span><input name="scheduledTime" type="time" value="'+e(q.scheduledTime||q.preferredTime||'')+'"></label></div><button class="ff-schedule-save" type="submit">Confirmar data e hora</button></form>'+
 (next?'<div class="ff-service-actions">'+button(next)+(q.status==='pending'?button('declined'):'')+button('cancelled')+'</div>':'<p class="ff-service-closed">'+e(q.status==='completed'?'Atendimento concluído.':statusLabel[q.status]+'.')+'</p>')+
 (next&&next!=='accepted'&&!q.plateVerified&&q.kind!=='subscription_visit'?'<button class="ff-service-vehicle" type="button" data-quote-jump="vehicle">Conferir veículo para continuar '+icon('m9 5 7 7-7 7')+'</button>':'')+'</section>';
}

export function carePlateMarkup(){
 return '<section class="ff-care-plate"><h3>Conferência do veículo</h3><form id="care-confirm-plate"><label class="system-field"><span>Placa conferida no veículo</span><input name="checkedPlate" type="text" '+plateInputAttrs+'></label><button class="button dark-button" type="submit" hidden>Confirmar placa e continuar</button></form></section>';
}

export function bindAttendance({detail,q,save,onSaved,onError,revealVehicle,confirm=globalThis.confirm}){
 const form=detail.querySelector('#quote-edit'),care=detail.querySelector('#care-confirm-plate');
 if(!form)return;
 let pendingCareStatus;
 const statusButtons=[...detail.querySelectorAll('[data-quick-quote-status]')];
 const update=async(status,{plateConfirmed=false}={})=>{
  if(detail.dataset.quickSaving)return;
  if(status!==q.status&&q.kind!=='subscription_visit'&&!q.plateVerified&&['in_progress','ready','completed'].includes(status)){
   revealVehicle();return;
  }
  if(status!==q.status&&q.kind==='subscription_visit'&&['in_progress','ready','completed'].includes(status)&&!plateConfirmed){
   pendingCareStatus=status;care.querySelector('[type="submit"]').hidden=false;revealVehicle();care.elements.checkedPlate.focus();return;
  }
  if(!form.reportValidity())return;
  if(status!==q.status&&['completed','declined','cancelled'].includes(status)&&!confirm(status==='completed'?'O veículo já foi entregue ao cliente?':'Confirmar '+statusLabel[status].toLowerCase()+' deste pedido?'))return;
  const body={version:q.version,status,scheduledDate:form.elements.scheduledDate.value,scheduledTime:form.elements.scheduledTime.value};
  if(plateConfirmed)body.checkedPlate=care.elements.checkedPlate.value;
  const buttons=[...statusButtons,form.querySelector('[type="submit"]'),...(care?[care.querySelector('[type="submit"]')]:[])];
  detail.dataset.quickSaving='1';form.inert=true;
  buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true');});
  const error=detail.querySelector('#dialog-error');if(error)error.hidden=true;
  try{await save(body);await onSaved();}
  catch(error){onError(error);}
  finally{delete detail.dataset.quickSaving;form.inert=false;buttons.forEach(button=>{button.disabled=false;button.removeAttribute('aria-busy');});}
 };
 form.addEventListener('submit',event=>{event.preventDefault();update(q.status);});
 for(const button of statusButtons)button.addEventListener('click',()=>update(button.dataset.quickQuoteStatus));
 care?.addEventListener('submit',event=>{event.preventDefault();if(pendingCareStatus&&care.reportValidity())update(pendingCareStatus,{plateConfirmed:true});});
}
