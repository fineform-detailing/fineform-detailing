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


test('durante a rolagem o dock só desaparece por opacidade e volta inteiro', async () => {
 const {window,nav}=setup('home');
 Object.defineProperty(window,'scrollY',{configurable:true,writable:true,value:0});
 assert.equal(nav.querySelectorAll('.ff-dock-link').length,5);
 assert.equal(nav.querySelector('.ff-dock-compact'),null,'botão circular removido');
 assert.equal(nav.classList.contains('ff-dock-scroll-hidden'),false);
 window.scrollY=120;window.dispatchEvent(new window.Event('scroll'));
 assert.ok(nav.classList.contains('ff-dock-scroll-hidden'));
 assert.ok(!nav.classList.contains('ff-dock-collapsed'),'barra nunca encolhe');
 assert.equal(nav.querySelector('.ff-dock-link').tabIndex,-1);
 await new Promise(resolve=>window.setTimeout(resolve,100));
 window.scrollY=250;window.dispatchEvent(new window.Event('scroll'));
 await new Promise(resolve=>window.setTimeout(resolve,160));
 assert.ok(nav.classList.contains('ff-dock-scroll-hidden'),'ainda rolando');
 await new Promise(resolve=>window.setTimeout(resolve,165));
 assert.equal(nav.classList.contains('ff-dock-scroll-hidden'),false,'reaparece ao parar');
 assert.equal(nav.querySelectorAll('.ff-dock-link').length,5);
 assert.equal(nav.querySelector('.ff-dock-link').tabIndex,0);
 window.close();
});
test('fade não altera dimensões nem acabamento Liquid Glass', () => {
 const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 assert.match(css,/\.ff-dock\.ff-dock-scroll-hidden\s*\{/);
 const fade=css.slice(css.indexOf('/* Fade discreto da barra inteira'));
 assert.match(fade,/opacity:0/);
 assert.match(fade,/visibility:hidden/);
 assert.match(fade,/transition:opacity \.26s ease,visibility \.26s ease/);
 assert.ok(!fade.includes('width:56px'),'nenhum tamanho compacto');
 assert.ok(!css.includes('ff-dock-collapsed'),'classe de encolhimento removida');
 assert.ok(!css.includes('ff-dock-compact'),'botão circular removido');
 assert.match(css,/Refinamento: mesmo acabamento do header/);
 assert.match(css,/backdrop-filter:blur\(24px\) saturate\(175%\)/);
});
test('tocar no segundo botão ativa Cuidados com animação imediatamente', () => {
 const {window,nav}=setup('home');
 const second=nav.querySelector('[data-dock="care"]');
 assert.ok(second);
 second.click();
 assert.equal(nav.dataset.active,'care');
 assert.equal(second.getAttribute('aria-current'),'location');
 assert.ok(second.classList.contains('is-selected'));
 assert.equal(nav.style.getPropertyValue('--dock-columns'),'1fr 2.3fr 1fr 1fr 1fr');
 assert.equal(nav.querySelectorAll('[aria-current]').length,1);
 window.close();
});
test('Cuidados recebe destaque mesmo quando a seção Care aparece antes no documento', () => {
 const {window,nav,scrollTo}=setup('home');
 window.document.querySelector('#care').getBoundingClientRect=()=>({top:200-1000,bottom:600-1000});
 window.document.querySelector('#cuidados').getBoundingClientRect=()=>({top:900-1000,bottom:1800-1000});
 scrollTo(1000);
 assert.equal(nav.dataset.active,'care');
 assert.equal(nav.querySelector('[aria-current]').dataset.dock,'care');
 window.close();
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
