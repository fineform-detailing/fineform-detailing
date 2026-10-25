function whatsappNumber(config){
 const raw=String(config.whatsapp||'').trim();
 if(!/^[+()\s\d-]+$/.test(raw))return '';
 const number=raw.replace(/\D/g,'');
 return /^[1-9]\d{9,14}$/.test(number)?number:'';
}
export function socialContacts(config={}){
 const links=[];
 for(const [key,label,host] of [['instagram','Instagram','instagram.com'],['tiktok','TikTok','tiktok.com']]){
  try{const url=new URL(config[key]);if(url.protocol==='https:'&&(url.hostname===host||url.hostname==='www.'+host))links.push({key,label,url:url.href});}catch{}
 }
 const email=String(config.email||'').trim();
 if(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))links.push({key:'email',label:'E-mail',url:'mailto:'+email});
 const number=whatsappNumber(config);
 if(number)links.push({key:'whatsapp',label:'WhatsApp',url:'https://wa.me/'+number});
 return links;
}
export function emailMessage(config,text,subject='Meu próximo cuidado — Fine Form'){
 const email=socialContacts(config).find(x=>x.key==='email');
 if(!email)return '';
 return email.url+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(String(text||'').replace(/\r?\n/g,'\r\n'));
}
export function preferredContact(config={}){
 const number=whatsappNumber(config);
 if(number)return {kind:'whatsapp',label:'Enviar pelo WhatsApp',number};
 if(socialContacts(config).some(x=>x.key==='email'))return {kind:'email',label:'Preparar e-mail para Mateus'};
 return {kind:'unavailable',label:'Escolher contato'};
}
export function whatsappMessage(config,text){
 const number=whatsappNumber(config);
 return number?'https://wa.me/'+number+'?text='+encodeURIComponent(String(text||'')):'';
}
