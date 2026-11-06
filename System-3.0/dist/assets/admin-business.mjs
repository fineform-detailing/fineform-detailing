import {api,escape as e,copyText} from './system.mjs';
import {locationDetails,locationMessage} from './business-profile.mjs';
import {whatsappMessage} from './contacts.mjs';

const field=(name,label,value='',max=160)=>'<label class="system-field"><span>'+label+'</span><input name="'+name+'" value="'+e(value)+'" maxlength="'+max+'" autocomplete="off"></label>';
const area=(name,label,value='',max=500)=>'<label class="system-field"><span>'+label+'</span><textarea name="'+name+'" maxlength="'+max+'">'+e(value)+'</textarea></label>';
const check=(name,label,value)=>'<label class="system-check"><input name="'+name+'" type="checkbox"'+(value?' checked':'')+'><span>'+label+'</span></label>';

export async function mountBusinessSettings(host,{toast}){
 const {profile:p}=await api('/api/admin/business');
 host.innerHTML='<h2>Dados do estúdio</h2><form id="business-profile-form">'+
  '<h3>Atendimento</h3>'+area('visitAddress','Endereço completo para receber o veículo',p.visitAddress)+field('mapsUrl','Link do mapa (opcional)',p.mapsUrl,1200)+area('arrivalNote','Orientações de chegada (opcional)',p.arrivalNote)+
  '<hr class="system-divider"><h3>Dados legais</h3>'+field('legalName','Nome empresarial conforme o documento',p.legalName)+field('cnpj','CNPJ conforme o documento (aceita letras)',p.cnpj,24)+area('registeredAddress','Endereço cadastral (somente no painel)',p.registeredAddress)+check('publishIdentity','Publicar nome empresarial e CNPJ na página de informações',p.publishIdentity)+
  '<details class="admin-form-notes"><summary>Privacidade e publicação</summary><p>Informe apenas dados reais. A identificação e o endereço do fornecedor devem atender às normas de comércio eletrônico. O local de atendimento só aparece ao cliente quando você o libera no pedido.</p></details>'+ 
  '<p id="business-error" class="system-error" role="alert" hidden></p><button class="button orange" type="submit">Salvar dados</button></form>';
 const form=host.querySelector('form');
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.dataset.busy)return;form.dataset.busy='true';
  const button=form.querySelector('[type="submit"]'),error=host.querySelector('#business-error');button.disabled=true;error.hidden=true;
  const body=Object.fromEntries(new FormData(form));body.version=p.version;
  body.publishIdentity=form.elements.publishIdentity.checked;body.publishVisitAddress=false;
  try{await api('/api/admin/business',{method:'PUT',body});toast('Dados salvos. Você pode liberar o local nos pedidos.');await mountBusinessSettings(host,{toast});}
  catch(err){error.textContent=err.message;error.hidden=false;}
  finally{delete form.dataset.busy;button.disabled=false;}
 });
}

export async function mountQuoteLocation(detail,q,{toast,onSaved}){
 const panel=document.createElement('section');panel.className='system-card';panel.id='quote-location';
 panel.innerHTML='<h3>Endereço para este cliente.</h3><p class="system-muted">Consultando o local cadastrado…</p>';
 const customerPanel=detail.querySelector('[data-quote-panel="customer"]');
 if(customerPanel)customerPanel.append(panel);else detail.querySelector('#quote-edit').before(panel);
 try{
  const {profile:p}=await api('/api/admin/business');if(!panel.isConnected)return;
  const canShare=p.visitAddress&&!['declined','cancelled'].includes(q.status);
  panel.innerHTML='<h3>Endereço para este cliente.</h3>'+ 
   (q.location?'<p><strong>Endereço liberado no link privado deste pedido.</strong></p>'+locationDetails(q.location):'<p class="system-muted">Nenhum endereço foi liberado neste pedido.</p>')+
   '<details><summary>Conferir local cadastrado no painel</summary>'+(p.visitAddress?locationDetails({address:p.visitAddress,mapsUrl:p.mapsUrl,arrivalNote:p.arrivalNote}):'<p>Cadastre o endereço na aba Dados do painel.</p>')+'</details>'+
   '<p class="system-muted">Liberar o local não confirma serviço, data ou horário. Confira o contato de '+e(q.name)+' antes de enviar uma mensagem.</p><div class="system-actions">'+
   (canShare?'<button class="button orange" type="button" data-location-action="share">'+(q.location?'Atualizar com o local cadastrado':'Liberar endereço neste pedido')+'</button>':'')+
   (q.location?'<button class="button outline" type="button" data-location-copy>Copiar mensagem com endereço</button><a class="button outline" data-location-whatsapp href="'+e(whatsappMessage({whatsapp:q.phone},locationMessage(q)))+'" target="_blank" rel="noopener noreferrer">Preparar WhatsApp ↗</a><button class="button outline system-danger" type="button" data-location-action="revoke">Retirar endereço deste pedido</button>':'')+
   '</div><p class="system-muted">O WhatsApp abre com a mensagem pronta; revise e toque em enviar. Retirar o endereço impede novas consultas neste link, mas não apaga mensagens, cópias ou capturas já recebidas.</p><p class="system-error" role="alert" hidden></p>';
  panel.querySelectorAll('[data-location-action]').forEach(button=>button.addEventListener('click',async()=>{
   if(panel.dataset.busy)return;panel.dataset.busy='true';button.disabled=true;
   const error=panel.querySelector('[role="alert"]');error.hidden=true;
   try{
    await api('/api/admin/quotes/'+q.id+'/location',{method:'PUT',body:{action:button.dataset.locationAction,version:q.version,profileVersion:p.version}});
    toast(button.dataset.locationAction==='share'?'Endereço liberado no acompanhamento deste pedido.':'Endereço retirado deste acompanhamento.');await onSaved();
   }catch(err){error.textContent=err.message;error.hidden=false;}
   finally{delete panel.dataset.busy;button.disabled=false;}
  }));
  panel.querySelector('[data-location-copy]')?.addEventListener('click',async()=>{
   try{await copyText(locationMessage(q));toast('Mensagem copiada. Confira o contato antes de enviar.');}
   catch(err){const error=panel.querySelector('[role="alert"]');error.textContent=err.message;error.hidden=false;}
  });
 }catch(err){if(panel.isConnected)panel.innerHTML='<h3>Endereço para este cliente.</h3><p class="system-error" role="alert">'+e(err.message)+'</p>';}
}
