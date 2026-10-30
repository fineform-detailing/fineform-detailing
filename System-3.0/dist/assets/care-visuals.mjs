export const careVisuals={
 essential:{image:'modern-gt3.webp',position:'50% 64%',short:'Limpeza por fora e por dentro.'},
 premium:{image:'modern-mclaren.webp',position:'45% 61%',short:'Mais detalhes. Mais proteção.'},
 extra:{image:'modern-interior.webp',position:'50% 50%',short:'Exterior e interior, por inteiro.'},
 fullClean:{image:'modern-interior.webp',position:'55% 55%',short:'Limpeza profunda dos bancos e do interior.'},
 polishLight:{image:'detail-finish.webp',position:'50% 65%',short:'Brilho e marcas leves.'},
 polishMedium:{image:'modern-mclaren.webp',position:'38% 65%',short:'Correção de até quatro peças.'},
 polishPremium:{image:'modern-gt3.webp',position:'50% 50%',short:'Correção na pintura do carro inteiro.'},
 coating:{image:'detail-finish.webp',position:'50% 40%',short:'Proteção cerâmica para a pintura.'},
 motoPremium:{image:'modern-ducati.webp',position:'50% 55%',short:'Capricho em duas rodas.'}
};
export function visualFor(id){return careVisuals[id]||careVisuals.essential;}
export function careImageMarkup(id,{root='../',className='',alt='',loading='lazy'}={}){const v=visualFor(id);return '<img class="'+className+'" src="'+root+'assets/'+v.image+'" style="object-position:'+v.position+'" alt="'+alt+'" loading="'+loading+'" decoding="async" width="600" height="420">';}
