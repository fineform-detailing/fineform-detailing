import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {mountFloatingNav} from '../dist/assets/floating-nav.mjs';

function setup(page = 'home') {
  const dom = new JSDOM(`<body data-page="${page}"><main id="conteudo"><section id="cuidados"></section><section id="care"></section><input aria-label="Modelo"></main><footer data-footer></footer></body>`, {url: `https://fineform.test/${page === 'home' ? '' : 'atendimento/'}`, pretendToBeVisual: true});
  const {window} = dom;
  let scroll = 0, nextFrame;
  window.requestAnimationFrame = callback => {nextFrame = callback; return 1;};
  window.document.getElementById('cuidados').getBoundingClientRect = () => ({top: 900 - scroll, bottom: 1800 - scroll});
  window.document.getElementById('care').getBoundingClientRect = () => ({top: 2200 - scroll, bottom: 3200 - scroll});
  const nav = mountFloatingNav({window, root: page === 'home' ? './' : '../'});
  return {window, nav, scrollTo(value) {scroll = value; window.dispatchEvent(new window.Event('scroll')); nextFrame?.();}};
}

test('barra acompanha a seção visível, inclusive ao voltar ao início', () => {
  const {window, nav, scrollTo} = setup();
  const current = () => nav.querySelector('[aria-current]')?.dataset.dock;
  assert.equal(current(), 'home');
  scrollTo(1000); assert.equal(current(), 'care');
  scrollTo(2300); assert.equal(current(), 'plans');
  scrollTo(3400); assert.equal(current(), undefined);
  scrollTo(0); assert.equal(current(), 'home');
  assert.equal(nav.querySelector('[data-dock="home"]').hash, '#conteudo');
  window.close();
});

test('atalhos resolvem a partir de páginas internas e orçamento mantém a etapa atual', () => {
  const {window, nav} = setup('booking');
  const link = key => nav.querySelector(`[data-dock="${key}"]`);
  assert.equal(link('home').href, 'https://fineform.test/');
  assert.equal(link('care').href, 'https://fineform.test/#cuidados');
  assert.equal(link('quote').href, 'https://fineform.test/atendimento/#conteudo');
  assert.equal(link('orders').href, 'https://fineform.test/acompanhar/');
  assert.equal(link('quote').getAttribute('aria-current'), 'page');
  assert.equal(nav.parentElement.matches('[data-footer]'), true);
  mountFloatingNav({window});
  assert.equal(window.document.querySelectorAll('.ff-dock').length, 1);
  window.close();
});

test('barra libera espaço ao digitar no celular e retorna ao sair do campo', async () => {
  const {window, nav} = setup('booking');
  window.innerWidth = 390;
  const input = window.document.querySelector('input');
  input.focus(); assert.equal(nav.classList.contains('ff-dock-keyboard'), true);
  input.blur(); await Promise.resolve();
  assert.equal(nav.classList.contains('ff-dock-keyboard'), false);
  window.close();
});

