import {services,extras,plans,findService,findPlan,normalizeTreatments,normalizeExtras,quoteFor,validDate,timesFor,todaySP,validatePreference} from '../dist/assets/catalog.mjs';
import {normalizePlate,isPlate} from '../dist/assets/plates.mjs';
export function requirePlate(value){const plate=normalizePlate(value);if(!isPlate(plate))fail(400,'Informe uma placa válida: ABC-1234 ou ABC1D23.');return plate;}
export function matchPlate(value,expected){if(!isPlate(expected))fail(409,'Cadastre a placa desta assinatura no Gerenciador de placas antes de utilizar o Care.');const plate=requirePlate(value);if(plate!==expected)fail(409,'A placa informada não pertence a esta assinatura. O Care é exclusivo do veículo cadastrado.');return plate;}
export {services,extras,plans,todaySP,findPlan,quoteFor,validDate};
export const statuses={pending:'Recebido',accepted:'Aceito',declined:'Recusado',in_progress:'Em cuidado',ready:'Pronto para retirada',completed:'Retirado / entregue',cancelled:'Cancelado'};
export const transitions={pending:['accepted','declined','cancelled'],accepted:['in_progress','ready','completed','cancelled'],in_progress:['ready','completed','cancelled'],ready:['completed','cancelled'],declined:[],completed:[],cancelled:[]};
export class AppError extends Error{constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new AppError(status,message);};
export const text=(v,max=80)=>typeof v==='string'?v.replace(/[\r\n\u0000]+/g,' ').trim().slice(0,max):'';
export const idValid=v=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(v);
export function phoneOf(value){let v=String(value||'').replace(/\D/g,'');if(v.length===10||v.length===11)v='55'+v;if(!/^55\d{10,11}$/.test(v))fail(400,'Informe um telefone brasileiro com DDD.');return v;}
export function nextMonth(start,anchor=Number(start.slice(8))){
 if(!validDate(start))fail(400,'Data de início inválida.');
 const y=Number(start.slice(0,4)),m=Number(start.slice(5,7));
 const next=new Date(Date.UTC(y,m,1));
 const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();
 next.setUTCDate(Math.min(anchor,last));return next.toISOString().slice(0,10);
}
export function quotasFor(planId){const p=findPlan(planId);if(!p)fail(400,'Plano inválido.');return {premium:p.vehicle==='car'?p.premium:0,essential:p.essential,moto:p.vehicle==='moto'?p.premium:0};}
export function validateSelection(raw,now=new Date()){
 if(!raw||typeof raw!=='object')fail(400,'Pedido inválido.');
 const vehicle=raw.vehicle==='moto'?'moto':raw.vehicle==='car'?'car':null;
 const mode=['single','plan','guidance'].includes(raw.mode)?raw.mode:null;
 if(!vehicle||!mode)fail(400,'Escolha o veículo e o cuidado.');
 const name=text(raw.name),model=text(raw.model),phone=phoneOf(raw.phone);
 if(name.length<2||model.length<2)fail(400,'Informe seu nome e o modelo do veículo.');
 const service=findService(raw.service),plan=findPlan(raw.plan);
 if(mode==='single'&&service?.vehicle!==vehicle)fail(400,'Serviço inválido para o veículo.');
 if(mode==='plan'&&plan?.vehicle!==vehicle)fail(400,'Plano inválido para o veículo.');
 const treatments=Array.isArray(raw.treatments)?raw.treatments:[],additional=Array.isArray(raw.extras)?raw.extras:[];
 if(treatments.length>10||additional.length>10)fail(400,'Quantidade de cuidados inválida.');
 if(treatments.some(id=>!services.some(s=>s.id===id&&s.vehicle===vehicle&&s.class==='Classe C'))||additional.some(id=>!extras.some(s=>s.id===id&&(s.vehicle==='both'||s.vehicle===vehicle))))fail(400,'Um dos cuidados selecionados é inválido.');
 const date=text(raw.date,10),time=text(raw.time,5);
 if(date&&(!validDate(date)||date<todaySP(now)))fail(400,'Escolha uma data de hoje em diante.');
 if(time&&(!date||!timesFor(date).includes(time)))fail(400,'Horário inválido para a data.');
 const state={vehicle,mode,service:mode==='single'?service.id:vehicle==='car'?'essential':'motoPremium',plan:mode==='plan'?plan.id:'',name,model,phone,date,time,flexibleDate:raw.flexibleDate!==false,notes:text(raw.notes,600),goals:Array.isArray(raw.goals)?raw.goals.slice(0,6).map(v=>text(v,40)):[],treatments,extras:additional};
 const preferenceError=validatePreference(state,now);if(preferenceError)fail(400,preferenceError);
 state.treatments=normalizeTreatments(state);state.extras=normalizeExtras(state);
 return {state,budget:quoteFor(state)};
}
export function cycleView(cycle,visits,today=todaySP()){
 if(!cycle)return null;
 const counts={premium:{done:0,reserved:0},essential:{done:0,reserved:0},moto:{done:0,reserved:0}};
 for(const v of visits){if(!counts[v.kind])continue;if(v.status==='completed')counts[v.kind].done++;else if(['scheduled','in_progress'].includes(v.status))counts[v.kind].reserved++;}
 const credits=Object.fromEntries(Object.keys(counts).map(k=>[k,{quota:cycle[k+'_quota'],...counts[k],available:Math.max(0,cycle[k+'_quota']-counts[k].done-counts[k].reserved)}]));
 return {...cycle,credits,expired:today>=cycle.ends_on,notStarted:today<cycle.starts_on};
}
