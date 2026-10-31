import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';
import worker from '../worker/index.mjs';

const origin='https://fine-form.test';
let mf;
before(async()=>{
 const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
 assert.equal(config.assets.run_worker_first,true,'every asset must pass through the country check');
 assert.equal(config.preview_urls,false,'older versions must not remain publicly routable');
 const bundle=await build({entryPoints:[config.main],bundle:true,format:'esm',write:false});
 mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:config.compatibility_date,cf:{country:'BR'},assets:{directory:config.assets.directory,binding:config.assets.binding,routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:config.assets.run_worker_first}},log:new Log(LogLevel.ERROR)});
});
after(async()=>{await mf?.dispose();});

test('Brazil can load the site, links, dashboard shell, assets and health API',async()=>{
 for(const path of ['/','/links/','/painel/','/acompanhar/','/assinatura/','/avaliar/','/assets/style.css','/assets/logo-original.png','/api/health']){
  const res=await mf.dispatchFetch(origin+path,{cf:{country:'BR'}});
  assert.equal(res.status,200,path);
 }
 const res=await mf.dispatchFetch(origin+'/',{cf:{country:'BR',colo:'NRT'}});
 assert.equal(res.status,200,'country is independent of the Cloudflare data center');
});

test('foreign and unknown countries cannot load pages, APIs, scripts, styles or images',async()=>{
 for(const country of ['US','GB','JP','DE',null,'XX','T1','']){
  for(const path of ['/','/links/','/painel/','/acompanhar/','/assinatura/','/avaliar/','/assets/style.css','/assets/app.mjs','/assets/logo-original.png','/api/health','/api/admin/dashboard','/api/realtime?ticket=forged']){
   const res=await mf.dispatchFetch(origin+path,{cf:{country},redirect:'manual'});
   assert.equal(res.status,403,`${country}: ${path}`);
   assert.match(res.headers.get('Cache-Control'),/no-store/);
   assert.match(res.headers.get('X-Robots-Tag'),/noindex/);
   if(path.startsWith('/api/'))assert.equal((await res.json()).code,'country_restricted');
   else assert.equal(await res.text(),'Acesso disponível apenas no Brasil.');
  }
 }
});

test('forged country headers, VPN claims and crawler identity do not bypass the block',async()=>{
 const res=await mf.dispatchFetch(origin+'/api/health',{cf:{country:'US',botManagement:{verifiedBot:true}},headers:{'CF-IPCountry':'BR','CF-Connecting-IP':'200.160.2.3','X-Forwarded-For':'200.160.2.3','X-Country':'BR','User-Agent':'Googlebot',Cookie:'__Host-ff_admin=forged',Authorization:'Bearer forged'}});
 assert.equal(res.status,403);assert.equal((await res.json()).code,'country_restricted');
});

test('missing Cloudflare metadata fails closed even with a claimed Brazilian country',async()=>{
 const req=new Request(origin+'/api/health',{headers:{'CF-IPCountry':'BR','X-Forwarded-For':'200.160.2.3'}});
 const res=await worker.fetch(req,{});
 assert.equal(res.status,403);assert.equal((await res.json()).code,'country_restricted');
});

test('writes, preflights, HEAD, WebSocket upgrades and HTTP requests are blocked before routing',async()=>{
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','HEAD']){
  const res=await mf.dispatchFetch(origin+'/api/quotes',{method,cf:{country:'JP'},headers:{Origin:origin,'Content-Type':'application/json'}});
  assert.equal(res.status,403,method);
  if(method==='HEAD')assert.equal(await res.text(),'');
 }
 const ws=await mf.dispatchFetch(origin+'/api/realtime?ticket=forged',{cf:{country:'US'},headers:{Upgrade:'websocket',Origin:origin}});
 assert.equal(ws.status,403);
 const http=await mf.dispatchFetch(origin.replace('https:','http:')+'/',{cf:{country:'GB'},redirect:'manual'});
 assert.equal(http.status,403);assert.equal(http.headers.get('Location'),null);
});

test('development remains available only on loopback hosts',async()=>{
 for(const host of ['localhost','127.0.0.1','[::1]']){
  const res=await mf.dispatchFetch('http://'+host+'/api/health',{cf:{country:null}});
  assert.equal(res.status,200,host);
 }
 const res=await mf.dispatchFetch('https://localhost.attacker.test/api/health',{cf:{country:null}});
 assert.equal(res.status,403);
});
