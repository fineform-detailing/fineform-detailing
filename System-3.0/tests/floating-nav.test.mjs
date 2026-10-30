import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
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
