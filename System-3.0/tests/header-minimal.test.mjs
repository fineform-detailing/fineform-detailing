import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('o header tem apenas logotipo sem fundo e menu com acessibilidade',()=>{
 const app=read('../dist/assets/app.mjs');
 const css=read('../dist/assets/studio.css');
 const logo=read('../dist/assets/logo-transparent.svg');
 assert.match(app,/class="brand ff-header-mark"/);
 assert.match(app,/logo-transparent\.svg/);
 assert.doesNotMatch(app,/class="brand-title">FINE FORM/);
 assert.match(app,/class="ff-header-menu"/);
 assert.match(app,/aria-expanded="false" aria-controls="main-nav"/);
 assert.match(css,/body\[data-design=kinetic\] \.site-header\{/);
 assert.match(css,/background:transparent;border:0;border-radius:0/);
 assert.match(css,/\.nav-links\.open\{display:flex\}/);
 assert.match(logo,/mask-type:luminance/);
});
test('loader aprovado segue intacto',()=>{
 const css=read('../src/intro/intro.css');
 assert.match(css,/somente o simbolo transparente e transicao dissolve/);
 assert.match(css,/\.intro-wordmark,\.ff-intro \.intro-subtitle/);
 const html=read('../dist/index.html');
 assert.match(html,/id="ff-intro"/);
});
