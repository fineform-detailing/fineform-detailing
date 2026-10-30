// One brief entrance; no frame sequences or scroll-driven car.
const photo=document.querySelector('.fn-hero-photo');
let played=false;
function arrive(){
 if(played||!photo)return;played=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||window.ffMotion?.enabled?.()===false)return;
 photo.animate?.([{opacity:.7,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});
}
if(document.documentElement.hasAttribute('data-ff-intro'))document.addEventListener('ff:intro-complete',arrive,{once:true});
else arrive();
