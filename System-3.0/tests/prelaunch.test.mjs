import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.mjs';

const base='https://fine-form.test';
const env={PRELAUNCH_MODE:'true',DB:{prepare(){throw Error('The inauguration gate must not access the database');}},ASSETS:{async fetch(req){return new Response('presentation asset',{headers:{'Content-Type':new URL(req.url).pathname.endsWith('.woff2')?'font/woff2':'image/webp'}});}}};
function request(path='/',init={}){const req=new Request(base+path,init);Object.defineProperty(req,'cf',{value:{country:'BR'},configurable:true});return req;}

test('prelaunch displays a complete page without JavaScript, forms or requests to the database',async()=>{
 const res=await worker.fetch(request(),env);
 assert.equal(res.status,200);
 const html=await res.text();
 assert.match(html,/Um novo/);assert.match(html,/inaugura/);assert.match(html,/fineform\.detailing/);
 assert.doesNotMatch(html,/<script|<form|api\/|href="\/painel/);
 assert.match(res.headers.get('Cache-Control'),/no-store/);
 assert.match(res.headers.get('X-Robots-Tag'),/noindex/);
 assert.match(res.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
});

test('direct page URLs and old application scripts cannot bypass inauguration',async()=>{
 for(const path of ['/atendimento/','/links/','/painel/','/acompanhar/?token=forged','/assinatura/','/avaliar/','/informacoes/','/index.html','/assets/app.mjs','/assets/admin.mjs','/painel/sw.js','/sitemap.xml','/anything','/?preview=true']){
  const res=await worker.fetch(request(path),env);
  assert.equal(res.status,path.startsWith('/?')?200:503,path);
  assert.match(await res.text(),/Um novo/);
 }
});

test('public and private APIs and every write remain disabled before inauguration',async()=>{
 for(const path of ['/api/health','/api/quotes','/api/business','/api/admin/session','/api/admin/dashboard','/api/realtime?ticket=forged']){
  for(const method of ['GET','POST','PUT','PATCH','DELETE','OPTIONS']){
   const res=await worker.fetch(request(path,{method,headers:{'X-Preview':'true','X-Admin':'true',Cookie:'__Host-ff_admin=forged'}}),env);
   assert.equal(res.status,503,method+' '+path);
   assert.equal((await res.json()).code,'prelaunch');
  }
 }
 const res=await worker.fetch(request('/',{method:'POST'}),env);
 assert.equal(res.status,503);assert.equal((await res.json()).code,'prelaunch');
});

test('only the explicit presentation assets and stylesheet can load',async()=>{
 for(const path of ['/assets/logo-original.png','/assets/fineform-home.webp','/assets/fineform-home-mobile.webp','/assets/fonts/body-400-latin-v1.woff2','/inauguracao/estilo.css']){
  const res=await worker.fetch(request(path),env);assert.equal(res.status,200,path);
 }
 const css=await worker.fetch(request('/inauguracao/estilo.css'),env);
 assert.match(css.headers.get('Content-Type'),/text\/css/);
 assert.match(await css.text(),/prefers-reduced-motion/);
 // The stylesheet must also work on /painel, whose CSP refuses inline styles.
 const panel=await worker.fetch(request('/painel/'),env);
 assert.doesNotMatch(panel.headers.get('Content-Security-Policy'),/unsafe-inline/);
 assert.match(await panel.text(),/href="\/inauguracao\/estilo.css"/);
});

test('HEAD never returns content and robots excludes all routes',async()=>{
 for(const path of ['/','/painel/','/api/health','/inauguracao/estilo.css','/robots.txt']){
  const res=await worker.fetch(request(path,{method:'HEAD'}),env);assert.equal(await res.text(),'');
 }
 const robots=await worker.fetch(request('/robots.txt'),env);
 assert.equal(await robots.text(),'User-agent: *\nDisallow: /\n');
});

test('geographic restriction and HTTPS remain ahead of inauguration',async()=>{
 const foreign=request('/');Object.defineProperty(foreign,'cf',{value:{country:'US'},configurable:true});
 const blocked=await worker.fetch(foreign,env);assert.equal(blocked.status,403);
 const http=new Request('http://fine-form.test/');Object.defineProperty(http,'cf',{value:{country:'BR'}});
 const redirect=await worker.fetch(http,env);assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),base+'/');
});

test('disabling the gate restores the original application without changing its data',async()=>{
 let fetched=false;
 const res=await worker.fetch(request('/atendimento/'),{PRELAUNCH_MODE:'false',ASSETS:{async fetch(){fetched=true;return new Response('original application');}}});
 assert.equal(fetched,true);assert.equal(await res.text(),'original application');
 const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
 assert.equal(config.vars.PRELAUNCH_MODE,'true');assert.equal(config.assets.run_worker_first,true);
});
