import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {renderFooter} from '../dist/assets/footer.mjs';

const config={instagram:'https://www.instagram.com/fineform.detailing/',tiktok:'https://www.tiktok.com/@fineform.detailing',whatsapp:'5511959473298',email:'fineformcare@gmail.com'};
function doc(root='./',configOverride=config){
 return new JSDOM('<footer class="site-footer ff-footer-redesign">'+renderFooter({root,config:configOverride,year:2026})+'</footer>').window.document;
}
test('rodapé ocupa toda a largura e mostra logotipo sem qualquer caixa',async()=>{
 const d=doc();
 const css=await readFile('dist/assets/studio.css','utf8');
 const block=css.slice(css.indexOf('/* Fine Form | Rodapé full-bleed'));
 assert.ok(block.startsWith('/* Fine Form | Rodapé full-bleed'));
 assert.match(block,/\.site-footer\.ff-footer-redesign,[\s\S]*?\{[\s\S]*?width:100%;max-width:none;[\s\S]*?margin:0;padding:0;/);
 assert.match(block,/\.ff-footer-redesign \.ff-footer-shell\{[\s\S]*?width:100%;max-width:none;/);
 assert.match(block,/\.ff-footer-redesign \.ff-footer-emblem\{[\s\S]*?border:0;border-radius:0;[\s\S]*?background:transparent;box-shadow:none/);
 assert.equal(d.querySelector('.ff-footer-emblem img').getAttribute('src'),'./assets/logo-transparent.svg');
 assert.ok(!d.querySelector('.ff-footer-emblem').querySelector('div'),'somente logo SVG, sem fundo');
 assert.ok(!block.includes('width:min(100%,1400px)'),'sem largura limitada');
 assert.ok(!block.includes('box-shadow:0 0 0 7px #fff'),'sem aro branco');
});
test('rodapé minimalista preserva apenas CTA, contatos essenciais e dois atalhos',()=>{
 const d=doc();
 assert.equal(d.querySelector('.ff-footer-wordmark').textContent,'FINE FORM');
 assert.equal(d.querySelectorAll('.ff-footer-cta').length,1);
 assert.equal(d.querySelector('.ff-footer-cta').getAttribute('href'),'./atendimento/');
 assert.deepEqual([...d.querySelectorAll('.ff-footer-nav>a')].map(a=>a.getAttribute('href')),['./#cuidados','./acompanhar/']);
 assert.deepEqual([...d.querySelectorAll('.ff-footer-contact>a')].map(a=>a.dataset.social),['whatsapp','instagram']);
 assert.equal(d.querySelector('.ff-footer-hours'),null);
 assert.equal(d.querySelector('.ff-footer-overline'),null);
 assert.equal(d.querySelector('.ff-footer-cta-secondary'),null);
});
test('rodapé preserva privacidade, controle de dados e preferência de movimento',async()=>{
 const d=doc('../',{email:'contact@example.com'});
 assert.equal(d.querySelector('.ff-footer-emblem img').getAttribute('src'),'../assets/logo-transparent.svg');
 assert.equal(d.querySelector('.ff-footer-cta').getAttribute('href'),'../atendimento/');
 assert.equal(d.querySelectorAll('.ff-footer-contact>a').length,1);
 assert.equal(d.querySelector('.ff-footer-contact>a').getAttribute('href'),'mailto:contact@example.com');
 assert.ok(d.querySelector('a[href="/privacidade/"]'));
 assert.ok(d.querySelector('[data-cookie-settings]'));
 assert.equal(d.querySelectorAll('#motion-toggle').length,1);
 assert.equal(d.querySelector('#motion-toggle').getAttribute('aria-pressed'),'false');
 const app=await readFile('dist/assets/app.mjs','utf8');
 assert.ok(app.includes('footer.innerHTML=renderFooter({root,config:cfg})'));
 const nav=await readFile('dist/assets/floating-nav.mjs','utf8');
 assert.ok(nav.includes("document.querySelector('[data-footer]')"));
 const empty=doc('../',{});
 assert.equal(empty.querySelector('.ff-footer-contact>a').getAttribute('href'),'../atendimento/');
});
