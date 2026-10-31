import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supportsRefractiveBackdrop,lensOffset,mountRefractiveSurface}
 from '../dist/assets/liquid-glass-optics.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('refração é restrita a Chromium, sem quebrar Safari, iOS e Firefox',()=>{
 assert.equal(supportsRefractiveBackdrop({userAgent:'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'}),true);
 assert.equal(supportsRefractiveBackdrop({userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'}),true);
 assert.equal(supportsRefractiveBackdrop({userAgent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15'}),false);
 assert.equal(supportsRefractiveBackdrop({userAgent:'Mozilla/5.0 (iPhone) CriOS/130.0.0.0 Mobile Safari/604.1'}),false);
 assert.equal(supportsRefractiveBackdrop({userAgent:'Mozilla/5.0 Firefox/128.0'}),false);
 assert.equal(supportsRefractiveBackdrop({userAgent:'',userAgentData:{brands:[{brand:'Chromium'}]}}),true);
 assert.equal(supportsRefractiveBackdrop(null),false);
});
test('campo óptico de dobra limita a refração à borda, sem deformar o centro',()=>{
 const center=lensOffset(.5,.5,420,80,40,390,800);
 const edge=lensOffset(.005,.25,420,80,40,390,800);
 assert.ok(Math.hypot(center.x,center.y)<1,'centro transparente');
 assert.ok(Math.hypot(edge.x,edge.y)>Math.hypot(center.x,center.y),'bordas refratam');
 assert.ok(Number.isFinite(edge.x)&&Number.isFinite(edge.y));
});
test('sem elemento ou sem motor compatível, mantém o fallback CSS',()=>{
 assert.equal(typeof mountRefractiveSurface(null), 'function');
});
test('integra header e barra, preservando navegação, loader e ocultação no scroll',()=>{
 const js=read('../dist/assets/app.mjs');
 const css=read('../dist/assets/studio.css');
 const dock=read('../dist/assets/floating-nav.mjs');
 const loader=read('../src/intro/intro.css');
 assert.match(js,/mountFineFormLiquidGlass\(header,document\.querySelector\('\.ff-dock'\)\)/);
 assert.match(css,/Liquid Glass optics/);
 assert.match(css,/\.site-header\.is-scrolled\.ff-optical-active/);
 assert.match(css,/\.ff-dock\.ff-dock-scrolling/);
 assert.match(dock,/240\)/);
 assert.match(loader,/somente o simbolo transparente e transicao dissolve/);
});
