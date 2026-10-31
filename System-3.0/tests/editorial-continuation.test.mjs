import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../dist/' + path, import.meta.url), 'utf8');

test('homepage drops top legends, idle ticker and the rejected one-vehicle slogan', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /class="section-index"/);
  assert.doesNotMatch(html, /class="hero-assurance"/);
  assert.doesNotMatch(html, /class="velocity-band"/);
  assert.doesNotMatch(html, /um veículo por vez/i);
  assert.match(html, /id="plan-grid"/);
});

test('Care retains the working plan chooser and the new stacked-card styling', async () => {
  const [markup, css] = await Promise.all([read('assets/care-plans.mjs'), read('assets/studio.css')]);
  assert.match(markup, /data-plan-step/);
  assert.match(markup, /data-plan-index/);
  assert.match(markup, /atendimento\/\?plan=/);
  assert.match(css, /Fine Form editorial continuation/);
  assert.match(css, /\.care-stage:before/);
  assert.match(css, /\.care-feature\[hidden\]/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('public footer has no redundant motion toggle, while native dock links survive', async () => {
  const [app, motion, dock, css] = await Promise.all([
    read('assets/app.mjs'), read('assets/experience.mjs'),
    read('assets/floating-nav.mjs'), read('assets/studio.css'),
  ]);
  assert.doesNotMatch(app, /id="motion-toggle"/);
  assert.match(motion, /const enabled=\(\)=>!reduced\.matches&&!paused;/);
  assert.match(dock, /mountFloatingNav/);
  assert.match(css, /\.site-footer \.footer-bottom\{border-top:0!important\}/);
});
