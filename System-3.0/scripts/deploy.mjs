import {databaseReady,wrangler} from './cloudflare.mjs';
try{
 if(!databaseReady())throw new Error('Configure o banco primeiro: npm run configure.');
 await import('./build.mjs');
 wrangler(['d1','migrations','apply','DB','--remote']);
 wrangler(['deploy']);
 console.log('\nFine Form 3.0 publicada. Abra /api/health na URL publicada e confira ready:true. Painel: /painel/.\n');
}catch(error){console.error(error.message);process.exitCode=1;}
