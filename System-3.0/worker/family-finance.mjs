import {requireAdmin,checkOrigin,randomToken} from './security.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const enc=new TextEncoder();
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const passwordHash=async(password,salt)=>{const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:310000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');};
const cookie=req=>(req.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ff_finance_session='))?.slice(19)||'';
const setCookie=(token,maxAge=60*60*24*30)=>({ 'Set-Cookie':token?'ff_finance_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge:'ff_finance_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
const body=async req=>{try{return await req.json();}catch{return fail(400,'Envie dados válidos.');}};
const getUser=async(req,env)=>{const token=cookie(req);if(!token)return null;const row=await env.DB.prepare('SELECT u.id,u.name,u.email,u.role FROM family_finance_sessions s JOIN family_finance_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),now()).first();return row||null;};
const session=async(env,user)=>{const token=randomToken();await env.DB.prepare('INSERT INTO family_finance_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await hash(token),user.id,new Date(Date.now()+30*86400000).toISOString(),now()).run();return token;};
const money=n=>Number(n||0)/100;
async function overview(env,user){
 const rows=await env.DB.prepare('SELECT * FROM family_finance_contributions ORDER BY due_date,person_role,label').all();
 const items=(rows.results||[]).filter(x=>user.role==='admin'||x.person_role===user.role).map(x=>({...x,amount:money(x.amount_cents)}));
 const confirmed=items.filter(x=>x.status==='confirmed').reduce((s,x)=>s+x.amount,0);
 const expected=items.reduce((s,x)=>s+x.amount,0);
 const pending=items.filter(x=>x.status!=='confirmed').reduce((s,x)=>s+x.amount,0);
 return {user,items,summary:{expected,confirmed,pending,progress:expected?Math.round(confirmed/expected*100):0}};
}
export async function handleFamilyFinance(req,env,ctx){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 try{
  if(path==='/api/finance/register'&&method==='POST'){
   checkOrigin(req);const b=await body(req),name=String(b.name||'').trim().slice(0,90),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||''),code=String(b.code||'').trim();
   if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<10||password.length>200||code.length<8)fail(400,'Confira nome, e-mail, senha (mínimo 10 caracteres) e convite.');
   const invite=await env.DB.prepare('SELECT * FROM family_finance_invites WHERE code_hash=? AND used_at IS NULL AND expires_at>?').bind(await hash(code),now()).first();if(!invite)fail(400,'Convite inválido ou expirado.');
   const salt=randomToken(),pass=await passwordHash(password,salt),user={id:id(),name,email,role:invite.role};
   try{await env.DB.batch([env.DB.prepare('INSERT INTO family_finance_users(id,name,email,role,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?,?)').bind(user.id,name,email,user.role,pass,salt,now()),env.DB.prepare('UPDATE family_finance_invites SET used_at=? WHERE id=? AND used_at IS NULL').bind(now(),invite.id)]);}catch{fail(409,'Este e-mail já está cadastrado ou o convite já foi utilizado.');}
   const token=await session(env,user);return json({user:{id:user.id,name,role:user.role}},201,setCookie(token));
  }
  if(path==='/api/finance/login'&&method==='POST'){
   checkOrigin(req);const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
   const u=await env.DB.prepare('SELECT * FROM family_finance_users WHERE email=?').bind(email).first();if(!u||await passwordHash(password,u.password_salt)!==u.password_hash)fail(401,'E-mail ou senha incorretos.');
   await env.DB.prepare('UPDATE family_finance_users SET last_login=? WHERE id=?').bind(now(),u.id).run();const token=await session(env,u);return json({user:{id:u.id,name:u.name,role:u.role}},200,setCookie(token));
  }
  if(path==='/api/finance/logout'&&method==='POST'){
   checkOrigin(req);const token=cookie(req);if(token)await env.DB.prepare('DELETE FROM family_finance_sessions WHERE token_hash=?').bind(await hash(token)).run();return json({ok:true},200,setCookie(''));
  }
  if(path==='/api/finance/session'&&method==='GET'){
   const user=await getUser(req,env);if(user)return json({user});try{const admin=await requireAdmin(req,env);return json({user:{id:admin.id,name:'Administrador',role:'admin'}});}catch{return json({user:null},401);}
  }
  if(path==='/api/finance/overview'&&method==='GET'){
   let user=await getUser(req,env);if(!user){try{const a=await requireAdmin(req,env);user={id:a.id,name:'Administrador',role:'admin'};}catch{fail(401,'Entre para continuar.');}}
   return json(await overview(env,user));
  }
  if(path==='/api/finance/invites'&&method==='POST'){
   checkOrigin(req);await requireAdmin(req,env);const b=await body(req),role=b.role;if(!['father','mother'].includes(role))fail(400,'Perfil inválido.');
   const code=randomToken().slice(0,24),inviteId=id(),expires=new Date(Date.now()+7*86400000).toISOString();
   await env.DB.prepare('INSERT INTO family_finance_invites(id,code_hash,role,expires_at,created_at) VALUES(?,?,?,?,?)').bind(inviteId,await hash(code),role,expires,now()).run();
   return json({code,role,expiresAt:expires},201);
  }
  if(path.match(/^\/api\/finance\/contributions\/[^/]+\/report$/)&&method==='POST'){
   checkOrigin(req);const user=await getUser(req,env);if(!user)fail(401,'Entre com seu acesso familiar.');const contributionId=path.split('/')[4],b=await body(req);
   const row=await env.DB.prepare('SELECT * FROM family_finance_contributions WHERE id=?').bind(contributionId).first();if(!row||row.person_role!==user.role)fail(404,'Contribuição não encontrada.');
   if(row.status==='confirmed')fail(409,'Este pagamento já foi confirmado pelo administrador.');
   await env.DB.prepare("UPDATE family_finance_contributions SET status='reported',reported_at=?,note=?,updated_at=? WHERE id=?").bind(now(),String(b.note||'').slice(0,500),now(),row.id).run();
   return json({ok:true,status:'reported'});
  }
  if(path.match(/^\/api\/finance\/contributions\/[^/]+\/confirm$/)&&method==='POST'){
   checkOrigin(req);await requireAdmin(req,env);const contributionId=path.split('/')[4],b=await body(req);
   const row=await env.DB.prepare('SELECT * FROM family_finance_contributions WHERE id=?').bind(contributionId).first();if(!row)fail(404,'Contribuição não encontrada.');
   await env.DB.prepare("UPDATE family_finance_contributions SET status='confirmed',confirmed_at=?,confirmed_by='admin',note=?,updated_at=? WHERE id=?").bind(now(),String(b.note||row.note||'').slice(0,500),now(),row.id).run();
   return json({ok:true,status:'confirmed'});
  }
  if(path==='/api/finance/notifications'&&method==='GET'){
   const user=await getUser(req,env);if(!user){try{const a=await requireAdmin(req,env);user={id:a.id,name:'Administrador',role:'admin'};}catch{fail(401,'Entre para continuar.');}}
   const rows=await env.DB.prepare('SELECT id,kind,title,message,scheduled_for,sent_at FROM family_finance_notifications WHERE (user_id=? OR (?='admin' OR (user_id IS NULL AND person_role=?))) ORDER BY scheduled_for DESC LIMIT 40').bind(user.id,user.role,user.role).all();
   return json({items:rows.results||[]});
  }
  fail(404,'Recurso financeiro não encontrado.');
 }catch(e){return json({error:e.status?e.message:'Não foi possível concluir a operação.'},e.status||500);}
}
export async function dispatchFamilyFinance(env){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),part=t=>parts.find(x=>x.type===t).value,today=part('year')+'-'+part('month')+'-'+part('day');await env.DB.prepare("UPDATE family_finance_contributions SET status='overdue',updated_at=? WHERE status='pending' AND due_date<?").bind(now(),today).run();const rows=await env.DB.prepare("SELECT * FROM family_finance_contributions WHERE status!='confirmed' AND due_date<=date(?,'+3 day') ORDER BY due_date").bind(today).all();
 for(const c of rows.results||[]){
  const days=Math.round((Date.parse(c.due_date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
  const kind=days<0?'overdue':days===0?'due_today':days>0&&days<=3?'due_soon':null;if(!kind)continue;
  const title=kind==='overdue'?'Pagamento em atraso':kind==='due_today'?'Pagamento vence hoje':'Pagamento próximo';
  const message=c.label+' · R$ '+money(c.amount_cents).toLocaleString('pt-BR',{minimumFractionDigits:2})+' · vencimento '+c.due_date.split('-').reverse().join('/');
  await env.DB.prepare("INSERT OR IGNORE INTO family_finance_notifications(id,user_id,person_role,contribution_id,kind,title,message,scheduled_for,created_at) SELECT ?,NULL,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM family_finance_users WHERE role=?)").bind(id(),c.person_role,c.id,kind,title,message,today,now(),c.person_role).run();
 }
}
