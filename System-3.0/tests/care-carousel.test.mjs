import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountCarePlans} from '../dist/assets/care-plans.mjs';

const plans = [
  {id:'careEssential',name:'Care Essencial',vehicle:'car',visits:2,price:260,saving:20,description:'Uma Premium + uma Essencial por mês.'},
  {id:'careFrequent',name:'Care Frequente',vehicle:'car',visits:4,price:440,saving:40,description:'Uma Premium + três Essenciais por mês.'},
  {id:'careMoto',name:'Care Moto',vehicle:'moto',visits:2,price:280,saving:20,description:'Duas lavagens Moto Premium por mês.'},
];

function mount() {
  const dom = new JSDOM('<div id="plans"></div>', {url:'https://fineform.test/', pretendToBeVisual:true});
  const previousDocument = globalThis.document, previousCustomEvent = globalThis.CustomEvent;
  globalThis.document = dom.window.document;
  globalThis.CustomEvent = dom.window.CustomEvent;
  const host = dom.window.document.getElementById('plans');
  const controller = mountCarePlans(host, {plans, money:amount => 'R$ '+amount, root:'./'});
  const restore = () => {
    dom.window.close();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  };
  return {dom,host,controller,restore};
}

test('Care shows three real, accessible portrait cards without hiding the neighbouring plan', () => {
  const {host,restore} = mount();
  try {
    const cards = [...host.querySelectorAll('.care-feature')];
    assert.equal(cards.length,3);
    assert.equal(cards.filter(card => card.hidden).length,0);
    assert.deepEqual(cards.map(card => card.dataset.plan), plans.map(plan => plan.id));
    assert.deepEqual(cards.map(card => card.dataset.active), ['true','false','false']);
    assert.equal(host.querySelectorAll('.care-feature img').length,3);
    assert.equal(host.querySelectorAll('.care-photo-arrow').length,3);
    const links = [...host.querySelectorAll('a.care-interest')];
    assert.equal(links.length,3);
    assert.ok(links.every(link => link.href.includes('atendimento/?plan=')));
    assert.match(links[2].href,/careMoto$/);
    assert.equal(host.querySelectorAll('[data-plan-index]').length,3);
  } finally {restore();}
});

test('Care next, previous, dots and keyboard update the real active card without autoplay', () => {
  const {host,controller,restore,dom} = mount();
  try {
    const current = () => host.querySelector('.care-feature[data-active="true"]')?.dataset.plan;
    const pressed = () => [...host.querySelectorAll('[data-plan-index]')].findIndex(button => button.getAttribute('aria-pressed') === 'true');
    assert.equal(current(),'careEssential');
    host.querySelector('[data-plan-step="1"]').click();
    assert.equal(current(),'careFrequent');
    assert.equal(pressed(),1);
    host.querySelector('[data-plan-index="2"]').click();
    assert.equal(current(),'careMoto');
    assert.equal(host.querySelector('.care-counter').textContent,'03 / 03');
    host.querySelector('[data-plan-step="1"]').click();
    assert.equal(current(),'careEssential'); // wrap without autoplay
    host.querySelector('.care-stage').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true}));
    assert.equal(current(),'careMoto');
    host.querySelector('[data-plan-step="-1"]').click();
    assert.equal(current(),'careFrequent');
    assert.match(host.querySelector('.care-status').textContent,/Care Frequente/);
    controller.select(0);
    assert.equal(current(),'careEssential');
    assert.equal(host.querySelector('.care-stage').getAttribute('aria-roledescription'),'carrossel');
  } finally {restore();}
});

test('Care stylesheet is linked after studio, and uses a genuine scroll-snap carousel', async () => {
  const [html, css] = await Promise.all([
    readFile(new URL('../dist/index.html',import.meta.url),'utf8'),
    readFile(new URL('../dist/assets/care-carousel.css',import.meta.url),'utf8'),
  ]);
  assert.match(html,/assets\/care-carousel\.css/);
  assert.ok(html.indexOf('assets/care-carousel.css') > html.indexOf('assets/studio.css'));
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/\.care-stage::before\{content:none!important;display:none!important\}/);
  assert.match(css,/--care-card-width:clamp\(245px,72vw,315px\)/);
});
