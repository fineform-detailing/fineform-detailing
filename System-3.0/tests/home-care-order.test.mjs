import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('homepage places Fine Form Care after introduction and before Essential Wash services', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const document = new JSDOM(html).window.document;
  const main = document.querySelector('main#conteudo');
  assert.ok(main, 'main homepage content is present');
  const sections = [...main.children].filter(el => el.tagName === 'SECTION');
  const order = sections.map(el => el.id || [...el.classList].join(' '));
  const intro = sections.findIndex(el => el.classList.contains('ff-hero'));
  const manifesto = sections.findIndex(el => el.classList.contains('manifesto'));
  const care = sections.findIndex(el => el.id === 'care');
  const services = sections.findIndex(el => el.id === 'cuidados');
  assert.ok(intro >= 0 && manifesto > intro && care > manifesto && services > care, order.join(' > '));
  assert.equal(services, care + 1, 'Care subscriptions immediately precede the washing/service catalog');
  assert.equal(main.querySelectorAll('#care').length, 1);
  assert.ok(main.querySelector('#care #plan-grid'), 'subscription card mounting point preserved');
  assert.ok(main.querySelector('#cuidados #service-menu'), 'service cards mounting point preserved');
  assert.ok(document.querySelector('header.site-header[data-header]'), 'original header preserved');
  assert.ok(document.querySelector('#ff-intro'), 'intro loader preserved');
  assert.ok(document.querySelector('[data-footer]'), 'footer preserved');
});
