const photos={geral:['modern-gt3.webp','Dianteira de um Porsche GT3 prateado'],pintura:['care-polish.webp','Polimento da pintura'],interior:['modern-interior.webp','Bancos e acabamento do interior'],vidros:['care-glass.webp','Limpeza dos vidros'],rodas:['care-wheels.webp','Limpeza detalhada das rodas'],acabamentos:['care-detail.webp','Limpeza dos emblemas e acabamentos']};
export function mountCarSurface(host,{root='../',view='geral'}={}){
 if(!host)return null;
 const image=host.querySelector('img')||host.appendChild(document.createElement('img'));
 image.className='fn-part-view';image.width=560;image.height=374;image.decoding='async';
 let current=null;
 function setView(id='geral'){
  const next=photos[id]?id:'geral';if(current===next)return;current=next;
  const [file,alt]=photos[next];image.alt=alt;
  image.src=root+'assets/'+file.replace('.webp','-mobile.webp');
  host.dataset.carView=next;host.setAttribute('aria-label',alt);
 }
 setView(view);
 return{setView,dispose(){}};
}
