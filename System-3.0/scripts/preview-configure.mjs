import {writeFileSync} from 'node:fs';
import {wrangler,config,databaseReady} from './cloudflare.mjs';
try{
 const cfg=config();if(!databaseReady(cfg))throw Error('Configure o banco de produção primeiro.');
 const production=cfg.d1_databases.find(x=>x.binding==='DB'),name=cfg.name+'-preview';
 let list=JSON.parse(wrangler(['d1','list','--json'],{capture:true})),database=list.find(x=>x.name===name);
 if(!database){wrangler(['d1','create',name]);list=JSON.parse(wrangler(['d1','list','--json'],{capture:true}));database=list.find(x=>x.name===name);}
 const id=database?.uuid||database?.id;if(!/^[0-9a-f-]{36}$/i.test(id||'')||id===production.database_id)throw Error('O preview precisa de um banco próprio, diferente de produção.');
 cfg.previews={...cfg.previews,d1_databases:[{binding:'DB',database_name:name,database_id:id,migrations_dir:'migrations'}],durable_objects:{bindings:cfg.durable_objects.bindings.map(x=>({...x}))},observability:{enabled:false}};
 const migration={$schema:cfg.$schema,name:cfg.name+'-preview-migrations',compatibility_date:cfg.compatibility_date,d1_databases:[{binding:'PREVIEW_DB',database_name:name,database_id:id,migrations_dir:'migrations'}]};
 writeFileSync(new URL('../wrangler.preview-migrations.jsonc',import.meta.url),JSON.stringify(migration,null,2)+'\n');
 writeFileSync(new URL('../wrangler.jsonc',import.meta.url),JSON.stringify(cfg,null,2)+'\n');
 wrangler(['d1','migrations','apply','PREVIEW_DB','--remote','--config','wrangler.preview-migrations.jsonc']);
 console.log('\nPreview usa um D1 separado. Execute npm run preview -- --name teste e depois npm run security:setup -- --preview teste.');
}catch(error){console.error(error.message);process.exitCode=1;}
