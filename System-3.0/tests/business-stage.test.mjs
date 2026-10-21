import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
const exec=promisify(execFile);

test('build remove avisos antigos e mantém confirmação manual sem duplicar rodapé',async t=>{
 const temp=await mkdtemp(join(tmpdir(),'fineform-appointment-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 await mkdir(join(temp,'dist/assets'),{recursive:true});
 for(const slug of ['', 'links','atendimento']){
  const relative='dist/'+(slug?slug+'/':'')+'index.html';
  if(slug)await mkdir(join(temp,'dist',slug),{recursive:true});
  const legacy='<aside class="business-stage">Preparação para inauguração</aside>';
  const html=(await readFile(relative,'utf8')).replace('<body','<!-- ff:stage:start -->'+legacy+'<!-- ff:stage:end --><body');
  await writeFile(join(temp,relative),html);
 }
 const module=pathToFileURL(join(process.cwd(),'scripts/build-legal.mjs')).href;
 await exec(process.execPath,['--input-type=module','-e',`const {buildLegal}=await import(${JSON.stringify(module)});await buildLegal();await buildLegal();`],{cwd:temp});
 for(const slug of ['', 'links','atendimento','privacidade','termos','informacoes']){
  const html=await readFile(join(temp,'dist',slug,'index.html'),'utf8'),dom=new JSDOM(html),d=dom.window.document;
  assert.equal(d.querySelectorAll('.business-stage').length,0,slug||'home');
  assert.doesNotMatch(d.body.textContent,/inaugura|atendimento ainda não começou/i);
  assert.equal(d.querySelectorAll('nav.footer-legal').length,1);
  assert.equal(d.querySelectorAll('h1').length,1);
  assert.ok(!d.body.textContent.includes('Atendemos nos feriados'));
  dom.window.close();
 }
 const info=await readFile(join(temp,'dist/informacoes/index.html'),'utf8');
 assert.match(info,/não reserva horário/);
 assert.match(info,/HORÁRIOS DE REFERÊNCIA/);
 assert.match(info,/data-public-business/);
});
