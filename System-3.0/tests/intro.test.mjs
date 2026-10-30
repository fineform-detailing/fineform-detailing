import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { INTRO, introMode } from '../src/intro/config.mjs';
import { createIntroController } from '../src/intro/controller.mjs';
import { tentacleGeometry, fitTentacle } from '../src/intro/tentacle-layout.mjs';

const origin = 'https://fine-form.test';
const fast = { readinessDeadline: 8, reachDuration: 0, gripDuration: 0, pullDuration: 0, activeDeadline: 150 };
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

test('abertura é exclusiva da home, uma vez por sessão, sem bloquear outras abas', () => {
  const base = { location: new URL(origin + '/'), reduced: false, paused: false, seen: null, navigationType: 'navigate', saveData: false };
  assert.equal(introMode(base), 'first');
  assert.equal(introMode({ ...base, location: new URL(origin + '/index.html') }), 'first');
  for (const override of [{ reduced: true }, { paused: true }, { seen: '1' }, { saveData: true }, { navigationType: 'back_forward' }, { location: new URL(origin + '/#cuidados') }, ...['/atendimento/', '/links/', '/painel/', '/acompanhar/', '/assinatura/', '/avaliar/', '/api/quotes'].map(path => ({ location: new URL(origin + path) }))]) {
    assert.equal(introMode({ ...base, ...override }), null, JSON.stringify(override));
  }
});

function pointer(f, type, x, extra = {}) {
  const event = new f.window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, clientX: x, button: 0, isPrimary: true, ...extra });
  f.document.querySelector('[data-intro-handle]').dispatchEvent(event);
}
function track(f) {
  Object.defineProperty(f.document.querySelector('[data-intro-slider]'), 'clientWidth', { value: 340 });
  Object.defineProperty(f.document.querySelector('[data-intro-handle]'), 'offsetWidth', { value: 240 });
}
function enter(f) { f.document.querySelector('[data-intro-handle]').click(); }

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

test('a abertura aguarda o gesto, sem avançar sozinha depois do antigo prazo', async () => {
  const f = fixture({ timing: { ...fast, activeDeadline: 10 } });
  try {
    f.controller.open();
    await pause(35);
    assert.equal(f.controller.active, true);
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
    assert.equal(f.animations.length, 0);
  } finally { f.close(); }
});

test('arraste parcial acompanha o dedo, volta ao soltar e não entra pelo clique sintético', async () => {
  const f = fixture();track(f);
  try {
    f.controller.open();
    pointer(f, 'pointerdown', 100);
    pointer(f, 'pointermove', 144);
    await pause(22);
    assert.equal(f.document.querySelector('[data-intro-handle]').style.transform, 'translate3d(44px,0,0)');
    assert.equal(f.document.querySelector('[data-intro-fill]').style.transform, 'scaleX(0.5)');
    pointer(f, 'pointerup', 144);
    f.document.querySelector('[data-intro-handle]').dispatchEvent(new f.window.MouseEvent('click', { detail: 1, bubbles: true }));
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
    assert.equal(f.document.querySelector('[data-intro-handle]').style.transform, 'translate3d(0px,0,0)');
    assert.equal(f.animations.length, 0);
  } finally { f.close(); }
});

test('arraste completo dispara uma só transição, mesmo com movimentos e clique extras', async () => {
  const f = fixture();track(f);
  try {
    let completed = 0;f.document.addEventListener('ff:intro-complete', () => completed++);
    const promise = f.controller.open();
    pointer(f, 'pointerdown', 100);
    pointer(f, 'pointermove', 180);
    pointer(f, 'pointerup', 188);
    enter(f);
    assert.equal((await promise).reason, 'complete');
    assert.equal(completed, 1);
    assert.equal(f.animations.filter(a => a.phase === 'revealing').length, 1);
    assert.equal(f.document.querySelector('[data-intro-handle]').style.transform, '');
  } finally { f.close(); }
});

test('cancelamento, perda de captura e mudança de orientação desfazem o gesto sem prender a tela', async () => {
  for (const event of ['pointercancel', 'lostpointercapture', 'resize']) {
    const f = fixture();track(f);
    try {
      f.controller.open();pointer(f, 'pointerdown', 100);pointer(f, 'pointermove', 120);
      if (event === 'resize') f.window.dispatchEvent(new f.window.Event('resize'));
      else pointer(f, event, 120);
      await pause(20);
      assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
      assert.equal(f.document.querySelector('[data-intro-fill]').style.transform, 'scaleX(0)');
      pointer(f, 'pointermove', 188);
      assert.equal(f.animations.length, 0);
    } finally { f.close(); }
  }
});

