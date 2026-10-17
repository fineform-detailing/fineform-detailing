// Set up the operator's physical check for pre-existing integration scenarios.
// The complete public/admin registration protocol is tested without this helper
// in plates.test.mjs and through the real forms in frontend.test.mjs.
let sequence=0;
export const fixturePlate=()=> 'TST'+String(++sequence).padStart(4,'0');
async function registeredFixture(db,id){
 const q=await db.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first();
 if(!q||q.plate_verified_at||q.kind==='subscription_visit')return;
 const plate=q.plate||fixturePlate(),stamp=new Date().toISOString();
 await db.prepare("UPDATE quotes SET plate=?,plate_verified_at=?,plate_verified_by=?,selection_json=json_set(selection_json,'$.plate',?,'$.plateVerified',json('true')) WHERE id=?").bind(plate,stamp,'fixture-operator',plate,id).run();
}
export async function vehicleFixture(db,path,body){
 if(!body||typeof body!=='object')return;
 if(path==='/api/admin/subscriptions'){
  if(!body.quoteId){if(body.plate===undefined)body.plate=fixturePlate();if(body.confirmVehicle===undefined)body.confirmVehicle=true;}
  else{const q=await db.prepare('SELECT status FROM quotes WHERE id=?').bind(body.quoteId).first();if(q?.status==='accepted')await registeredFixture(db,body.quoteId);}
 }
 let match=path.match(/^\/api\/subscriptions\/([^/]+)\/requests$/);
 if(match)body.plate=(await db.prepare('SELECT plate FROM subscriptions WHERE id=?').bind(match[1]).first())?.plate;
 match=path.match(/^\/api\/admin\/subscriptions\/([^/]+)\/visits$/);
 if(match&&body.status!=='scheduled'&&body.checkedPlate===undefined)body.checkedPlate=(await db.prepare('SELECT plate FROM subscriptions WHERE id=?').bind(match[1]).first())?.plate;
 match=path.match(/^\/api\/admin\/quotes\/([^/]+)$/);
 if(match&&['in_progress','ready','completed'].includes(body.status)){
  await registeredFixture(db,match[1]);
  if(body.checkedPlate===undefined){const q=await db.prepare('SELECT kind,plate FROM quotes WHERE id=?').bind(match[1]).first();if(q?.kind==='subscription_visit')body.checkedPlate=q.plate;}
 }
 match=path.match(/^\/api\/admin\/visits\/([^/]+)$/);
 if(match&&body.status==='completed'&&body.checkedPlate===undefined)body.checkedPlate=(await db.prepare('SELECT plate FROM visits WHERE id=?').bind(match[1]).first())?.plate;
}
