import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {renderFooter} from '../dist/assets/footer.mjs';

const config={instagram:'https://www.instagram.com/fineform.detailing/',tiktok:'https://www.tiktok.com/@fineform.detailing',whatsapp:'5511959473298',email:'fineformcare@gmail.com'};
function doc(root='./',configOverride=config){
 const html=renderFooter({root,config:configOverride,year:2026});
 return new JSDOM('<footer class="site-footer ff-footer-redesign">'+html+'</footer>').window.document;
}
test('rodapé editorial usa logo Fine Form real, fundo preto, CTA e links funcionais',async()=>{
 const d=doc();
 assert.equal(d.querySelectorAll('.ff-footer-shell').length,1);
 assert.ok(d.querySelector('.ff-footer-emblem img[src="./assets/logo-transparent.svg"]'));
 assert.equal(d.querySelector('.ff-footer-wordmark').textContent,'FINE FORM.');
 assert.equal(d.querySelector('.ff-footer-cta-primary').getAttribute('href'),'./atendimento/');
 assert.equal(d.querySelector('.ff-footer-cta-secondary').getAttribute('href'),'./#cuidados');
 assert.deepEqual([...d.querySelectorAll('.ff-footer-nav>a')].map(a=>a.getAttribute('href')),['./','./#cuidados','./#care','./acompanhar/','./links/']);
 assert.equal(d.querySelectorAll('#motion-toggle').length,1);
 assert.equal(d.querySelector('#motion-toggle').getAttribute('aria-pressed'),'false');
 assert.ok(d.querySelector('[data-cookie-settings]'));
 assert.ok(d.querySelector('a[href="/privacidade/"]'));
 const css=await readFile('dist/assets/studio.css','utf8');
 assert.match(css,/\.ff-footer-redesign \.ff-footer-shell\s*\{/);
 assert.ok(css.includes('background:#111413'),'fundo escuro');
 assert.ok(css.includes('@media(max-width:540px)'),'reorganização mobile');
});
test('rodapé respeita caminhos relativos e exibe somente contatos configurados',()=>{
 const d=doc('../',{email:'contact@example.com'});
 assert.equal(d.querySelector('.ff-footer-emblem img').getAttribute('src'),'../assets/logo-transparent.svg');
 assert.equal(d.querySelector('.ff-footer-cta-primary').getAttribute('href'),'../atendimento/');
 assert.equal(d.querySelector('.ff-footer-nav a[href="../acompanhar/"]').textContent.trim(),'Meus pedidos ↗');
 const contacts=[...d.querySelectorAll('.ff-footer-contact-links a')];
 assert.equal(contacts.length,1);
 assert.equal(contacts[0].getAttribute('href'),'mailto:contact@example.com');
 assert.equal(contacts[0].getAttribute('target'),null);
 const without=doc('../',{});
 assert.equal(without.querySelectorAll('.ff-footer-contact-links>a').length,1);
 assert.equal(without.querySelector('.ff-footer-contact-links>a').getAttribute('href'),'../atendimento/');
});
test('rodapé contém horários e informações legais sem comprometer outros recursos',async()=>{
 const d=doc();
 assert.ok(d.querySelector('.ff-footer-hours').textContent.includes('Segunda a sábado'));
 assert.ok(d.querySelector('.ff-footer-hours').textContent.includes('Domingo'));
 assert.ok(d.querySelector('.ff-footer-contact-links [data-social="whatsapp"]'));
 assert.ok(d.querySelector('.ff-footer-contact-links [data-social="instagram"]'));
 assert.ok(d.querySelector('.ff-footer-contact-links [data-social="tiktok"]'));
 const legal=d.querySelector('.footer-information-panel');
 assert.ok(legal);
 for(const path of ['/termos/','/cancelamento-e-reembolso/','/cookies/','/acessibilidade/','/creditos/'])assert.ok(legal.querySelector('a[href="'+path+'"]'));
 const app=await readFile('dist/assets/app.mjs','utf8');
 assert.ok(app.includes("footer.innerHTML=renderFooter({root,config:cfg})"));
 assert.ok(app.includes('mountFloatingNav({root})'));
 const nav=await readFile('dist/assets/floating-nav.mjs','utf8');
 assert.ok(nav.includes("document.querySelector('[data-footer]')"));
});
