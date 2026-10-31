/*!
 * Fine Form Liquid Glass optics (vanilla JS).
 * Based on https://github.com/stormaref/LiquidGlassSkill (MIT)
 * Refraction field adapted from liquid-glass-js by Armagan Amcalar,
 * Copyright (c) 2025 Armagan Amcalar, MIT.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies, and to permit persons to whom the Software is furnished to do so,
 * subject to inclusion of this notice.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 *
 * Chromium: live SVG displacement inside backdrop-filter.
 * Safari, Firefox, high contrast and data saver: CSS-only fallback.
 * No DOM snapshots, trackers, WebGL, request polling or third-party requests.
 */
const SVG_NS='http://www.w3.org/2000/svg';
const CFG={edgeIntensity:.015,rimIntensity:.028,baseIntensity:.05,edgeDistance:.5,
 rimDistance:1.7,baseDistance:.2,cornerBoost:.06,rippleEffect:.26,
 blurRadius:2,warp:false};
const filters=new Map();
let defs=null,sequence=0;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function supportsRefractiveBackdrop(nav=globalThis.navigator){
 if(!nav)return false;
 const ua=nav.userAgent||'';
 if(/iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS|Firefox|Safari(?!.*Chrome)/i.test(ua) && !/Chrome\/|Edg\//.test(ua))return false;
 if(/iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS|Firefox/i.test(ua))return false;
 const brands=nav.userAgentData?.brands;
 if(Array.isArray(brands))return brands.some(({brand})=>/Chromium|Google Chrome|Microsoft Edge/i.test(brand));
 return /(?:Chrome|Edg)\/\d+/i.test(ua);
}
export function lensOffset(cx,cy,w,h,r,pageW,pageH,cfg=CFG){
 const x=cx*w, y=cy*h;
 const tx=Math.abs(x-w/2)-(w/2-r),ty=Math.abs(y-h/2)-(h/2-r);
 const dist=Math.max(-(Math.hypot(Math.max(tx,0),Math.max(ty,0))+Math.min(Math.max(tx,ty),0)-r),0);
 const edge=Math.exp(-dist*cfg.edgeDistance),rim=Math.exp(-dist*cfg.rimDistance);
 const base=cfg.warp?(1-Math.exp(-dist*cfg.baseDistance))*cfg.baseIntensity:0;
 const intensity=base+edge*cfg.edgeIntensity+rim*cfg.rimIntensity;
 let nx=cx-.5,ny=cy-.5;const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;
 const minDim=Math.max(1,Math.min(w,h));
 const corner=Math.exp(-Math.max(Math.min(cx,1-cx),Math.min(cy,1-cy))*minDim*.3)*cfg.cornerBoost;
 const ripple=Math.sin(dist/minDim*25)*cfg.rippleEffect*rim;
 return {x:(nx*(intensity+corner)-ny*ripple)*pageW,y:(ny*(intensity+corner)+nx*ripple)*pageH};
}
function makeMap(w,h,r,pageW,pageH){
 const ss=clamp(1400/Math.max(w,h),.25,2),bw=Math.round(w*ss),bh=Math.round(h*ss);
 const canvas=document.createElement('canvas');canvas.width=bw;canvas.height=bh;
 const ctx=canvas.getContext('2d',{willReadFrequently:false});
 if(!ctx)throw new Error('Canvas unavailable');
 const data=ctx.createImageData(bw,bh);
 const dx=new Float32Array(bw*bh),dy=new Float32Array(bw*bh);
 let max=0;
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){
  const i=y*bw+x,p=lensOffset((x+.5)/bw,(y+.5)/bh,w,h,r,pageW,pageH);
  dx[i]=p.x;dy[i]=p.y;max=Math.max(max,Math.abs(p.x),Math.abs(p.y));
 }
 const scale=Math.max(max*2,.0001),bias=scale*(128/255-.5);
 for(let i=0;i<dx.length;i++){
  data.data[4*i]=clamp(Math.round(255*(.5+(dx[i]-bias)/scale)),0,255);
  data.data[4*i+1]=clamp(Math.round(255*(.5+(dy[i]-bias)/scale)),0,255);
  data.data[4*i+2]=128;data.data[4*i+3]=255;
 }
 ctx.putImageData(data,0,0);
 return {url:canvas.toDataURL('image/png'),scale};
}
function svgNode(name,attrs){
 const el=document.createElementNS(SVG_NS,name);
 for(const [key,val] of Object.entries(attrs))el.setAttribute(key,String(val));
 return el;
}
function ensureDefs(){
 if(defs?.isConnected)return defs;
 const svg=svgNode('svg',{width:0,height:0,'aria-hidden':'true'});
 svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none;overflow:hidden';
 defs=svgNode('defs',{});
 svg.append(defs);document.body.append(svg);return defs;
}
function acquire(key,w,h,r,pageW,pageH){
 const cached=filters.get(key);
 if(cached?.node.isConnected){cached.refs++;return cached;}
 const {url,scale}=makeMap(w,h,r,pageW,pageH);
 const spread=scale/2+3*CFG.blurRadius*.35,mx=spread/w*100,my=spread/h*100;
 const id='ff-refractive-'+(++sequence);
 const filter=svgNode('filter',{id,filterUnits:'objectBoundingBox',primitiveUnits:'userSpaceOnUse',
  x:-mx+'%',y:-my+'%',width:(100+mx*2)+'%',height:(100+my*2)+'%',
  'color-interpolation-filters':'sRGB'});
 filter.append(
  svgNode('feImage',{href:url,x:0,y:0,width:w,height:h,preserveAspectRatio:'none',result:'map'}),
  svgNode('feDisplacementMap',{in:'SourceGraphic',in2:'map',scale,
   xChannelSelector:'R',yChannelSelector:'G',result:'refracted'}),
  svgNode('feGaussianBlur',{in:'refracted',stdDeviation:CFG.blurRadius*.35})
 );
 ensureDefs().append(filter);
 const entry={id,node:filter,refs:1};filters.set(key,entry);return entry;
}
function release(key){
 if(!key)return;
 const entry=filters.get(key);
 if(entry&&--entry.refs<=0){entry.node.remove();filters.delete(key);}
}
function radiusFromCss(text,w,h){
 const n=parseFloat(text)||0;
 return clamp(text.trim().endsWith('%')?n/100*Math.min(w,h):n,0,Math.min(w,h)/2);
}
export function mountRefractiveSurface(el,{active=()=>true,win=window}={}){
 if(!el||!supportsRefractiveBackdrop(win.navigator)||!win.matchMedia||!win.ResizeObserver)return ()=>{};
 if(win.matchMedia('(prefers-contrast: more)').matches||
    win.matchMedia('(prefers-reduced-transparency: reduce)').matches||
    win.navigator.connection?.saveData)return ()=>{};
 let key=null,frame=0,delay=0,dead=false;
 function drop(){
  el.style.removeProperty('backdrop-filter');
  el.classList.remove('ff-optical-active');release(key);key=null;
 }
 function update(){
  frame=0;if(dead)return;
  if(!active()){drop();return;}
  const w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight);
  if(w<10||h<10)return;
  const r=radiusFromCss(win.getComputedStyle(el).borderTopLeftRadius,w,h);
  const pw=win.innerWidth,ph=win.innerHeight;
  const newKey=[w,h,r,pw,ph].join('|');
  if(key===newKey)return;
  // Retain the CSS fallback whenever the optical map cannot be built.
  try{
   const entry=acquire(newKey,w,h,r,pw,ph);
   el.style.backdropFilter='url(#'+entry.id+')';
   el.classList.add('ff-optical-active');
   release(key);key=newKey;
  }catch(error){
   drop();
   if(win.console?.warn)win.console.warn('Fine Form: refraction fallback enabled',error);
  }
 }
 function schedule(){if(frame)win.cancelAnimationFrame(frame);frame=win.requestAnimationFrame(update);}
 const observer=new win.ResizeObserver(()=>{win.clearTimeout(delay);delay=win.setTimeout(schedule,180);});
 observer.observe(el);
 const mutation=new win.MutationObserver(schedule);
 mutation.observe(el,{attributes:true,attributeFilter:['class']});
 const onResize=()=>{win.clearTimeout(delay);delay=win.setTimeout(schedule,180);};
 win.addEventListener('resize',onResize,{passive:true});
 win.addEventListener('pageshow',schedule);
 schedule();
 return ()=>{dead=true;observer.disconnect();mutation.disconnect();
  win.clearTimeout(delay);win.cancelAnimationFrame(frame);
  win.removeEventListener('resize',onResize);win.removeEventListener('pageshow',schedule);drop();};
}
export function mountFineFormLiquidGlass(header,dock){
 const cleanup=[
  mountRefractiveSurface(header,{active:()=>header.classList.contains('is-scrolled')}),
  mountRefractiveSurface(dock)
 ];
 return ()=>cleanup.forEach(f=>f());
}
