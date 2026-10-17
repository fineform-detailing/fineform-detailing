import {readFile,readdir} from 'node:fs/promises';
export async function applyMigrations(db,{files}={}){
 for(const name of (files??(await readdir('migrations')).filter(n=>n.endsWith('.sql'))).sort()){
  const sql=await readFile('migrations/'+name,'utf8');
  // Trigger bodies are one line; split only at the end of complete statements.
  const statements=sql.split(/;[ \t]*\r?\n|;[ \t]*$/).map(s=>s.trim()).filter(Boolean);
  await db.batch(statements.map(s=>db.prepare(s)));
 }
}
