import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const load = async path => readFile(new URL('../dist/'+path,import.meta.url),'utf8');

test('intro is followed by Care cards, then the original hero and other sections', async () => {
 const html=await load('index.html');
 const doc=new JSDOM(html).window.document;
 const main=doc.querySelector('main');
 const sections=[...main.children].filter(el=>el.tagName==='SECTION');
 assert.equal(sections[0].id,'care');
 assert.ok(sections[1].classList.contains('ff-hero'));
 assert.ok(sections[2].classList.contains('manifesto'));
 assert.equal(main.querySelectorAll('#care').length,1);
 assert.ok(doc.querySelector('#ff-intro'));
 assert.equal(doc.querySelector('header.site-header'),null);
 assert.ok(doc.querySelector('footer.site-footer'));
 assert.match(html,/assets\/fineform-refinement\.css/);
});

test('homepage has no obsolete header spacing or overly bold title rules', async () => {
 const [base,refinement]=await Promise.all([load('assets/studio.css'),load('assets/fineform-refinement.css')]);
 assert.doesNotMatch(base,/font-weight:900/);
 assert.doesNotMatch(base,/main \*,\s*\nbody:not\(\[data-page="admin"\]\) main \*:before/);
 assert.match(refinement,/body\[data-page=home\]\{\s*padding-top:0/);
 assert.match(refinement,/font-weight:600;text-transform:none/);
 assert.match(refinement,/--care-card-width:clamp\(245px,74vw,292px\)/);
});

test('motion is enabled by default, respects reduced-motion preferences and stays optional', async () => {
 const [script,refinement] = await Promise.all([load('assets/experience.mjs'),load('assets/fineform-refinement.css')]);
 assert.match(script,/let paused=false/);
 assert.match(script,/const enabled=\(\)=>!reduced\.matches&&!paused/);
 assert.match(refinement,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(refinement,/main \*[\s\S]*animation:none!important/);
});

test('white footer preserves active navigation, real social links and legal settings', async () => {
 const [script,legal,css]=await Promise.all([load('assets/app.mjs'),load('assets/legal-footer.mjs'),load('assets/fineform-refinement.css')]);
 assert.match(script,/ff-editorial-footer/);
 assert.match(script,/Fine Form Care/);
 assert.match(script,/ff-footer-wordmark/);
 assert.match(script,/socialContacts\(cfg\)\.map/);
 assert.match(script,/legalFooter/);
 assert.match(legal,/data-cookie-settings/);
 assert.match(css,/\.ff-footer-meta \.footer-information-panel/);
 assert.match(css,/\.ff-footer-layout/);
 assert.match(css,/background:#f9faf7/);
});
