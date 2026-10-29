import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
const assets = {};
for (const name of await readdir('public')) {
  const data=await readFile(path.join('public',name));
  assets['/'+name]={body:data.toString('base64'),type:types[path.extname(name)]||'application/octet-stream'};
}
await mkdir('build',{recursive:true});
await writeFile('build/assets.mjs',`export const assets = ${JSON.stringify(assets)};\n`);
console.log(`Prepared ${Object.keys(assets).length} assets.`);
