import {PRIVACY_VERSION,clearSavedData} from './privacy-storage.mjs';
const noticeKey='ff-privacy-notice-v1';
let previousFocus=null;
const panel=document.createElement('dialog');
panel.id='privacy-settings';panel.className='dialog privacy-settings';panel.setAttribute('aria-labelledby','privacy-settings-title');
panel.innerHTML='<button type="button" class="dialog-close" data-close-privacy aria-label="Fechar preferências de privacidade">×</button><h2 id="privacy-settings-title">Cookies e dados<br>neste aparelho.</h2><p>Esta versão não usa cookies de publicidade, pixels ou ferramentas de análise de visitantes. Não há rastreamento opcional para aceitar.</p><p>Usamos recursos necessários à segurança e ao funcionamento. Rascunhos só são guardados se você escolher, por até 30 dias. Links privados só são guardados por sua escolha, por até 90 dias.</p><p>Você pode apagar os rascunhos e links salvos aqui. Isso não cancela pedidos nem apaga os registros de atendimento na Fine Form. Campos já preenchidos na página continuam visíveis até você sair dela.</p><div class="privacy-actions"><button type="button" class="button outline" data-clear-saved>Apagar rascunhos e links salvos</button><a href="/cookies/" class="underlined-link">Consultar cookies e armazenamento</a></div><p id="privacy-settings-status" role="status" aria-live="polite"></p><p>Para acessar, corrigir ou pedir a exclusão de dados na Fine Form: <a href="mailto:fineformcare@gmail.com">fineformcare@gmail.com</a>. <a href="/privacidade/">Leia a Política de Privacidade</a>.</p>';
document.body.append(panel);
function close(){panel.close();previousFocus?.focus?.({preventScroll:true});}
panel.querySelector('[data-close-privacy]').addEventListener('click',close);
panel.addEventListener('cancel',()=>{queueMicrotask(()=>previousFocus?.focus?.({preventScroll:true}));});
panel.querySelector('[data-clear-saved]').addEventListener('click',()=>{
 let ok=false;try{ok=clearSavedData(localStorage);}catch{}
 panel.querySelector('[role=status]').textContent=ok?'Rascunhos e links removidos deste aparelho. Guarde seus links em um lugar seguro.':'O navegador não permitiu apagar os dados. Use as configurações de dados de sites do navegador.';
 if(ok)window.dispatchEvent(new CustomEvent('ff:saved-data-cleared'));
});
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-cookie-settings]'))return;
 previousFocus=event.target.closest('button');panel.querySelector('[role=status]').textContent='';panel.showModal();
});
let dismissed=false;try{dismissed=localStorage.getItem(noticeKey)===PRIVACY_VERSION;}catch{}
if(!dismissed&&document.body.dataset.page!=='admin'){
 const notice=document.createElement('aside');notice.className='privacy-banner';notice.setAttribute('aria-label','Aviso de cookies e privacidade');
 notice.innerHTML='<div><strong>Sua privacidade, com clareza.</strong><p>Sem cookies de publicidade ou análise de visitantes. Rascunhos e links privados só ficam salvos se você escolher. <a href="/cookies/">Saiba como funciona</a>.</p></div><button class="button outline" type="button">Entendi</button>';
 notice.querySelector('button').addEventListener('click',()=>{try{localStorage.setItem(noticeKey,PRIVACY_VERSION);}catch{}notice.remove();document.body.classList.remove('has-privacy-banner');});
 notice.hidden=document.documentElement.hasAttribute('data-ff-intro');
 document.addEventListener('ff:intro-complete',()=>{notice.hidden=false;},{once:true});
 document.body.append(notice);document.body.classList.add('has-privacy-banner');
}
