import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('new compact header preserves accessible menu and Fine Form branding',()=>{
 const app=read('../dist/assets/app.mjs');
 assert.match(app,/class="ff-menu-side"/);
 assert.match(app,/aria-controls="main-nav"/);
 assert.match(app,/aria-expanded="false"/);
 assert.match(app,/logo-original\.png/);
 assert.match(app,/class="nav-links"/);
 assert.match(app,/ff-menu-quote/);
});
test('home offers navigation shortcuts and loads the new responsive visual system',()=>{
 const html=read('../dist/index.html'),css=read('../dist/assets/fineform-ui.css');
 assert.match(html,/class="ff-shortcuts-grid"/);
 assert.match(html,/assets\/fineform-ui\.css/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.service-list/);
});
test('intro has just the visible transparent symbol and a dissolve exit',()=>{
 const css=read('../src/intro/intro.css');
 assert.match(css,/\.intro-wordmark,\.ff-intro \.intro-subtitle/);
 assert.match(css,/\.ff-intro\.is-finishing \.intro-sheet/);
});
