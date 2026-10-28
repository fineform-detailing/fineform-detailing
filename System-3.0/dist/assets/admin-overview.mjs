import {escape as e} from './system.mjs';
import {todaySP} from './catalog.mjs';
const number=new Intl.NumberFormat('pt-BR');
const count=value=>Math.max(0,Math.trunc(Number(value)||0));
const stages=[['pending','Recebidos'],['accepted','Aceitos'],['in_progress','Em cuidado'],['ready','Prontos'],['completed','Entregues']];
export function overviewHero(quotes={}){
 const total=Object.values(quotes).reduce((sum,value)=>sum+count(value),0),completed=count(quotes.completed);
 const percent=total?Math.round(completed/total*100):0;
 return '<section class="ff-overview-hero" aria-labelledby="ff-overview-title"><div class="ff-hero-copy"><p class="ff-hero-kicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3-8 9h7l-1 9 10-12h-8z"/></svg>Visão geral</p><h2 id="ff-overview-title">Seu estúdio,<br>em boa forma.</h2><button data-tab="quotes" type="button">'+number.format(total)+' pedido'+(total===1?'':'s')+' no sistema <b aria-hidden="true">↗</b></button></div><button class="ff-progress-ring" data-tab="quotes" data-status="completed" type="button" aria-label="'+completed+' de '+total+' pedidos concluídos. Consultar entregues."><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ff-ring-track" cx="60" cy="60" r="49"/><circle class="ff-ring-value" cx="60" cy="60" r="49" pathLength="100" stroke-dasharray="'+percent+' 100" transform="rotate(-90 60 60)"/></svg><strong>'+number.format(completed)+'</strong><small>concluídos</small></button></section>';
}
export function weekCalendar(offset=0){
 const today=todaySP(),anchor=new Date(today+'T12:00:00Z');
 anchor.setUTCDate(anchor.getUTCDate()-anchor.getUTCDay()+offset*7);
 const month=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(anchor.getTime()+3*86400000));
 const arrow=direction=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(direction<0?'m14 6-6 6 6 6':'m10 6 6 6-6 6')+'"/></svg>';
 return '<div class="ff-calendar-heading"><h2>'+e(month)+'</h2><div><button data-week="-1" type="button" aria-label="Semana anterior">'+arrow(-1)+'</button><button data-week="1" type="button" aria-label="Próxima semana">'+arrow(1)+'</button></div></div><div class="ff-week-days">'+Array.from({length:7},(_,i)=>{
  const day=new Date(anchor.getTime()+i*86400000),date=day.toISOString().slice(0,10),label=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',dateStyle:'full'}).format(day);
  return '<button data-agenda-date="'+date+'" type="button" '+(date===today?'aria-current="date" ':'')+'aria-label="Abrir agenda de '+e(label)+'"><span>'+['D','S','T','Q','Q','S','S'][i]+'</span><strong>'+String(day.getUTCDate()).padStart(2,'0')+'</strong></button>';
 }).join('')+'</div>';
}
// Current distribution, not a historical timeline or revenue estimate.
export function overviewChart(quotes={}){
 const values=stages.map(([id])=>count(quotes[id])),total=Object.values(quotes).reduce((n,value)=>n+count(value),0),maximum=Math.max(1,...values);
 return '<section class="ff-statistics-card" aria-labelledby="ff-analytics-title"><div class="ff-statistics-heading"><div><p>Pedidos no sistema</p><h2 id="ff-analytics-title">'+number.format(total)+'<small>pedidos</small></h2></div><span>Por etapa</span></div><figure class="ff-chart"><svg viewBox="0 0 360 235" role="img" aria-labelledby="ff-chart-title ff-chart-desc"><title id="ff-chart-title">Pedidos por etapa</title><desc id="ff-chart-desc">'+e(stages.map(([,label],i)=>label+': '+values[i]).join('; '))+'.</desc><defs><pattern id="ff-bar-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="2" height="6"/></pattern></defs>'+values.map((value,i)=>{
  const height=value/maximum*156,x=30+i*69;
  return '<rect class="ff-bar-track" x="'+x+'" y="42" width="25" height="156" rx="12"/><rect class="ff-bar-fill" x="'+x+'" y="'+(198-height)+'" width="25" height="'+height+'" rx="12"/><text x="'+(x+12.5)+'" y="'+(height?185-height:183)+'" text-anchor="middle">'+number.format(value)+'</text>';
 }).join('')+'</svg><div class="ff-chart-stages">'+stages.map(([id,label],i)=>'<button data-tab="quotes" data-status="'+id+'" type="button" aria-label="'+e(label)+': '+values[i]+'. Consultar pedidos.">'+label+'</button>').join('')+'</div><figcaption>Distribuição atual dos pedidos</figcaption></figure></section>';
}
