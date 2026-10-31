import {findService,money} from './catalog.mjs';

// Cada cartão apresenta um serviço real. Busca e filtros são locais, sem dados pessoais ou requests.
const cards = [
  {id:'essential',category:'wash',group:'Lavagens',image:'hero-detail-wash-mobile.jpg',alt:'Lavagem detalhada de carro',detail:'Limpeza externa e interna com atenção aos detalhes.'},
  {id:'premium',category:'wash',group:'Lavagens',image:'modern-mclaren-mobile.webp',alt:'Detalhe de carro esportivo preto',detail:'Mais atenção às frestas e proteção da pintura.'},
  {id:'fullClean',category:'interior',group:'Interior',image:'modern-interior-mobile.webp',alt:'Detalhes do interior automotivo',detail:'Higienização aprofundada dos bancos e do interior.'},
  {id:'polishLight',category:'paint',group:'Pintura',image:'modern-gt3-mobile.webp',alt:'Detalhe da pintura de um Porsche esportivo',detail:'Realce do brilho e melhora de marcas leves.'},
  {id:'coating',category:'paint',group:'Proteção',image:'modern-mclaren-mobile.webp',alt:'Pintura de carro preto com reflexos',detail:'Proteção cerâmica da pintura após preparação.'},
  {id:'motoPremium',category:'moto',group:'Motos',image:'modern-ducati-mobile.webp',alt:'Ducati esportiva vista lateralmente',detail:'Limpeza e acabamento para sua moto.'}
];
export const normalizeCareSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const filterCareCards = (items,filter='all',query='') => {
 const needle=normalizeCareSearch(query);
 return items.filter(item=>{
  if(filter!=='all' && item.category!==filter)return false;
  if(!needle)return true;
  const s=findService(item.id);
  return normalizeCareSearch([item.group,item.detail,s?.label,s?.tag,s?.description,item.id].join(' ')).includes(needle);
 });
};
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function mountDiscover(){
 const host=document.getElementById('ff-highlight-grid');
 const form=document.getElementById('ff-care-search');
 const input=document.getElementById('ff-care-query');
 const empty=document.getElementById('ff-highlight-empty');
 const filterButtons=[...document.querySelectorAll('[data-ff-filter]')];
 if(!host||!form||!input||!empty)return;
 let filter='all';
 const render=()=>{
  const shown=filterCareCards(cards,filter,input.value);
  host.innerHTML=shown.map(item=>{
   const service=findService(item.id);
   if(!service)return '';
   return '<button type="button" class="ff-product-card" data-service="'+escapeHTML(item.id)+'" aria-label="Ver detalhes de '+escapeHTML(service.label)+'">'+
    '<span class="ff-product-media"><img src="assets/'+item.image+'" alt="'+escapeHTML(item.alt)+'" width="560" height="840" loading="lazy" decoding="async"><span class="ff-product-tag">'+escapeHTML(item.group)+'</span><span class="ff-product-arrow" aria-hidden="true">↗</span></span>'+
    '<span class="ff-product-details"><strong>'+escapeHTML(service.label)+'</strong><span class="ff-product-description">'+escapeHTML(item.detail)+'</span><span class="ff-product-bottom"><b>'+escapeHTML(money(service.price))+'</b><span>Ver detalhes</span></span></span></button>';
  }).join('');
  empty.hidden=shown.length!==0;
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ffFilter===filter)));
 };
 filterButtons.forEach(button=>button.addEventListener('click',()=>{
  filter=button.dataset.ffFilter;
  input.value='';
  render();
 }));
 input.addEventListener('input',render);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  render();
  document.getElementById('destaques')?.scrollIntoView({behavior:'auto',block:'start'});
 });
 render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountDiscover,{once:true});
 else mountDiscover();
}
