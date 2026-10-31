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
 assert.match(css, /body\[data-design=kinetic\] \.ff-dock\{\s*background:rgba\(248,250,248,\.72\)/);
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

test('o dock desaparece durante scroll e volta após a rolagem parar', async () => {
 const {window,nav}=setup('home');
 Object.defineProperty(window,'scrollY',{configurable:true,writable:true,value:0});
 assert.equal(nav.classList.contains('ff-dock-scrolling'),false);
 window.scrollY=120;window.dispatchEvent(new window.Event('scroll'));
 assert.equal(nav.classList.contains('ff-dock-scrolling'),true);
 await new Promise(resolve=>window.setTimeout(resolve,125));
 window.scrollY=250;window.dispatchEvent(new window.Event('scroll'));
 assert.equal(nav.classList.contains('ff-dock-scrolling'),true);
 await new Promise(resolve=>window.setTimeout(resolve,145));
 assert.equal(nav.classList.contains('ff-dock-scrolling'),true,'a pausa entre eventos não deve antecipar retorno');
 await new Promise(resolve=>window.setTimeout(resolve,125));
 assert.equal(nav.classList.contains('ff-dock-scrolling'),false,'volta após 240ms sem scroll');
 const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 assert.match(css,/body\[data-design=kinetic\] \.ff-dock\.ff-dock-scrolling\{/);
 assert.match(css,/backdrop-filter:blur\(30px\) saturate\(205%\) contrast\(107%\)/);
 assert.match(css,/\.ff-dock::before\{/);
 assert.match(css,/\.ff-dock-primary \.ff-dock-icon\{/);
 window.close();
});
