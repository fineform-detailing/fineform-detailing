import {build} from 'esbuild';
import {databaseReady,wrangler} from './cloudflare.mjs';
try{
 if(!databaseReady())throw new Error('Configure o banco primeiro: npm run configure.');
 await build({entryPoints:['src/studio.jsx'],bundle:true,minify:true,format:'esm',jsx:'automatic',target:['es2020'],outfile:'dist/assets/studio-react.mjs',define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
 wrangler(['d1','migrations','apply','DB','--remote']);
 wrangler(['deploy']);
 console.log('\nFine Form 3.0 publicada. Abra /api/health na URL publicada e confira ready:true. Painel: /painel/.\n');
}catch(error){console.error(error.message);process.exitCode=1;}
