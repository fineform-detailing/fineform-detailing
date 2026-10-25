import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { INTRO, introMode, pendingMatches, transitionDestination } from '../src/intro/config.mjs';
import { createIntroController } from '../src/intro/controller.mjs';
import { installIntroNavigation } from '../src/intro/navigation.mjs';
import { tentacleGeometry, fitTentacle } from '../src/intro/tentacle-layout.mjs';

const origin = 'https://fine-form.test';
const fast = { minimumLoading: 0, readinessDeadline: 8, reachDuration: 0, gripDuration: 0, pullDuration: 0, coverDuration: 0, activeDeadline: 150 };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const [template, drawing] = await Promise.all([
  readFile('src/intro/shell.html', 'utf8'), readFile('src/intro/tentacle.svg', 'utf8'),
]);
const shell = template.replace('{{TENTACLE_SVG}}', drawing);

function fixture({ hanging = false, url = origin + '/', timing = fast, ready = () => Promise.resolve() } = {}) {
  const dom = new JSDOM('<!doctype html><html><body>' + shell + '<a class="skip-link" href="#conteudo">Ir</a><header>Fine Form</header><main id="conteudo"><button id="original">Conteúdo</button><a id="next" href="/atendimento/?service=premium"><span>Continuar</span></a><a id="private" href="/acompanhar/?id=private#t=secret">Pedido</a></main><footer><div class="footer-utilities"></div></footer></body></html>', {
    url, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const window = dom.window, animations = [];
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.Element.prototype.animate = function(keyframes, options) {
    let reject;
    const animation = {
      phase: window.document.documentElement.dataset.ffIntro,
      element: this, keyframes, options, cancelled: false,
      finished: hanging ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve(),
      cancel() { this.cancelled = true; reject?.(Error('cancelled')); },
    };
    animations.push(animation);
    return animation;
  };
  const controller = createIntroController(window, { timing, ready });
  return { window, document: window.document, controller, animations, close() { controller.destroy(); window.close(); } };
}

test('abertura respeita sessão, movimento reduzido, histórico, links profundos e páginas privadas', () => {
  const base = { location: new URL(origin + '/'), reduced: false, paused: false, seen: null, pending: null, navigationType: 'navigate', saveData: false };
  assert.equal(introMode(base), 'first');
  for (const override of [{ reduced: true }, { paused: true }, { seen: '1' }, { saveData: true }, { navigationType: 'back_forward' }, { location: new URL(origin + '/#cuidados') }, ...['/painel/', '/acompanhar/', '/assinatura/', '/avaliar/', '/api/quotes'].map(path => ({ location: new URL(origin + path) }))]) {
    assert.equal(introMode({ ...base, ...override }), null, JSON.stringify(override));
  }
  const pending = JSON.stringify({ destination: '/atendimento/?service=premium', createdAt: Date.now() });
  assert.equal(introMode({ ...base, seen: '1', pending, location: new URL(origin + '/atendimento/?service=premium') }), 'arrival');
});

test('passagem entre páginas só aceita a rota pública exata e um prazo curto', () => {
  const location = new URL(origin + '/atendimento/?service=premium'), now = Date.now();
  const pending = fields => JSON.stringify({ destination: '/atendimento/?service=premium', createdAt: now, ...fields });
  assert.equal(pendingMatches(pending(), location, now), true);
  for (const value of ['invalid', 'x'.repeat(2049), pending({ destination: '/atendimento/?service=essential' }), pending({ destination: '/painel/' }), pending({ createdAt: now + 1 }), pending({ createdAt: now - INTRO.navigationExpiry })]) assert.equal(pendingMatches(value, location, now), false);
});

test('a curva mantém a proporção no celular e desktop; apenas o comprimento do braço muda', () => {
  for (const dimensions of [{ width: 484, height: 312, left: -46.8, viewportWidth: 390 }, { width: 1786, height: 333, left: -172.8, viewportWidth: 1440 }, { width: 3968, height: 400, left: -384, viewportWidth: 3200 }]) {
    const geometry = tentacleGeometry(dimensions);
    const scaleX = dimensions.width / geometry.viewBox[2], scaleY = dimensions.height / geometry.viewBox[3];
    assert.ok(Math.abs(scaleX - scaleY) < .0001);
    const curlPosition = dimensions.left + (115 - geometry.viewBox[0]) * scaleX;
    assert.ok(Math.abs(curlPosition - dimensions.viewportWidth * .035) < .01);
    assert.ok(geometry.cups.length <= 22);
    const f = fixture();
    try {
      const svg = f.document.querySelector('.intro-tentacle-art');fitTentacle(svg, dimensions);
      assert.equal(svg.querySelector('[data-intro-tail-cups]').children.length, geometry.cups.length);
      assert.ok(!svg.outerHTML.includes('NaN'));
    } finally { f.close(); }
  }
});

test('gestos modificados, downloads, contatos externos e links privados preservam a navegação normal', () => {
  const f = fixture();
  try {
    const anchor = f.document.getElementById('next');
    const event = fields => ({ button: 0, target: anchor.querySelector('span'), defaultPrevented: false, ...fields });
    assert.equal(transitionDestination(event(), f.window.location).href, origin + '/atendimento/?service=premium');
    for (const fields of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }, { target: f.document.getElementById('private') }]) assert.equal(transitionDestination(event(fields), f.window.location), null);
    for (const href of ['#cuidados', '/#care', 'https://example.com/', 'mailto:fineformcare@gmail.com', '/assinatura/', '/avaliar/']) { anchor.href = href; assert.equal(transitionDestination(event(), f.window.location), null); }
    anchor.href = '/atendimento/';anchor.target = '_blank';assert.equal(transitionDestination(event(), f.window.location), null);
    anchor.target = '';anchor.setAttribute('download', 'file');assert.equal(transitionDestination(event(), f.window.location), null);
  } finally { f.close(); }
});

