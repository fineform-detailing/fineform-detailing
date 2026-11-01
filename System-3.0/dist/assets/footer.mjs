import {socialContacts} from './contacts.mjs';
import {legalFooter} from './legal-footer.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Rodapé compacto da Fine Form. Links externos somente quando configurados. */
export function renderFooter({root='./',config={},year=new Date().getFullYear()}={}){
 const base=escape(root);
 const contacts=socialContacts(config);
 const selected=['whatsapp','instagram'].map(key=>contacts.find(c=>c.key===key)).filter(Boolean);
 if(!selected.length && contacts.length)selected.push(contacts[0]);
 const contactLinks=selected.map(({key,label,url})=>'<a data-social="'+escape(key)+'" href="'+escape(url)+'"'+(key==='email'?'':' target="_blank" rel="noopener noreferrer"')+'>'+escape(label)+' <span aria-hidden="true">↗</span></a>').join('');
 return '<div class="ff-footer-shell">'+
  '<div class="ff-footer-layout">'+
   '<div class="ff-footer-center">'+
    '<a class="ff-footer-emblem" href="'+base+'" aria-label="Fine Form, página inicial">'+
     '<img src="'+base+'assets/logo-transparent.svg" alt="Símbolo Fine Form" width="80" height="80" loading="lazy" decoding="async">'+
    '</a>'+
    '<a class="ff-footer-cta ff-footer-cta-primary" href="'+base+'atendimento/">Pedir orçamento <span aria-hidden="true">↗</span></a>'+
   '</div>'+
   '<nav class="ff-footer-contact" aria-label="Contato">'+
    '<h2 class="ff-footer-label">Contato</h2>'+
    (contactLinks||'<a href="'+base+'atendimento/">Fale conosco <span aria-hidden="true">↗</span></a>')+
   '</nav>'+
   '<nav class="ff-footer-nav" aria-label="Navegação">'+
    '<h2 class="ff-footer-label">Acesse</h2>'+
    '<a href="'+base+'#cuidados">Cuidados <span aria-hidden="true">↗</span></a>'+
    '<a href="'+base+'acompanhar/">Pedidos <span aria-hidden="true">↗</span></a>'+
   '</nav>'+
  '</div>'+
  '<div class="ff-footer-bottom">'+
   '<p class="ff-footer-copyright">© '+escape(year)+' Fine Form</p>'+
   '<div class="footer-utilities">'+legalFooter+
    '<button class="motion-toggle" id="motion-toggle" type="button" aria-pressed="false" aria-label="Pausar animações decorativas"><span aria-hidden="true">Ⅱ</span><span class="motion-label">Animações</span></button>'+
   '</div>'+
  '</div>'+
 '</div>';
}
