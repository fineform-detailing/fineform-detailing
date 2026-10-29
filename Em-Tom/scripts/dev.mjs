import {spawn} from 'node:child_process';
const args=process.argv.slice(2).filter(x=>x!=='--strictPort').map(x=>x==='--host'?'--ip':x.startsWith('--host=')?x.replace('--host=','--ip='):x);
if(!args.some(x=>x==='--ip'||x.startsWith('--ip=')))args.push('--ip','0.0.0.0');
if(!args.some(x=>x==='--port'||x.startsWith('--port=')))args.push('--port','3000');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--var','ENVIRONMENT:development',...args],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{if(code)console.error('Dev command failed:',JSON.stringify(args));process.exit(code??0);});
