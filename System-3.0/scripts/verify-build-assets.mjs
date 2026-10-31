import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';

const html=await readFile('dist/index.html','utf8');
for(const file of ['hero-detail-wash.jpg','hero-detail-wash-mobile.jpg']){
 const location='dist/assets/'+file;
 const s=await stat(location);
 assert.ok(s.size>1500&&s.size<6000000,file+': arquivo ausente ou tamanho inesperado');
 const bytes=await readFile(location);
 assert.equal(bytes[0],0xff,file+': marcador JPEG inicial');
 assert.equal(bytes[1],0xd8,file+': marcador JPEG inicial');
 assert.ok(html.includes('assets/'+file),file+': não referenciado pela capa');
}
assert.ok(html.includes('rel="preload" as="image" href="assets/hero-detail-wash.jpg"'));
assert.ok(html.includes('alt="Detalhe de lavagem manual'));
const credits=await readFile('dist/creditos/index.html','utf8');
assert.ok(credits.includes('Kaboompics')&&credits.includes('pexels.com'));
const headers=await readFile('dist/_headers','utf8');
assert.ok(headers.includes("script-src 'self'"));
console.log('Fine Form: imagem, responsividade, créditos e CSP conferidos.');
