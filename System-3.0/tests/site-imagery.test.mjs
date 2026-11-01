import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const assets=['home','facade','studio','polish','wheels','interior'];
test('seis fotos Fine Form e variantes mobile existem como WebP, sem referência externa',async()=>{
 for(const name of assets){
  for(const suffix of ['','-mobile']){
   const file='dist/assets/fineform-'+name+suffix+'.webp';
   const data=await readFile(file);
   assert.equal(data.toString('ascii',0,4),'RIFF',file);
   assert.equal(data.toString('ascii',8,12),'WEBP',file);
   assert.ok(data.length>10000&&data.length<210000,file+' otimizado');
  }
 }
});
test('capa, fotos do Care e explorador usam todas as imagens fornecidas',async()=>{
 const html=await readFile('dist/index.html','utf8');
 const care=await readFile('dist/assets/care-plans.mjs','utf8');
 const motion=await readFile('dist/assets/studio-motion.mjs','utf8');
 const doc=new JSDOM(html).window.document;
 const cover=doc.querySelector('.hero-image picture');
 assert.ok(cover);
 assert.equal(cover.querySelector('img')?.getAttribute('src'),'assets/fineform-home.webp');
 assert.equal(cover.querySelector('source')?.getAttribute('srcset'),'assets/fineform-home-mobile.webp');
 for(const n of ['studio','facade','wheels'])assert.ok(care.includes('fineform-'+n+'.webp'));
 for(const n of ['polish','interior','wheels'])assert.ok(motion.includes('fineform-'+n+'.webp'));
 assert.ok(motion.includes('area=rodas'));
 assert.ok(![html,care,motion].some(s=>/modern-(?:gt3|mclaren|interior|ducati)|hero-fineform-original/.test(s)));
});
test('créditos reconhecem origem fornecida e não atribuem fotos removidas a terceiros',async()=>{
 const html=await readFile('dist/creditos/index.html','utf8');
 const app=await readFile('dist/assets/app.mjs','utf8');
 const doc=new JSDOM(html).window.document;
 assert.match(doc.querySelector('article.legal-content').textContent,/seis imagens/i);
 assert.match(doc.querySelector('article.legal-content').textContent,/fornecid[ao]s? pela administração/i);
 assert.ok(!/unsplash\.com|Porsche GT3:|McLaren:|Ducati Panigale:/.test(html));
 assert.ok(!app.includes('unsplash.com/photos/'));
});
