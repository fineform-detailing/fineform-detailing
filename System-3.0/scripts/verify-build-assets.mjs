import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const photo = 'fineform-home.webp';
const image = await readFile('dist/assets/' + photo);
const size = await stat('dist/assets/' + photo);
assert.ok(size.size > 2000 && size.size < 6_000_000, 'imagem da capa precisa existir localmente');
assert.equal(image.toString('ascii', 0, 4), 'RIFF', 'cabeçalho RIFF');
assert.equal(image.toString('ascii', 8, 12), 'WEBP', 'imagem precisa ser WebP');
assert.ok(html.includes('src="assets/' + photo + '"'), 'capa precisa usar o material fornecido para Fine Form');
assert.ok(html.includes('rel="preload" as="image" href="assets/' + photo + '"'), 'preload da capa');
for(const name of ['fineform-home','fineform-facade','fineform-studio','fineform-polish','fineform-wheels','fineform-interior']){
 for(const suffix of ['','-mobile']){
  const bytes=await readFile('dist/assets/'+name+suffix+'.webp');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
}
assert.ok(html.includes('class="velocity-band"'), 'animação editorial preservada');
assert.ok(html.includes('id="react-velocity"'), 'ponto de montagem da animação presente');
assert.ok(!html.includes('class="ff-section manifesto"'), 'trecho e linha do manifesto removidos');
assert.ok(!html.includes('hero-photo-note'), 'a foto não deve ter legenda');
const headers = await readFile('dist/_headers', 'utf8');
assert.ok(headers.includes("script-src 'self'"));
console.log('Fine Form: imagens fornecidas localmente, título limpo e CSP conferidos.');
