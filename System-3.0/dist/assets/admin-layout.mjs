import {mountActionDock} from './dock-ui.mjs';
const docks=new WeakMap();
export function disposeQuoteView(detail){docks.get(detail)?.destroy();docks.delete(detail);}
// Presentation only: keep the existing forms, permissions and event handlers.
let previousReference='',previousSection='summary';
const sections=[
 ['summary','Resumo','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
 ['service','Atendimento','m5 12 4 4L19 6'],
 ['customer','Cliente','M20 21v-2a7 7 0 0 0-14 0v2 M13 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8'],
 ['history','Histórico','M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2']
];
const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'+path+'"/></svg>';
export function revealQuoteSection(element){
 const panel=element?.closest('[data-quote-panel]');
 if(!panel)return;
 const frame=panel.closest('.ff-quote-view');
 frame?.querySelector('[data-order-section="'+panel.dataset.quotePanel+'"]')?.click();
}
export function organizeQuoteView(detail){
 const document=detail.ownerDocument;
 const frame=detail.querySelector('.ff-quote-view');
 if(frame?.querySelector('.ff-order-body'))return;
 disposeQuoteView(detail);
 if(!frame)return;
 const head=frame.querySelector('.ff-quote-head');
 if(!head)return;
 const reference=head.querySelector('h2')?.textContent||'';
 if(reference!==previousReference){previousReference=reference;previousSection='summary';}
 const body=document.createElement('div');body.className='ff-order-body';
 const footer=document.createElement('footer');footer.className='ff-order-footer';
 const dock=mountActionDock({container:footer,label:'Áreas do pedido',tablist:true,scrollTarget:body,items:sections.map(([id,label,path])=>({id,label,icon:icon(path),attributes:{id:'ff-order-tab-'+id,'data-order-section':id,'aria-controls':'ff-order-panel-'+id}}))});
 dock.nav.classList.add('ff-order-tabs');docks.set(detail,dock);
 const panels={};
 for(const [id,label] of sections){
  const panel=document.createElement('section');
  panel.id='ff-order-panel-'+id;panel.dataset.quotePanel=id;panel.className='ff-order-panel';
  panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','ff-order-tab-'+id);
  panel.tabIndex=0;panel.hidden=true;panels[id]=panel;body.append(panel);
 }
 // Move live nodes instead of cloning: typed values and all listeners survive.
 for(const node of [...frame.children]){
  if(node===head)continue;
  let section='service';
  if(node.matches('.ff-quote-facts,.ff-quote-services'))section='summary';
  else if(node.matches('#ff-quote-vehicle')||node.querySelector('[data-loyalty]'))section='customer';
  else if(node.matches('.ff-quote-security,.ff-quote-history'))section='history';
  if(node.matches('hr')){node.remove();continue;}
  if(node.matches('.ff-quote-services,#ff-quote-edit'))node.open=true;
  panels[section].append(node);
 }
 const back=document.createElement('button');
 back.type='button';back.className='ff-order-back';back.dataset.closeDialog='';
 back.setAttribute('aria-label','Fechar pedido e voltar ao painel');
 back.innerHTML='<span aria-hidden="true">←</span> Painel';
 head.prepend(back);
 const brand=document.createElement('a');brand.className='ff-order-brand';brand.href='../';brand.setAttribute('aria-label','Fine Form, abrir site');brand.innerHTML='<img src="../assets/logo-transparent.svg" width="36" height="36" alt="">';head.append(brand);
 const context=document.createElement('p');context.className='ff-order-context';context.setAttribute('aria-live','polite');head.append(context);
 frame.append(body,footer);
 const tabs=[...footer.querySelectorAll('[role="tab"]')];
 function activate(id,{focus=false,scroll=true}={}){
  if(!panels[id])return;
  const leaving=Object.values(panels).find(panel=>!panel.hidden);
  if(leaving)leaving.dataset.scroll=String(body.scrollTop);
  for(const button of tabs){
   const active=button.dataset.orderSection===id;
   button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
   if(active&&focus)button.focus();
  }
  for(const [key,panel] of Object.entries(panels))panel.hidden=key!==id;
  dock.select(id);frame.dataset.section=id;previousSection=id;
  context.textContent=sections.find(([key])=>key===id)[1];
  if(scroll)body.scrollTop=Number(panels[id].dataset.scroll)||0;
 }
 footer.addEventListener('click',event=>{
  const button=event.target.closest('[data-order-section]');
  if(button)activate(button.dataset.orderSection);
 });
 footer.addEventListener('keydown',event=>{
  const current=tabs.indexOf(event.target);
  if(current<0)return;
  let index;
  if(event.key==='ArrowRight')index=(current+1)%tabs.length;
  else if(event.key==='ArrowLeft')index=(current+tabs.length-1)%tabs.length;
  else if(event.key==='Home')index=0;
  else if(event.key==='End')index=tabs.length-1;
  else return;
  event.preventDefault();activate(tabs[index].dataset.orderSection,{focus:true});
 });
 // Native form validation must also expose a field in a currently hidden area.
 frame.addEventListener('invalid',event=>revealQuoteSection(event.target),true);
 activate(previousSection,{scroll:false});
}
