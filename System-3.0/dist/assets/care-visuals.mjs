export const careVisuals={
 essential:{image:'care-wash.webp',position:'50% 50%',short:'Limpeza por fora e por dentro.'},
 premium:{image:'care-detail.webp',position:'50% 50%',short:'Frestas, emblemas, proteção e mais capricho.'},
 extra:{image:'detail-finish.webp',position:'50% 45%',short:'Higienização, polimento e cuidado completo.'},
 fullClean:{image:'modern-interior.webp',position:'55% 50%',short:'Limpeza profunda dos bancos e do interior.'},
 polishLight:{image:'care-polish.webp',position:'50% 55%',short:'Realce do brilho e melhora de marcas leves.'},
 polishMedium:{number:'02',short:'Correção localizada em até quatro peças.'},
 polishPremium:{number:'03',short:'Corte, refino e lustro na pintura elegível.'},
 coating:{image:'modern-mclaren.webp',position:'50% 60%',short:'Preparação e proteção cerâmica da pintura.'},
 motoPremium:{image:'modern-ducati.webp',position:'50% 55%',short:'Capricho em duas rodas.'}
};
export function visualFor(id){return careVisuals[id]||careVisuals.essential;}
export function careImageMarkup(id,{root='../',className='',alt='',loading='lazy'}={}){const v=visualFor(id);if(v.number)return '<span class="care-choice-number" aria-hidden="true">'+v.number+'</span>';const mobile=v.image==='detail-finish.webp'?'':(' srcset="'+root+'assets/'+v.image.replace('.webp','-mobile.webp')+' 560w, '+root+'assets/'+v.image+' 1200w" sizes="(max-width:700px) 100px, 120px"');return '<img class="'+className+'" src="'+root+'assets/'+v.image+'"'+mobile+' style="object-position:'+v.position+'" alt="'+alt+'" loading="'+loading+'" decoding="async" width="160" height="180">';}
