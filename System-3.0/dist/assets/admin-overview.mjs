import {escape as e} from './system.mjs';

// This is a distribution of current statuses, not a historical time series.
// The dashboard endpoint remains the source of truth; no sample values are used.
const stages=[['pending','Recebidos'],['accepted','Aceitos'],['in_progress','Em cuidado'],['ready','Prontos'],['completed','Entregues']];
const count=value=>Math.max(0,Math.trunc(Number(value)||0));
const integer=new Intl.NumberFormat('pt-BR');
export function overviewChart(quotes={}){
 const values=stages.map(([id])=>count(quotes[id]));
 const total=Object.values(quotes).reduce((n,value)=>n+count(value),0);
 const active=count(quotes.accepted)+count(quotes.in_progress)+count(quotes.ready);
 const ceiling=Math.ceil(Math.max(4,...values)/4)*4;
 const points=values.map((n,i)=>[48+i*138,188-n/ceiling*156]);
 const line=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y.toFixed(2)).join(' ');
 const area=line+' L600 188 L48 188 Z';
 const summary=stages.map(([id,label],i)=>label+': '+integer.format(values[i])).join('; ');
 return '<section class="admin-dashboard-panel ff-analytics" aria-labelledby="ff-analytics-title">'+
  '<div class="admin-dashboard-panel-head"><h2 id="ff-analytics-title">Visão dos pedidos</h2><div class="ff-chart-controls"><span class="ff-period-chip">Agora</span><button type="button" data-tab="quotes" aria-label="Ver todos os pedidos">↗</button></div></div>'+
  '<div class="ff-chart-summary"><p>No sistema <strong>'+integer.format(total)+'</strong></p><p>Em atendimento <strong>'+integer.format(active)+'</strong><i aria-hidden="true">↗</i></p></div>'+
  '<figure class="ff-chart"><svg viewBox="0 0 640 216" preserveAspectRatio="none" role="img" aria-labelledby="ff-chart-title ff-chart-desc"><title id="ff-chart-title">Pedidos por etapa</title><desc id="ff-chart-desc">Distribuição atual dos pedidos. '+e(summary)+'.</desc><defs><pattern id="ff-chart-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><rect width="3" height="9" fill="currentColor"/></pattern></defs>'+
  [0,.5,1].map(r=>'<line class="ff-chart-grid" x1="48" x2="600" y1="'+(188-r*156)+'" y2="'+(188-r*156)+'"/><text class="ff-chart-axis" x="30" y="'+(193-r*156)+'" text-anchor="end">'+e(new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(ceiling*r))+'</text>').join('')+
  '<path class="ff-chart-area" d="'+area+'"/><path class="ff-chart-line" d="'+line+'"/>'+points.map(([x,y],i)=>'<circle class="ff-chart-dot" cx="'+x+'" cy="'+y.toFixed(2)+'" r="5"><title>'+e(stages[i][1])+': '+integer.format(values[i])+'</title></circle>').join('')+'</svg>'+
  (!total?'<p class="ff-chart-empty">Seu próximo pedido começa essa história.</p>':'')+
  '<div class="ff-chart-stages">'+stages.map(([id,label],i)=>'<button type="button" data-tab="quotes" data-status="'+id+'" aria-label="'+e(label)+': '+values[i]+'. Consultar pedidos."><span>'+label+'</span><strong>'+integer.format(values[i])+'</strong></button>').join('')+'</div><figcaption>Distribuição atual por etapa · toque para consultar</figcaption></figure></section>';
}