test('glassmorphism da barra inferior é permanente, independente da rolagem', () => {
 const css = readFileSync(new URL('../dist/assets/studio.css', import.meta.url), 'utf8');
 assert.match(css, /body\[data-design=kinetic\] \.ff-dock\{\s*background:rgba\(248,250,248,\.86\)/);
 assert.match(css, /body\[data-design=kinetic\] \.ff-dock\{[\s\S]*?-webkit-backdrop-filter:blur\(24px\) saturate\(175%\)/);
 assert.match(css, /body\[data-design=kinetic\] \.ff-dock-indicator\{/);
 assert.match(css, /@supports not \(\(-webkit-backdrop-filter:blur\(1px\)\)/);
 const {window,nav,scrollTo}=setup();
 assert.equal(nav.classList.contains('is-scrolled'),false,'sem estado de scroll na barra');
 assert.equal(nav.querySelectorAll('.ff-dock-link').length,5);
 scrollTo(1000);
 assert.equal(nav.classList.contains('is-scrolled'),false,'o visual não depende da rolagem');
 assert.equal(nav.querySelector('[aria-current]')?.dataset.dock,'care','o indicador segue funcionando');
 window.close();
});


test('ao rolar o dock vira círculo de vidro com ícone e retorna expandido', async () => {
 const {window,nav}=setup('home');
 Object.defineProperty(window,'scrollY',{configurable:true,writable:true,value:0});
 const compact=nav.querySelector('.ff-dock-compact');
 assert.ok(compact && compact.querySelector('svg'),'ícone acessível disponível');
 assert.equal(compact.hidden,true);
 assert.equal(nav.classList.contains('ff-dock-collapsed'),false);
 window.scrollY=120;window.dispatchEvent(new window.Event('scroll'));
 assert.equal(nav.classList.contains('ff-dock-collapsed'),true);
 assert.equal(compact.hidden,false);
 assert.equal(nav.querySelectorAll('.ff-dock-link').length,5,'links originais preservados');
 assert.equal(nav.querySelector('.ff-dock-link').tabIndex,-1,'links recolhidos não recebem foco');
 await new Promise(resolve=>window.setTimeout(resolve,120));
 window.scrollY=250;window.dispatchEvent(new window.Event('scroll'));
 await new Promise(resolve=>window.setTimeout(resolve,160));
 assert.equal(nav.classList.contains('ff-dock-collapsed'),true,'ainda rolando');
 await new Promise(resolve=>window.setTimeout(resolve,135));
 assert.equal(nav.classList.contains('ff-dock-collapsed'),false,'retorna quando a rolagem para');
 assert.equal(compact.hidden,true);
 assert.equal(nav.querySelector('.ff-dock-link').tabIndex,0);
 const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 assert.match(css,/\.ff-dock\.ff-dock-collapsed\s*\{/);
 assert.match(css,/width:56px;\s*height:56px/);
 assert.match(css,/backdrop-filter:blur\(24px\) saturate\(175%\)/);
 window.close();
});

test('o círculo abre a navegação ao toque sem trocar os destinos', async () => {
 const {window,nav}=setup('booking');
 Object.defineProperty(window,'scrollY',{configurable:true,writable:true,value:0});
 window.scrollY=180;window.dispatchEvent(new window.Event('scroll'));
 const compact=nav.querySelector('.ff-dock-compact');
 assert.equal(compact.hidden,false);
 compact.click();
 assert.equal(nav.classList.contains('ff-dock-collapsed'),false);
 assert.equal(compact.hidden,true);
 assert.equal(nav.querySelector('[data-dock="quote"]').getAttribute('aria-current'),'page');
 await new Promise(resolve=>window.setTimeout(resolve,310));
 assert.equal(nav.classList.contains('ff-dock-collapsed'),false,'toque limpa o timer');
 window.close();
});

test('o dock combina com o header, menos transparente e com tamanho menor', () => {
 const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 assert.match(css,/Refinamento: mesmo acabamento do header/);
 assert.match(css,/width:min\(390px,calc\(100% - 36px\)\)/);
 assert.match(css,/height:72px/);
 assert.match(css,/background:rgba\(248,250,248,\.86\)/);
 assert.match(css,/width:56px;height:56px;min-width:56px/);
 assert.match(css,/width:54px;height:54px;min-width:54px/);
 assert.match(css,/backdrop-filter:blur\(24px\) saturate\(175%\)/);
});

test('dock segmentado mantém cinco rotas e abre cápsula animada somente na aba ativa', () => {
 const {window,nav,scrollTo}=setup();
 const links=[...nav.querySelectorAll('.ff-dock-link')];
 assert.equal(links.length,5);
 assert.deepEqual(links.map(x=>x.dataset.dock),['home','care','quote','plans','orders']);
 assert.ok(links.every(x=>x.querySelector('.ff-dock-icon svg')&&x.querySelector('.ff-dock-label')));
 assert.ok(links.every(x=>x.hasAttribute('aria-label')),'acessível mesmo com texto visualmente recolhido');
 assert.equal(nav.querySelectorAll('.ff-dock-link[aria-current]').length,1);
 assert.equal(nav.querySelector('[aria-current]').dataset.dock,'home');
 assert.equal(nav.dataset.active,'home');
 assert.equal(nav.style.getPropertyValue('--dock-columns'),'2.3fr 1fr 1fr 1fr 1fr');
 scrollTo(1000);
 assert.equal(nav.dataset.active,'care');
 assert.equal(nav.querySelector('[aria-current]').dataset.dock,'care');
 assert.equal(nav.style.getPropertyValue('--dock-columns'),'1fr 2.3fr 1fr 1fr 1fr');
 scrollTo(2300);
 assert.equal(nav.dataset.active,'plans');
 assert.equal(nav.querySelector('[aria-current]').dataset.dock,'plans');
 assert.equal(nav.style.getPropertyValue('--dock-columns'),'1fr 1fr 1fr 2.3fr 1fr');
 const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 const segment=css.slice(css.indexOf('/* Fine Form Liquid Glass segmented dock'));
 assert.ok(segment.startsWith('/* Fine Form Liquid Glass segmented dock'));
 for(const feature of ['grid-template-columns:var(--dock-columns','backdrop-filter:blur(24px) saturate(175%)','ff-dock-pill-appear','@media(prefers-reduced-motion:reduce)','@media(max-width:359px)']){
  assert.ok(segment.includes(feature),'visual esperado: '+feature);
 }
 window.close();
});
test('aba Orçar apresenta a mesma cápsula escura e continua ligada ao orçamento', () => {
 const {window,nav}=setup('booking');
 const quote=nav.querySelector('[data-dock="quote"]');
 assert.equal(quote.getAttribute('aria-current'),'page');
 assert.ok(quote.classList.contains('is-selected'));
 assert.equal(nav.dataset.active,'quote');
 assert.equal(nav.style.getPropertyValue('--dock-columns'),'1fr 1fr 2.3fr 1fr 1fr');
 assert.equal(quote.getAttribute('aria-label'),'Orçar atendimento');
 assert.equal(quote.href,'https://fineform.test/atendimento/#conteudo');
 assert.equal(nav.querySelectorAll('.ff-dock-link[aria-current]').length,1);
 window.close();
});
