const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=document.getElementById('reviews-list'),summary=document.getElementById('reviews-summary'),more=document.getElementById('reviews-more');
let page=0,busy=false,loaded=false;
const date=value=>new Date(value).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
async function load(append=false){
 if(busy||!host)return;busy=true;more.disabled=true;
 try{
  const response=await fetch('/api/reviews?page='+(append?page+1:0),{credentials:'omit',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('reviews-unavailable');const data=await response.json();
  page=data.page;loaded=true;
  if(!append)host.replaceChildren();
  summary.textContent=data.count?Number(data.average).toLocaleString('pt-BR',{minimumFractionDigits:1})+' / 5 · '+data.count+' avaliaç'+(data.count===1?'ão':'ões')+' de clientes':'A próxima história pode ser a sua.';
  if(!data.items.length&&!append)host.innerHTML='<div class="reviews-empty"><span aria-hidden="true">✳</span><h3>Um cuidado real. Uma opinião sua.</h3><p>Depois de receber seu veículo, avalie pelo acompanhamento do pedido. As experiências dos nossos clientes vão aparecer aqui.</p></div>';
  else host.insertAdjacentHTML('beforeend',data.items.map(r=>'<article class="review-card"><div class="review-card-top"><p class="review-stars" aria-label="'+r.rating+' de 5 estrelas">'+('★'.repeat(r.rating))+'<span aria-hidden="true">'+('☆'.repeat(5-r.rating))+'</span></p><span class="review-verified">✓ Atendimento verificado</span></div>'+(r.comment?'<blockquote>'+e(r.comment)+'</blockquote>':'<p class="review-no-comment">Avaliou o cuidado com '+r.rating+' de 5 estrelas.</p>')+'<footer><strong>'+e(r.firstName)+'</strong><span>'+(r.vehicle==='moto'?'Moto':'Carro')+' · '+e(date(r.createdAt))+'</span></footer></article>').join(''));
  more.hidden=!data.hasMore;more.textContent='Ver mais avaliações';
  window.dispatchEvent(new CustomEvent('ff:content'));
 }catch{
  if(!loaded){summary.textContent='Experiências de quem já passou por aqui.';host.innerHTML='<p class="reviews-unavailable" role="status">Não foi possível carregar as avaliações agora.</p>';}
  more.hidden=false;more.textContent='Tentar novamente';
 }finally{busy=false;more.disabled=false;}
}
more?.addEventListener('click',()=>load(loaded));
if(host){
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load();}},{rootMargin:'400px'});observer.observe(host);}
 else load();
}
