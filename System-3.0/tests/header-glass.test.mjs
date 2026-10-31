import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountHeaderGlass} from '../dist/assets/header-glass.mjs';
const css=readFileSync(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/assets/app.mjs',import.meta.url),'utf8');
test('header só adquire vidro ao rolar e volta ao transparente no início',()=>{
 const dom=new JSDOM('<!doctype html><header class="site-header" data-header></header>',{url:'https://fineform.test/'});
 const win=dom.window,header=win.document.querySelector('header');
 Object.defineProperty(win,'scrollY',{configurable:true,writable:true,value:0});
 const cleanup=mountHeaderGlass(header,{win,threshold:24});
 assert.equal(header.classList.contains('is-scrolled'),false);
 win.scrollY=25;win.dispatchEvent(new win.Event('scroll'));
 assert.equal(header.classList.contains('is-scrolled'),true);
 win.scrollY=12;win.dispatchEvent(new win.Event('scroll'));
 assert.equal(header.classList.contains('is-scrolled'),false);
 win.scrollY=150;win.dispatchEvent(new win.Event('pageshow'));
 assert.equal(header.classList.contains('is-scrolled'),true);
 cleanup();win.scrollY=0;win.dispatchEvent(new win.Event('scroll'));
 assert.equal(header.classList.contains('is-scrolled'),true,'cleanup não deixa ouvintes ativos');
 dom.window.close();
});
test('estilo frosted glass preserva marca e menu, com ajuste mobile e texto mais alto',()=>{
 assert.match(app,/mountHeaderGlass\(header\)/);
 assert.match(css,/\.site-header\.is-scrolled\{/);
 assert.match(css,/position:fixed;top:10px/);
 assert.match(css,/backdrop-filter:blur\(24px\) saturate\(175%\)/);
 assert.match(css,/\.ff-hero \.hero-content\{\s*position:relative;top:-24px/);
 assert.match(css,/top:-12px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('loader não foi removido e suas regras mantêm logo isolada',()=>{
 const intro=readFileSync(new URL('../src/intro/intro.css',import.meta.url),'utf8');
 assert.match(intro,/somente o simbolo transparente e transicao dissolve/);
});
