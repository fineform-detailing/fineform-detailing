import {api,escape as e} from './system.mjs';
const host=document.getElementById('review-content'),id=new URLSearchParams(location.search).get('id'),token=new URLSearchParams(location.hash.slice(1)).get('t')||'';
const labels=['Deixou a desejar','Poderia melhorar','Foi bom','Foi muito bom','Foi excelente'];
function receipt(review){
 if(review.published===false){host.innerHTML='<section class="system-card review-thanks"><h2>Autorização retirada.</h2><p>Sua avaliação deixou de aparecer no site. Nome e comentário foram removidos do registro de avaliação.</p><p>Para pedir acesso, correção ou eliminação de outros dados, veja a <a href="../privacidade/">Política de Privacidade</a>.</p><a class="button outline" href="../">Voltar à Fine Form</a></section>';return;}
 host.innerHTML='<section class="system-card review-thanks"><span class="review-check" aria-hidden="true">✓</span><p class="kicker">AVALIAÇÃO RECEBIDA</p><h2>Obrigado pelo seu olhar, '+e(review.firstName)+'.</h2><p>Sua experiência faz parte da Fine Form.</p><p class="review-stars" aria-label="'+review.rating+' de 5 estrelas">'+('★'.repeat(review.rating))+'<span aria-hidden="true">'+('☆'.repeat(5-review.rating))+'</span></p>'+(review.comment?'<blockquote>'+e(review.comment)+'</blockquote>':'')+'<a class="button orange" href="../#avaliacoes">Ver avaliações no site <span aria-hidden="true">↗</span></a><p class="privacy-inline"><a href="../privacidade/">Privacidade e seus direitos</a>. Você pode retirar a autorização sem afetar o atendimento.</p><button class="button outline" type="button" id="withdraw-review">Retirar autorização de publicação</button><p id="withdraw-error" role="alert"></p></section>';
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
 if(!data.eligible){host.innerHTML='<section class="system-card"><h2>Primeiro, o seu cuidado.</h2><p>A avaliação será liberada quando Mateus marcar o veículo como retirado e entregue.</p><a class="button outline" href="../acompanhar/">Meus pedidos ↗</a></section>';return;}
 host.innerHTML='<section class="system-card review-compose"><h2>Como foi seu cuidado, '+e(data.firstName)+'?</h2><form id="review-form"><fieldset class="rating-field"><legend>Sua nota <span aria-hidden="true">*</span></legend><div class="rating-options">'+labels.map((label,i)=>'<input type="radio" name="rating" value="'+(i+1)+'" id="rating-'+i+'" required><label for="rating-'+i+'"><span aria-hidden="true">★</span><span class="rating-number">'+(i+1)+'</span><span class="sr-only">'+(i+1)+' de 5 estrelas · '+label+'</span></label>').join('')+'</div><p class="system-muted" id="rating-description">Escolha de 1 a 5 estrelas.</p></fieldset><label class="review-comment" for="review-comment">Quer contar mais? <span>Opcional</span></label><textarea id="review-comment" name="comment" rows="5" maxlength="600" placeholder="O que você achou do atendimento e do cuidado com seu veículo?"></textarea><p class="system-muted review-counter"><span id="review-count">0</span>/600 · Evite telefone, placa ou outros dados pessoais.</p><label class="system-check"><input type="checkbox" name="consent" required><span>Autorizo a publicação da minha nota, comentário e primeiro nome no site da Fine Form.</span></label><p class="system-error" role="alert" id="review-error"></p><button class="button orange" type="submit">Publicar minha avaliação <span aria-hidden="true">↗</span></button><p class="system-muted">Uma avaliação por atendimento entregue. Todas as notas são bem-vindas. <a href="../privacidade/">Como usamos seus dados</a>. A autorização pode ser retirada por este mesmo link.</p></form></section>';
 const form=document.getElementById('review-form'),button=form.querySelector('[type=submit]'),comment=form.elements.namedItem('comment'),consent=form.elements.namedItem('consent');
 form.addEventListener('change',()=>{
  const rating=Number(new FormData(form).get('rating'));
  form.querySelectorAll('.rating-options label').forEach((label,i)=>label.classList.toggle('is-selected',i<rating));
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
