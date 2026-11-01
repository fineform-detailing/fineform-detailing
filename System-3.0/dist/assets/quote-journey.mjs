/* Fine Form: envio real, pasta digital coreografada e comprovante privado. */
import {money} from './catalog.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const dateTime=value=>{
 if(!value)return '';
 const d=new Date(value);
 return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(d);
};
const safeItems=quote=>Array.isArray(quote.budget?.items)?quote.budget.items.filter(item=>item&&typeof item.label==='string'):[];
const details=quote=>{
 const state=quote.selection||{},services=safeItems(quote);
 const data=[
  ['Veículo',[quote.model,quote.vehicle==='moto'?'Moto':quote.vehicle==='car'?'Carro':''].filter(Boolean).join(' · ')],
  ['Cuidados escolhidos',services.map(item=>item.label).join(' · ')||(state.mode==='guidance'?'Orientação técnica solicitada':'')],
  ['Interesses',Array.isArray(state.goals)?state.goals.join(' · '):''],
  ['Data desejada',state.date?state.date.split('-').reverse().join('/'):'A combinar'],
  ['Horário desejado',state.time||'A combinar'],
  ['Observações',state.notes||'']
 ];
 return data.filter(([,value])=>Boolean(value));
};
export function buildDigitalReceipt(quote,link){
 const ref=quote.reference?'<div class="ff-receipt-field"><dt>Protocolo</dt><dd>'+esc(quote.reference)+'</dd></div>':'';
 const stamp=dateTime(quote.createdAt);
 const date=stamp?'<div class="ff-receipt-field"><dt>Recebida em</dt><dd>'+esc(stamp)+'</dd></div>':'';
 const rows=details(quote).map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>').join('');
 const total=quote.budget?.hasBase&&Number.isFinite(Number(quote.budget.total))?'<div class="ff-receipt-amount"><span>Orçamento apresentado</span><strong>'+esc(money(Number(quote.budget.total)))+'</strong></div>':'';
 return '<article class="ff-digital-receipt receipt" id="ff-digital-receipt" aria-label="Comprovante digital de solicitação">'+
  '<div class="ff-receipt-brand"><img src="../assets/logo-transparent.svg" width="42" height="42" alt="Símbolo Fine Form"><span>FINE FORM<small>ESTÉTICA AUTOMOTIVA</small></span></div>'+
  '<div class="ff-receipt-hero"><span class="ff-receipt-check" aria-hidden="true">✓</span><h2 class="ff-receipt-title wizard-title" tabindex="-1">Solicitação recebida.</h2><p>Sua solicitação foi recebida. Vamos analisar os dados do veículo antes de confirmar o atendimento.</p></div>'+
  '<div class="ff-receipt-perforation" aria-hidden="true"></div>'+
  '<dl class="ff-receipt-meta">'+ref+date+'<div class="ff-receipt-field"><dt>Status</dt><dd><span class="ff-receipt-status-dot"></span> Solicitação recebida</dd></div></dl>'+
  '<div class="ff-receipt-content"><h3>Resumo da solicitação</h3><dl>'+rows+'</dl>'+total+'</div>'+
  '<div class="ff-receipt-bottom"><p>Guarde seu acesso privado. O envio não reserva horário nem confirma a execução.</p>'+
  '<a class="tracking-link" href="'+esc(link)+'">Acompanhar pedido <span aria-hidden="true">↗</span></a></div>'+
 '</article>';
}
export function downloadDigitalReceipt(quote,link){
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprovante Fine Form</title><style>'+
 'body{font-family:Arial,sans-serif;background:#eee;padding:24px;color:#151515}main{max-width:600px;margin:auto;background:#fff;border-radius:20px;padding:28px;box-shadow:0 6px 28px #0001}h1{font-size:27px}dl>div{padding:13px 0;border-bottom:1px solid #eee}dt{font-size:12px;color:#555}dd{margin:4px 0 0;overflow-wrap:anywhere}a{color:#111}small{display:block}header{font-weight:750;font-size:23px}p{line-height:1.5}footer{font-size:12px;color:#555}@media print{body{padding:0;background:white}main{padding:16px;box-shadow:none}}</style></head><body><main>'+
 '<header>FINE FORM <small>ESTÉTICA AUTOMOTIVA</small></header><h1>Solicitação recebida.</h1>'+
 '<p>Este documento registra a solicitação, sem reservar horário ou confirmar serviços.</p>'+
 '<dl>'+[['Protocolo',quote.reference],['Recebida em',dateTime(quote.createdAt)],['Status','Solicitação recebida'],...details(quote),['Orçamento apresentado',quote.budget?.hasBase?money(quote.budget.total):'']].filter(([,v])=>Boolean(v)).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'+
 '<footer><p>O link abaixo permite acompanhar este pedido e deve ser mantido privado.</p><a href="'+esc(link)+'">'+esc(link)+'</a></footer></main></body></html>';
 const blob=new Blob([html],{type:'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Fine-Form-comprovante-'+String(quote.reference||'solicitacao').replace(/[^A-Za-z0-9-]/g,'')+'.html';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function startQuoteJourney(){
 document.getElementById('ff-quote-journey')?.remove();
 const stage=document.createElement('div');
 stage.id='ff-quote-journey';stage.className='ff-journey';stage.setAttribute('role','status');stage.setAttribute('aria-live','polite');
 stage.setAttribute('aria-label','Enviando solicitação de orçamento');
 stage.innerHTML='<div class="ff-journey-surface"><div class="ff-journey-visual" aria-hidden="true">'+
  '<div class="ff-folder"><div class="ff-folder-back"></div><div class="ff-folder-papers">'+
  ['Seu veículo','O cuidado','Detalhes','Preferências','Contato'].map((name,i)=>
   '<div class="ff-folder-paper" style="--i:'+i+'"><span class="ff-paper-head">'+esc(name)+'</span><i></i><i></i><i></i></div>'
  ).join('')+'</div>'+
  '<div class="ff-folder-front"><div class="ff-folder-label"><img src="../assets/logo-transparent.svg" width="36" height="36" alt=""><strong>FINE FORM</strong><small>SEU ORÇAMENTO</small></div></div>'+
  '<div class="ff-folder-accent"></div></div>'+
  '<div class="ff-journey-confirm"><span>✓</span></div>'+
  '<div class="ff-journey-ticket"><div class="ff-ticket-mark">FINE FORM</div><div class="ff-ticket-title"></div><div class="ff-ticket-reference"></div><div class="ff-ticket-rule"></div><div class="ff-ticket-line"></div><div class="ff-ticket-line short"></div></div>'+
  '</div><div class="ff-journey-message">Organizando sua solicitação...</div>'+
  '<div class="ff-journey-indicator" aria-hidden="true"><span></span></div>'+
  '<div class="ff-journey-error" hidden><p role="alert"></p><div class="ff-journey-error-actions"><button type="button" data-journey-retry>Tentar novamente</button><button type="button" data-journey-back>Revisar pedido</button></div></div></div>';
 document.body.append(stage);
 const begunAt=Date.now(),presentationMs=5100;
 const timeoutIds=[],after=(fn,ms)=>{const t=setTimeout(fn,ms);timeoutIds.push(t);};
 let confirmed=false;
 const message=stage.querySelector('.ff-journey-message');
 let closed=false;
 const clear=()=>{timeoutIds.forEach(clearTimeout);timeoutIds.length=0;};
 const remove=()=>{if(closed)return;closed=true;clear();stage.remove();};
 if(!reduced()){
  after(()=>{if(!closed)message.textContent=confirmed?'Preparando seu comprovante...':'Organizando os documentos...';},1800);
  after(()=>{if(!closed){stage.classList.add('is-packed');message.textContent=confirmed?'Preparando seu comprovante...':'Finalizando o envio...';}},4650);
 }else{stage.classList.add('is-packed');message.textContent='Enviando sua solicitação...';}
 return {
  complete(quote,receipt){
   if(closed)return;
   confirmed=true;
   message.textContent='Preparando seu comprovante...';
   const present=()=>{
    if(closed)return;
    clear();
    stage.classList.add('is-complete','is-packed');
    stage.setAttribute('aria-label','Solicitação recebida');
    message.textContent='Solicitação recebida.';
    stage.querySelector('.ff-ticket-reference').textContent=quote.reference||'';
    stage.querySelector('.ff-ticket-title').textContent='Solicitação recebida.';
    const done=()=>{remove();receipt?.querySelector?.('h2')?.focus?.({preventScroll:true});};
    if(reduced()){done();return;}
    after(()=>{receipt?.scrollIntoView?.({behavior:'auto',block:'start'});stage.classList.add('is-handoff');},820);
    after(done,1120);
   };
   if(reduced()){present();return;}
   // A duração é apenas apresentação visual. O POST já foi concluído; nunca
   // exibimos confirmação antes da resposta real nem alteramos o tempo da API.
   after(present,Math.max(0,presentationMs-(Date.now()-begunAt)));
  },
  fail(messageText,retry){
   if(closed)return;
   clear();stage.classList.add('is-error');stage.setAttribute('aria-label','Não foi possível enviar');
   message.textContent='Envio não concluído.';
   const error=stage.querySelector('.ff-journey-error');
   error.hidden=false;error.querySelector('p').textContent=messageText||'Confira a conexão e tente novamente.';
   error.querySelector('[data-journey-retry]').onclick=()=>{remove();retry();};
   error.querySelector('[data-journey-back]').onclick=()=>{remove();document.getElementById('form-error')?.focus?.();};
   error.querySelector('[data-journey-retry]').focus({preventScroll:true});
  },
  remove
 };
}
