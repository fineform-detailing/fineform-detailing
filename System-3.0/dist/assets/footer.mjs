import {socialContacts} from './contacts.mjs';
import {legalFooter} from './legal-footer.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** A single responsive site-wide footer with real links from public configuration. */
export function renderFooter({root='./',config={},year=new Date().getFullYear()}={}){
 const base=escape(root);
 const contacts=socialContacts(config);
 const contactLinks=contacts.map(({key,label,url})=>
  '<a class="ff-footer-contact-link" data-social="'+escape(key)+'" href="'+escape(url)+'"'+
  (key==='email'?'':' target="_blank" rel="noopener noreferrer"')+
  '><span>'+escape(label)+'</span><span aria-hidden="true">↗</span></a>'
 ).join('');
 return '<div class="ff-footer-shell">'+
  '<a class="ff-footer-emblem" href="'+base+'" aria-label="Fine Form, voltar ao início">'+
   '<img src="'+base+'assets/logo-transparent.svg" width="68" height="68" alt="Símbolo Fine Form" loading="lazy" decoding="async">'+
  '</a>'+
  '<div class="ff-footer-layout">'+
   '<section class="ff-footer-contact" aria-labelledby="ff-footer-contact-title">'+
    '<h2 id="ff-footer-contact-title" class="ff-footer-label">Contato</h2>'+
    '<nav class="ff-footer-contact-links" aria-label="Canais de contato">'+contactLinks+
      (!contacts.length?'<a href="'+base+'atendimento/">Solicitar contato <span aria-hidden="true">↗</span></a>':'')+'</nav>'+
    '<div class="ff-footer-hours"><h3>Horários</h3><p>Segunda a sábado<br>9h às 17h30</p><p>Domingo<br>9h às 12h</p></div>'+
   '</section>'+
   '<div class="ff-footer-center">'+
    '<p class="ff-footer-overline">ESTÉTICA AUTOMOTIVA</p>'+
    '<p class="ff-footer-wordmark">FINE FORM<span class="ff-footer-wordmark-dot">.</span></p>'+
    '<p class="ff-footer-slogan">Seu veículo, em boa forma.</p>'+
    '<div class="ff-footer-actions">'+
     '<a class="ff-footer-cta ff-footer-cta-primary" href="'+base+'atendimento/">Pedir orçamento <span aria-hidden="true">↗</span></a>'+
     '<a class="ff-footer-cta ff-footer-cta-secondary" href="'+base+'#cuidados">Ver cuidados <span aria-hidden="true">↗</span></a>'+
    '</div>'+
   '</div>'+
   '<nav class="ff-footer-nav" aria-label="Navegação do rodapé">'+
    '<h2 class="ff-footer-label">Explore</h2>'+
    '<a href="'+base+'">Início <span aria-hidden="true">↗</span></a>'+
    '<a href="'+base+'#cuidados">Cuidados <span aria-hidden="true">↗</span></a>'+
    '<a href="'+base+'#care">Fine Form Care <span aria-hidden="true">↗</span></a>'+
    '<a href="'+base+'acompanhar/">Meus pedidos <span aria-hidden="true">↗</span></a>'+
    '<a href="'+base+'links/">Todos os links <span aria-hidden="true">↗</span></a>'+
   '</nav>'+
  '</div>'+
  '<div class="ff-footer-bottom">'+
   '<p class="ff-footer-copyright">© '+escape(year)+' Fine Form<span> · Estética Automotiva</span></p>'+
   '<div class="footer-utilities">'+legalFooter+
     '<button class="motion-toggle" id="motion-toggle" type="button" aria-pressed="false" aria-label="Pausar animações decorativas"><span aria-hidden="true">Ⅱ</span><span class="motion-label">Animações</span></button>'+
   '</div>'+
  '</div>'+
 '</div>';
}
