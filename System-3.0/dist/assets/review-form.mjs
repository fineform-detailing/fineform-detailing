import {api,escape as e} from './system.mjs';
const host=document.getElementById('review-content'),id=new URLSearchParams(location.search).get('id'),token=new URLSearchParams(location.hash.slice(1)).get('t')||'';
const labels=['Deixou a desejar','Poderia melhorar','Foi bom','Foi muito bom','Foi excelente'];
const star='<svg class="rating-star" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3.5 3.7 8 8.8 1-6.5 6 1.7 8.7L16 23l-7.7 4.2L10 18.5l-6.5-6 8.8-1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
const track='<div class="rating-track" aria-hidden="true"><span class="rating-road"></span><span class="rating-progress"></span><span class="rating-car"><svg viewBox="0 0 44 25" fill="none"><path d="M4 14 8 11l5-7h15l7 7 5 2v7H4Z" fill="#ff8000" stroke="#171817" stroke-width="1.5" stroke-linejoin="round"/><path d="m13 11 3-5h10l5 5Z" fill="#fff3e6" stroke="#171817" stroke-width="1.2"/><g class="rating-wheel"><circle cx="12" cy="20" r="3.5" fill="#171817"/><circle cx="12" cy="20" r="1.4" fill="#c6cbc3"/></g><g class="rating-wheel"><circle cx="32" cy="20" r="3.5" fill="#171817"/><circle cx="32" cy="20" r="1.4" fill="#c6cbc3"/></g></svg></span></div>';
function receipt(review){
 if(review.published===false){host.innerHTML='<section class="system-card review-thanks"><h2>Autorização retirada.</h2><p>Sua avaliação deixou de aparecer no site. Nome e comentário foram removidos do registro de avaliação.</p><p>Para pedir acesso, correção ou eliminação de outros dados, veja a <a href="../privacidade/">Política de Privacidade</a>.</p><a class="button outline" href="../">Voltar à Fine Form</a></section>';return;}
 host.innerHTML='<section class="system-card review-thanks"><span class="review-check" aria-hidden="true">✓</span><p class="kicker">AVALIAÇÃO RECEBIDA</p><h2>Sua avaliação foi recebida, '+e(review.firstName)+'.</h2><p>Obrigado por compartilhar sua experiência e ajudar a aprimorar nosso trabalho.</p><p class="review-stars" aria-label="'+review.rating+' de 5 estrelas">'+('★'.repeat(review.rating))+'<span aria-hidden="true">'+('☆'.repeat(5-review.rating))+'</span></p>'+(review.comment?'<blockquote>'+e(review.comment)+'</blockquote>':'')+'<a class="button orange" href="../#avaliacoes">Ver avaliações no site <span aria-hidden="true">↗</span></a><p class="privacy-inline"><a href="../privacidade/">Privacidade e seus direitos</a>. Você pode retirar a autorização sem afetar o atendimento.</p><button class="button outline" type="button" id="withdraw-review">Retirar autorização de publicação</button><p id="withdraw-error" role="alert"></p></section>';
 const withdraw=document.getElementById('withdraw-review');
 withdraw.addEventListener('click',async()=>{
  withdraw.disabled=true;withdraw.setAttribute('aria-busy','true');
  try{await api('/api/quotes/'+id+'/review',{method:'DELETE',token});receipt({...review,published:false});}
  catch(error){document.getElementById('withdraw-error').textContent=error.message;withdraw.disabled=false;withdraw.removeAttribute('aria-busy');}
 });
}
async function start(){
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id||'')||!token)throw Error('Abra o convite de avaliação ou o link privado do seu pedido.');
 const data=await api('/api/quotes/'+id+'/review',{token});
 if(data.review){receipt(data.review);return;}
 if(!data.eligible){host.innerHTML='<section class="system-card"><h2>A avaliação chega após a entrega.</h2><p>Você poderá avaliar assim que o veículo for registrado como entregue.</p><a class="button outline" href="../acompanhar/">Meus pedidos ↗</a></section>';return;}
 host.innerHTML='<section class="system-card review-compose"><h2>Olá, '+e(data.firstName)+'.</h2><form id="review-form"><fieldset class="rating-field"><legend>Sua nota <span aria-hidden="true">*</span></legend><div class="rating-options">'+labels.map((label,i)=>'<input type="radio" name="rating" value="'+(i+1)+'" id="rating-'+i+'" required><label for="rating-'+i+'">'+star+'<span class="rating-number">'+(i+1)+'</span><span class="sr-only">'+(i+1)+' de 5 estrelas · '+label+'</span></label>').join('')+'</div>'+track+'<p class="system-muted" id="rating-description" role="status">Escolha de 1 a 5 estrelas.</p></fieldset><label class="review-comment" for="review-comment">Quer contar mais? <span>Opcional</span></label><textarea id="review-comment" name="comment" rows="5" maxlength="600" placeholder="O que funcionou bem? O que podemos melhorar?"></textarea><p class="system-muted review-counter"><span id="review-count">0</span>/600 · Evite telefone, placa ou outros dados pessoais.</p><label class="system-check"><input type="checkbox" name="consent" required><span>Autorizo a publicação da minha nota, comentário e primeiro nome no site da Fine Form.</span></label><p class="system-error" role="alert" id="review-error"></p><button class="button orange" type="submit">Publicar minha avaliação <span aria-hidden="true">↗</span></button><p class="system-muted">Uma avaliação por atendimento entregue. Todas as notas são bem-vindas. <a href="../privacidade/">Como usamos seus dados</a>. A autorização pode ser retirada por este mesmo link.</p></form></section>';
 const form=document.getElementById('review-form'),button=form.querySelector('[type=submit]'),comment=form.elements.namedItem('comment'),consent=form.elements.namedItem('consent');
 form.addEventListener('change',event=>{
  if(event.target.name!=='rating')return;
  const rating=Number(new FormData(form).get('rating'));
  const previous=Number(form.dataset.rating||0);
  form.dataset.rating=String(rating);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  form.querySelectorAll('.rating-options label').forEach((label,i)=>{
   label.classList.toggle('is-selected',i<rating);
   label.classList.toggle('is-current',i===rating-1);
   const glyph=label.querySelector('.rating-star');
   glyph.getAnimations?.().forEach(a=>a.cancel());
   if(!reduced&&i<rating&&i>=previous&&glyph.animate){
    glyph.animate([{transform:'scale(.82) rotate(-8deg)'},{transform:'scale(1.18) rotate(7deg)',offset:.58},{transform:'scale(1) rotate(0)'}],{duration:360,delay:(i-previous)*45,easing:'cubic-bezier(.2,.8,.25,1)'});
   }
  });
  const road=form.querySelector('.rating-track');
  road.classList.add('is-rated');
  road.style.setProperty('--rating-position',String((rating-1)*20+10)+'%');
  document.getElementById('rating-description').textContent=rating?labels[rating-1]:'Escolha de 1 a 5 estrelas.';
 });
 comment.addEventListener('input',()=>document.getElementById('review-count').textContent=comment.value.length);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled||!form.reportValidity())return;
  button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Enviando sua avaliação…';
  const error=document.getElementById('review-error');error.textContent='';
  try{const result=await api('/api/quotes/'+id+'/review',{method:'POST',token,body:{rating:Number(new FormData(form).get('rating')),comment:comment.value,consent:consent.checked}});receipt(result.review);}
  catch(failure){error.textContent=failure.message;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Publicar minha avaliação ↗';}
 });
}
start().catch(error=>{host.innerHTML='<section class="system-card"><h2>Não foi possível abrir sua avaliação.</h2><p role="alert">'+e(error.message)+'</p><a class="button outline" href="../acompanhar/">Abrir meus pedidos ↗</a></section>';});