test('segundo dedo e botão direito não sequestram o gesto principal', async () => {
  const f = fixture();track(f);
  try {
    f.controller.open();
    pointer(f, 'pointerdown', 100, { button: 2 });
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
    pointer(f, 'pointerdown', 100);
    pointer(f, 'pointerdown', 200, { pointerId: 2, isPrimary: false });
    pointer(f, 'pointermove', 288, { pointerId: 2, isPrimary: false });
    pointer(f, 'pointerup', 288, { pointerId: 2, isPrimary: false });
    assert.equal(f.animations.length, 0);
    pointer(f, 'pointercancel', 100);
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
  } finally { f.close(); }
});

test('tentáculo alcança, agarra e puxa a folha; a conclusão devolve o conteúdo e cancela todos os efeitos', async () => {
  const f = fixture();
  try {
    const promise = f.controller.open();
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), true);
    assert.equal(f.document.getElementById('ff-intro').hidden, false);
    enter(f);
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
    try { const opening = f.controller.open();enter(f);assert.equal((await opening).reason, 'complete'); }
    finally { f.close(); }
  }
});

test('uma animação travada é encerrada pelo prazo máximo sem deixar a página inerte', async () => {
  const f = fixture({ hanging: true, timing: { ...fast, activeDeadline: 25 } });
  try {
    const opening = f.controller.open();enter(f);
    assert.equal((await opening).reason, 'timeout');
    assert.equal(f.controller.active, false);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
    assert.ok(f.animations.every(a => a.cancelled));
  } finally { f.close(); }
});

test('entrada direta e Escape resolvem uma vez; Tab circula entre os dois controles', async () => {
  const f = fixture({ ready: () => new Promise(() => {}), timing: { ...fast, readinessDeadline: 100 } });
  try {
    const first = f.controller.open();
    assert.equal(f.controller.open(), first);
    f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    assert.equal(f.document.activeElement, f.document.querySelector('[data-intro-handle]'));
    f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    assert.equal(f.document.activeElement, f.document.querySelector('[data-intro-skip]'));
    f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }));
    assert.equal(f.document.activeElement, f.document.querySelector('[data-intro-handle]'));
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
    const opening = f.controller.open();enter(f);await opening;
    assert.equal(f.document.activeElement, focus);
    assert.equal(header.hasAttribute('inert'), true);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { f.close(); }
});

test('histórico interrompe uma puxada em curso e devolve a página sem eventos tardios', async () => {
  const f = fixture({ hanging: true });
  try {
    const opening = f.controller.open();enter(f);f.controller.cancel('pagehide');
    assert.equal((await opening).reason, 'pagehide');
    await pause(10);
    assert.equal(f.controller.active, false);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
    assert.ok(f.animations.every(a => a.cancelled));
  } finally { f.close(); }
});

test('bootstrap sem módulo principal libera a página sozinho e não depende de script inline', async () => {
  const source = await build({ entryPoints: ['src/intro/boot.mjs'], bundle: true, format: 'iife', write: false });
  const f = fixture();
  try {
    f.window.performance.getEntriesByType = () => [{ type: 'navigate' }];
    const originalTimeout = f.window.setTimeout.bind(f.window);
    f.window.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms === INTRO.bootDeadline ? 12 : ms, ...args);
    f.window.eval(source.outputFiles[0].text);
    assert.equal(f.document.documentElement.dataset.ffIntro, 'ready');
    await pause(25);
    assert.equal(f.document.documentElement.hasAttribute('data-ff-intro'), false);
    assert.equal(f.document.querySelector('main').hasAttribute('inert'), false);
  } finally { f.close(); }
});

test('somente a home recebe a abertura; as demais páginas não carregam o loader', async () => {
  for (const file of ['dist/index.html']) {
    const html = await readFile(file, 'utf8'), dom = new JSDOM(html);
    try {
      assert.equal(dom.window.document.querySelectorAll('#ff-intro').length, 1);
      assert.equal(dom.window.document.querySelectorAll('script[src="/assets/intro-boot.js"]').length, 1);
      assert.equal(dom.window.document.getElementById('ff-intro').hidden, true);
      assert.ok(dom.window.document.querySelector('.intro-arm-tip'));
      assert.ok(dom.window.document.getElementById('conteudo'));
    } finally { dom.window.close(); }
  }
  for (const page of ['atendimento', 'links', 'painel', 'acompanhar', 'assinatura', 'avaliar']) assert.ok(!(await readFile('dist/' + page + '/index.html', 'utf8')).includes('intro-boot.js'));
});
