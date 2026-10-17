import {writeFileSync} from 'node:fs';
import {wrangler,config,databaseReady} from './cloudflare.mjs';
import {setupSecurity} from './security-setup.mjs';
try{
 const cfg=config();
 if(!databaseReady(cfg)){
  const binding=cfg.d1_databases.find(v=>v.binding==='DB');
  // A lista e o nome exato tornam uma nova execução recuperável após falha de rede.
  let list=JSON.parse(wrangler(['d1','list','--json'],{capture:true}));
  let database=list.find(v=>v.name===binding.database_name);
  if(!database){wrangler(['d1','create',binding.database_name]);list=JSON.parse(wrangler(['d1','list','--json'],{capture:true}));database=list.find(v=>v.name===binding.database_name);}
  const id=database?.uuid||database?.id;if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new Error('Não foi possível identificar o banco. Copie database_id do Cloudflare para wrangler.jsonc.');
  binding.database_id=id;writeFileSync(new URL('../wrangler.jsonc',import.meta.url),JSON.stringify(cfg,null,2)+'\n');
 }
 wrangler(['d1','migrations','apply','DB','--remote']);
 await setupSecurity();
 console.log('\nBanco configurado. Publique com npm run deploy.\n');
}catch(error){console.error(error.message);process.exitCode=1;}
