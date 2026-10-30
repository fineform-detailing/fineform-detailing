import {spawn} from 'node:child_process';
// Accept the conventional dev-server flags supplied by preview hosts.
const args=process.argv.slice(2).filter(arg=>arg!=='--strictPort').map(arg=>arg==='--host'?'--ip':arg.startsWith('--host=')?arg.replace('--host=','--ip='):arg);
// Keep local requests on the loopback origin when a preview host forwards them.
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local-upstream','localhost','--upstream-protocol','http',...args],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
