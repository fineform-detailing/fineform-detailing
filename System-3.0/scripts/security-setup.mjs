import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {totpStep} from '../worker/security.mjs';
import {config,databaseReady} from './cloudflare.mjs';
export function base32(bytes){let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(value<<(5-bits))&31];return out;}
export async function setupSecurity(){
 const cfg=config(),previewIndex=process.argv.indexOf('--preview'),previewName=previewIndex<0?null:process.argv[previewIndex+1];if(previewIndex>=0&&(!previewName||!/^[a-z0-9][a-z0-9-]{0,62}$/.test(previewName)))throw Error('Informe um nome de preview, por exemplo --preview teste.');if(previewName&&!databaseReady({d1_databases:cfg.previews?.d1_databases||[]}))throw Error('Configure o preview antes: npm run preview:configure.');if(!databaseReady(cfg))throw Error('Configure o D1 antes: npm run configure.');
 const key=randomBytes(32).toString('base64url'),secret=base32(randomBytes(20));
 console.log('\nACESSO DO PAINEL — '+cfg.name+(previewName?' / preview '+previewName:'')+'\n');
 console.log('Nova chave do painel (guarde no seu gerenciador de senhas):\n'+key);
 console.log('\nNo Google Authenticator, Microsoft Authenticator, 2FAS ou outro autenticador, adicione uma conta manualmente:');
 console.log('Nome: Fine Form / '+cfg.name+'\nTipo: baseado em tempo (TOTP)\nSegredo: '+secret+'\nAlgoritmo: SHA-1 · 6 dígitos · 30 segundos');
 console.log('\nGuarde também uma cópia privada do segredo para recuperar o acesso se trocar de aparelho.');
 const terminal=createInterface({input:process.stdin,output:process.stdout});
 try{let verified=false;for(let attempt=0;attempt<5;attempt++){const code=(await terminal.question('\nCódigo de 6 dígitos que aparece no aplicativo: ')).trim();if(await totpStep(secret,code)!==null){verified=true;break;}console.log('Código inválido. Confira o segredo e o horário automático do aparelho.');}if(!verified)throw Error('Autenticador não confirmado. Nenhum segredo foi alterado.');
  if((await terminal.question('Você guardou a chave e a recuperação do autenticador? Digite GUARDADO: ')).trim()!=='GUARDADO')throw Error('Configuração interrompida. Nenhum segredo foi alterado.');
 }finally{terminal.close();}
 const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
 // Secrets go through stdin; never through arguments, config or source files.
 for(const [name,value] of [['ADMIN_TOTP_SECRET',secret],['ADMIN_KEY',key]]){
  const result=spawnSync(process.execPath,[cli,...(previewName?['preview','secret','put',name,'--name',previewName,'--ignore-base-config']:['secret','put',name])],{input:value+'\n',stdio:['pipe','inherit','inherit'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  if(result.error)throw result.error;if(result.status!==0)throw Error('Não foi possível gravar '+name+'. Confira o Cloudflare. Se somente o autenticador foi gravado, use a chave antiga com o novo autenticador até repetir a configuração.');
 }
 console.log('\nAutenticador e chave configurados. Publique com npm run deploy. Sessões anteriores serão invalidadas.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))setupSecurity().catch(error=>{console.error(error.message);process.exitCode=1;});