test('tentáculo alcança, agarra e puxa a folha; a conclusão devolve o conteúdo e cancela todos os efeitos', async () => {
  const f = fixture();
  try {
    const promise = f.controller.open();
    assert.equal(f.document.documentElement.dataset.ffIntro, 'loading');
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), true);
    assert.equal(f.document.getElementById('ff-intro').hidden, false);
    const result = await promise;
    assert.equal(result.reason, 'complete');
    assert.ok(f.animations.some(a => a.phase === 'reaching' && a.element.classList.contains('intro-arm-tip')));
    assert.ok(f.animations.some(a => a.phase === 'gripping'));
    assert.ok(f.animations.some(a => a.phase === 'revealing' && a.element.classList.contains('intro-sheet')));
    assert.ok(f.animations.every(a => a.cancelled));
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
    assert.equal(f.document.documentElement.hasAttribute('data-ff-intro'), false);
    assert.equal(f.document.getElementById('ff-intro').hidden, true);
    assert.equal(f.window.sessionStorage.getItem(INTRO.seenKey), '1');
  } finally { f.close(); }
});

test('imagem ou fonte lenta não impede a revelação e uma falha de recurso não vira espera infinita', async () => {
  for (const ready of [() => new Promise(() => {}), () => Promise.reject(Error('image failed'))]) {
    const f = fixture({ ready });
    try { assert.equal((await f.controller.open()).reason, 'complete'); }
    finally { f.close(); }
  }
});

test('uma animação travada é encerrada pelo prazo máximo sem deixar a página inerte', async () => {
  const f = fixture({ hanging: true, timing: { ...fast, activeDeadline: 25 } });
  try {
    assert.equal((await f.controller.open()).reason, 'timeout');
    assert.equal(f.controller.active, false);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
    assert.ok(f.animations.every(a => a.cancelled));
  } finally { f.close(); }
});

