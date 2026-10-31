import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const load = async path => readFile(new URL('../dist/' + path, import.meta.url), 'utf8');

test('intro is followed by Care, with original main content and restored header intact', async () => {
  const html = await load('index.html');
  const document = new JSDOM(html).window.document;
  const main = document.querySelector('main');
  const sections = [...main.children].filter(el => el.tagName === 'SECTION');
  assert.equal(sections[0].id, 'care');
  assert.ok(sections[1].classList.contains('ff-hero'));
  assert.ok(sections[2].classList.contains('manifesto'));
  assert.equal(main.querySelectorAll('#care').length, 1);
  assert.ok(document.querySelector('#ff-intro'));
  assert.ok(document.querySelector('header.site-header[data-header]'));
  assert.ok(document.querySelector('footer.site-footer'));
  assert.match(html, /assets\/fineform-premium\.css/);
  assert.doesNotMatch(html, /assets\/fineform-refinement\.css/);
});

test('premium header has a Fine Form mark and touch-accessible mobile menu, without heavy headings', async () => {
  const [base, css, app] = await Promise.all([
    load('assets/studio.css'), load('assets/fineform-premium.css'), load('assets/app.mjs'),
  ]);
  assert.doesNotMatch(base, /font-weight:900/);
  assert.match(css, /body\[data-page=home\] .site-header/);
  assert.match(css, /body\[data-page=home\] .ff-brand-symbol/);
  assert.match(css, /@media\(max-width:850px\)/);
  assert.match(css, /body\[data-page=home\] .ff-nav\.open\{display:flex\}/);
  assert.match(css, /font-weight:600;text-transform:none/);
  assert.match(app, /ff-brand-copy/);
  assert.match(app, /aria-expanded="false"/);
  assert.match(app, /ff-nav/);
});

test('motion is functional and honors reduced-motion settings', async () => {
  const [script, css, studio] = await Promise.all([
    load('assets/experience.mjs'), load('assets/fineform-premium.css'), load('assets/studio.css'),
  ]);
  assert.match(script, /let paused=false/);
  assert.match(script, /const enabled=\(\)=>!reduced\.matches&&!paused/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(studio, /main \*,\s*\nbody:not\(\[data-page="admin"\]\) main \*:before/);
});

test('reference Care cards retain real images, manual selector and high-performance native swipe', async () => {
  const [markup, css] = await Promise.all([load('assets/care-plans.mjs'), load('assets/fineform-premium.css')]);
  assert.match(markup, /data-plan-step/);
  assert.match(markup, /data-plan-index/);
  assert.match(markup, /atendimento\/\?plan=/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /--care-card-width:clamp\(248px,75vw,309px\)/);
  assert.match(css, /care-photo-arrow/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /font-weight:600;text-transform:none/);
});

test('the header is new, while the original site footer, legal links and dock remain untouched', async () => {
  const [app, legal, dock] = await Promise.all([
    load('assets/app.mjs'), load('assets/legal-footer.mjs'), load('assets/floating-nav.mjs'),
  ]);
  assert.match(app, /footer-strip/);
  assert.match(app, /footer-socials/);
  assert.match(app, /footer-bottom/);
  assert.doesNotMatch(app, /ff-editorial-footer/);
  assert.match(app, /socialContacts\(cfg\)\.map/);
  assert.match(app, /legalFooter/);
  assert.match(legal, /data-cookie-settings/);
  assert.match(dock, /mountFloatingNav/);
});

test('loader uses same vector wordmark with racing italic skew and no new font dependency', async () => {
  const [html, css] = await Promise.all([load('index.html'), load('assets/intro-loader.css')]);
  assert.match(html, /class="intro-wordmark-art"/);
  assert.match(css, /skewX\(-11deg\) scaleX\(\.92\)/);
  assert.match(css, /Racing-lettering treatment/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
