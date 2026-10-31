import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { INTRO, introMode } from '../src/intro/config.mjs';

const origin = 'https://fine-form.test';
const [shell, source] = await Promise.all([
  readFile('src/intro/shell.html', 'utf8'),
  readFile('src/intro/index.mjs', 'utf8'),
]);

test('a abertura é exclusiva da home, apenas uma vez por sessão', () => {
  const base = { location: new URL(origin + '/'), reduced: false, paused: false, seen: null, navigationType: 'navigate', saveData: false };
  assert.equal(introMode(base), 'first');
  assert.equal(introMode({ ...base, location: new URL(origin + '/index.html') }), 'first');
  for (const override of [{ reduced: true }, { paused: true }, { seen: '1' }, { saveData: true }, { navigationType: 'back_forward' }, { location: new URL(origin + '/#cuidados') }, ...['/atendimento/', '/links/', '/painel/', '/acompanhar/', '/assinatura/', '/avaliar/'].map(path => ({ location: new URL(origin + path) }))]) {
    assert.equal(introMode({ ...base, ...override }), null);
  }
});

test('Comet Dial substitui o gesto antigo e tem semântica de carregamento', () => {
  const dom = new JSDOM(shell);
  try {
    const doc = dom.window.document;
    assert.ok(doc.querySelector('[data-comet-dial][role="progressbar"]'));
    assert.equal(doc.querySelectorAll('[data-comet-trail]').length, 12);
    assert.ok(doc.querySelector('[data-comet-value]'));
    assert.ok(doc.querySelector('[data-intro-skip]'));
    assert.equal(doc.querySelector('[data-intro-slider]'), null);
    assert.equal(doc.querySelector('.intro-tentacle'), null);
    new Function(source);
  } finally { dom.window.close(); }
});

function fixture() {
  const dom = new JSDOM('<!doctype html><html data-ff-intro="ready"><body>' + shell + '<header>Fine Form</header><main id="conteudo"><button>Conteúdo</button></main><footer></footer></body></html>', {
    url: origin + '/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  dom.window.matchMedia = () => ({ matches: false });
  dom.window.eval(source);
  return dom;
}

test('entrada direta cancela o carregamento e libera a página', () => {
  const dom = fixture();
  try {
    const { document: doc } = dom.window;
    assert.equal(doc.querySelector('main').hasAttribute('inert'), true);
    assert.equal(doc.querySelectorAll('[data-comet-ticks] line').length, 61);
    doc.querySelector('[data-intro-skip]').click();
    assert.equal(doc.querySelector('main').hasAttribute('inert'), false);
    assert.equal(doc.documentElement.hasAttribute('data-ff-intro'), false);
    assert.equal(doc.getElementById('ff-intro').hidden, true);
    assert.equal(dom.window.sessionStorage.getItem(INTRO.seenKey), '1');
  } finally { dom.window.close(); }
});

test('tecla Escape sempre permite sair do loader', () => {
  const dom = fixture();
  try {
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(dom.window.document.getElementById('ff-intro').hidden, true);
  } finally { dom.window.close(); }
});

test('a home exibe uma nova imagem e não possui as legendas removidas', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const dom = new JSDOM(html);
  try {
    const doc = dom.window.document;
    assert.ok(doc.querySelector('#ff-intro [data-comet-dial]'));
    assert.equal(doc.querySelectorAll('.section-index').length, 0);
    assert.equal(doc.querySelector('.hero-secondary'), null);
    assert.equal(doc.querySelector('.hero-assurance'), null);
    assert.ok(doc.querySelector('.hero-image img').getAttribute('src').includes('modern-mclaren.webp'));
    assert.ok(doc.querySelector('link[rel="preload"][as="image"]').getAttribute('href').includes('modern-mclaren.webp'));
  } finally { dom.window.close(); }
  for (const page of ['atendimento', 'links', 'painel', 'acompanhar', 'assinatura', 'avaliar']) {
    assert.ok(!(await readFile('dist/' + page + '/index.html', 'utf8')).includes('intro-boot.js'));
  }
});

test('bootstrap e loader compilam para navegadores modernos', async () => {
  for (const file of ['src/intro/boot.mjs', 'src/intro/index.mjs']) {
    const bundle = await build({ entryPoints: [file], bundle: true, write: false, target: 'es2020' });
    assert.ok(bundle.outputFiles[0].text.length > 100);
  }
});