test('pular e Escape resolvem a abertura uma só vez, e Tab permanece no controle de pular', async () => {
  const f = fixture({ ready: () => new Promise(() => {}), timing: { ...fast, readinessDeadline: 100 } });
  try {
    const first = f.controller.open();
    assert.equal(f.controller.open(), first);
    f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    assert.equal(f.document.activeElement, f.document.querySelector('[data-intro-skip]'));
    f.document.querySelector('[data-intro-skip]').click();
    assert.equal((await first).reason, 'skipped');
    const second = f.controller.open('replay');
    f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    assert.equal((await second).reason, 'skipped');
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { f.close(); }
});

test('restaura foco e inércia anterior mesmo quando o armazenamento do navegador está bloqueado', async () => {
  const f = fixture();
  try {
    const focus = f.document.getElementById('original');focus.focus();
    const header = f.document.querySelector('header');header.setAttribute('inert', '');
    Object.defineProperty(f.window, 'sessionStorage', { get() { throw Error('disabled'); } });
    await f.controller.open();
    assert.equal(f.document.activeElement, focus);
    assert.equal(header.hasAttribute('inert'), true);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { f.close(); }
});

test('navegação pública usa uma única passagem e conserva rota e parâmetros sem reescrever a página', async () => {
  const f = fixture(), destinations = [];
  const remove = installIntroNavigation(f.window, f.controller, () => true, url => destinations.push(url));
  try {
    f.document.getElementById('next').click();
    await pause(15);
    assert.deepEqual(destinations, [origin + '/atendimento/?service=premium']);
    const pending = JSON.parse(f.window.sessionStorage.getItem(INTRO.pendingKey));
    assert.equal(pending.destination, '/atendimento/?service=premium');
    f.controller.cancel('pagehide');
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { remove(); f.close(); }
});

test('saída pelo histórico durante a transição cancela uma navegação que ainda não começou', async () => {
  const f = fixture({ hanging: true }), destinations = [];
  const remove = installIntroNavigation(f.window, f.controller, () => true, url => destinations.push(url));
  try {
    f.document.getElementById('next').click();f.controller.cancel('pagehide');await pause(5);
    assert.deepEqual(destinations, []);
    assert.equal(f.window.sessionStorage.getItem(INTRO.pendingKey), null);
  } finally { remove(); f.close(); }
});

test('bootstrap sem módulo principal libera a página sozinho e não depende de script inline', async () => {
  const source = await build({ entryPoints: ['src/intro/boot.mjs'], bundle: true, format: 'iife', write: false });
  const f = fixture();
  try {
    f.window.performance.getEntriesByType = () => [{ type: 'navigate' }];
    const originalTimeout = f.window.setTimeout.bind(f.window);
    f.window.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms === INTRO.bootDeadline ? 12 : ms, ...args);
    f.window.eval(source.outputFiles[0].text);
    assert.equal(f.document.documentElement.dataset.ffIntro, 'loading');
    await pause(25);
    assert.equal(f.document.documentElement.hasAttribute('data-ff-intro'), false);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { f.close(); }
});

test('páginas públicas recebem uma única abertura e áreas privadas permanecem fora da coreografia', async () => {
  for (const file of ['dist/index.html', 'dist/atendimento/index.html', 'dist/links/index.html']) {
    const html = await readFile(file, 'utf8'), dom = new JSDOM(html);
    try {
      assert.equal(dom.window.document.querySelectorAll('#ff-intro').length, 1);
      assert.equal(dom.window.document.querySelectorAll('script[src="/assets/intro-boot.js"]').length, 1);
      assert.equal(dom.window.document.getElementById('ff-intro').hidden, true);
      assert.ok(dom.window.document.querySelector('.intro-arm-tip'));
      assert.ok(dom.window.document.getElementById('conteudo'));
    } finally { dom.window.close(); }
  }
  for (const page of ['painel', 'acompanhar', 'assinatura', 'avaliar']) assert.ok(!(await readFile('dist/' + page + '/index.html', 'utf8')).includes('intro-boot.js'));
});
