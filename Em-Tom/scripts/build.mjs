import './prepare-assets.mjs';
import { spawnSync } from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--dry-run','--outdir','dist'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
