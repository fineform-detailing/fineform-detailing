export const LOCATION_NOTICE='Atendimento somente com horário combinado. O local e as orientações de chegada são informados por Mateus antes da confirmação do atendimento.';
export const escapeBusiness=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Links only: no embedded maps, arbitrary redirects, executable URLs or credentials.
export function safeMapUrl(value){
 if(typeof value!=='string'||!value.trim())return '';
 try{
  const url=new URL(value.trim());
  if(url.protocol!=='https:'||url.username||url.password||url.port)return '';
  const host=url.hostname.toLowerCase();
  if(host==='maps.app.goo.gl'||host==='maps.google.com'||host==='maps.google.com.br'||host==='maps.apple.com')return url.href;
  if(['google.com','www.google.com','google.com.br','www.google.com.br','goo.gl'].includes(host)&&/^\/maps(?:\/|$)/.test(url.pathname))return url.href;
  if(['waze.com','www.waze.com'].includes(host)&&/^\/(?:ul|live-map)(?:\/|$)/.test(url.pathname))return url.href;
 }catch{}
 return '';
}

export function locationDetails(location){
 if(!location?.address)return '';
 const e=escapeBusiness,map=safeMapUrl(location.mapsUrl);
 return '<address class="location-address">'+e(location.address)+'</address>'+(location.arrivalNote?'<p>'+e(location.arrivalNote)+'</p>':'')+(map?'<a class="button outline" href="'+e(map)+'" target="_blank" rel="noopener noreferrer">Abrir mapa ↗</a>':'');
}

export function publicBusinessDetails(data){
 const e=escapeBusiness,s=data?.supplier;
 return (s?'<dl class="supplier-details"><dt>IDENTIFICAÇÃO DO FORNECEDOR</dt><dd>'+e(s.legalName)+'</dd><dt>CNPJ</dt><dd>'+e(s.cnpj)+'</dd></dl>':'')+'<p>'+LOCATION_NOTICE+'</p>';
}

export function locationMessage(quote){
 const location=quote.location;
 if(!location?.address)return '';
 return 'Olá, '+quote.name+'! Aqui é Mateus, da Fine Form.\nPedido '+quote.reference+'\nLocal de atendimento: '+location.address+(location.arrivalNote?'\nComo chegar: '+location.arrivalNote:'')+(safeMapUrl(location.mapsUrl)?'\nMapa: '+safeMapUrl(location.mapsUrl):'')+'\nA data, o horário e as condições do serviço precisam estar confirmados comigo antes do deslocamento.';
}
