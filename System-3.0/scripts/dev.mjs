import {spawn} from 'node:child_process';
// Accept the conventional dev-server flags supplied by preview hosts.
const args=process.argv.slice(2).filter(arg=>arg!=='--strictPort').map(arg=>arg==='--host'?'--ip':arg.startsWith('--host=')?arg.replace('--host=','--ip='):arg);
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev',...args],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
