import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('links do Instagram priorizam orçamento e preservam destinos reais',async()=>{const doc=new JSDOM(await read('../dist/links/index.html')).window.document;const main=doc.querySelector('.links-page');assert.ok(main);const links=[...doc.querySelectorAll('.links-request,.bio-nav>a')].map(el=>el.getAttribute('href'));assert.equal(links[0],'../atendimento/');for(const dest of ['../#cuidados','../#care','../acompanhar/','../atendimento/?mode=guidance'])assert.ok(links.includes(dest),dest);assert.ok(doc.querySelector('[data-contact]'));assert.ok(doc.querySelector('[data-social-links]'));assert.ok(doc.querySelector('.links-hours summary'));assert.ok(doc.querySelector('.footer-resources'));assert.ok(doc.querySelector('[data-cookie-settings]'));});
test('identidade visual é isolada, acessível e otimizada para mobile',async()=>{const css=await read('../dist/assets/instagram-links.css');const html=await read('../dist/links/index.html');assert.match(html,/instagram-links\.css\?v=3/);assert.match(html,/logo-transparent\.svg/);assert.match(html,/fineform-polish\.webp/);assert.doesNotMatch(html,/FINE FORM \/ ESTÉTICA AUTOMOTIVA/);assert.match(html,/Orçamento, planos e atendimento direto em um só lugar\./);assert.doesNotMatch(html,/modern-gt3\.webp/);assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/--links-cyan:#ff8000/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/backdrop-filter:blur\(24px\)/);assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);});

test('estados de foco e toque da página de links usam a paleta Fine Form, sem hover bege',async()=>{
 const css=await read('../dist/assets/instagram-links.css');
 const doc=new JSDOM(await read('../dist/links/index.html')).window.document;
 const primary=doc.querySelector('.links-request');
 assert.equal(primary.getAttribute('href'),'../atendimento/');
 assert.match(css,/background:#0f0f0f;border:1px solid #0f0f0f/);
 assert.match(css,/\.links-request:active\{/);
 assert.match(css,/border-color:#ff8000!important/);
 assert.match(css,/-webkit-tap-highlight-color:transparent/);
 assert.match(css,/hover:none/);
 assert.match(css,/hover:not\(:active\)/);
 assert.match(css,/focus-visible\{/);
 assert.match(css,/outline:3px solid #b85a00!important/);
 assert.doesNotMatch(css,/\.links-request:hover\{background:#60c9b7/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
