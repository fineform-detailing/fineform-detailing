import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {services} from '../dist/assets/catalog.mjs';
import {filterCareCards,normalizeCareSearch} from '../dist/assets/discover.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../dist/index.html');
test('layout anterior preserva header e introducao',()=>{
 const doc=new JSDOM(html).window.document;
 assert.ok(doc.querySelector('.ff-discover.ff-hero h1'));
 assert.ok(doc.querySelector('form[role="search"] input[type="search"]'));
 assert.equal(doc.querySelectorAll('.ff-shortcuts-grid a img').length,4);
 assert.ok(doc.querySelector('.ff-featured-photo img'));
 assert.ok(doc.querySelector('#ff-highlight-grid'));
 assert.equal(doc.querySelectorAll('[data-ff-filter]').length,5);
 assert.ok(doc.querySelector('.ff-dock')===null,'nav e montada pelo modulo compartilhado');
});
test('busca normaliza acentos e filtra categorias sem mudar catalogo',()=>{
 assert.equal(normalizeCareSearch('  VITRIFICAÇÃO '),'vitrificacao');
 const data=[{id:'essential',group:'Lavagens',category:'wash',detail:'limpeza externa'},{id:'coating',group:'Proteção',category:'paint',detail:'proteção cerâmica'},{id:'motoPremium',group:'Motos',category:'moto',detail:'cuidado em duas rodas'}];
 assert.deepEqual(filterCareCards(data,'paint').map(x=>x.id),['coating']);
 assert.deepEqual(filterCareCards(data,'all','vitrificacao').map(x=>x.id),['coating']);
 assert.deepEqual(filterCareCards(data,'moto','lavagem').map(x=>x.id),['motoPremium']);
 assert.ok(services.find(x=>x.id==='essential')?.price===100);
});
test('identidade e navegação permanecem funcionais e loader aprovado nao muda',()=>{
 const app=read('../dist/assets/app.mjs'),css=read('../dist/assets/fineform-ui.css');
 assert.match(app,/class="ff-menu-side"/);
 assert.match(app,/aria-controls="main-nav"/);
 assert.match(app,/mountFloatingNav/);
 assert.match(css,/\.ff-product-grid/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.ff-dock/);
 assert.match(html,/id="ff-intro"/);
 assert.match(html,/assets\/intro-loader.mjs/);
});
