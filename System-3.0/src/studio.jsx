import React, {useEffect, useRef, useState, Component} from 'react';
import {createRoot} from 'react-dom/client';
import Stack from './react-bits/Stack.jsx';
import ScrollVelocity from './react-bits/ScrollVelocity.jsx';
import FolderFloat from './FolderFloat.jsx';
import BorderGlow from './react-bits/BorderGlow.jsx';

const care = [
 {image:'assets/modern-gt3.webp',alt:'Detalhe de um Porsche 911 GT3 moderno, fotografia editorial de Erik Fabian',title:'Pintura e brilho.',label:'Pintura',description:'Realce, correção por polimento e proteção cerâmica. O teste da pintura define o caminho.',href:'atendimento/?mode=guidance&area=pintura'},
 {image:'assets/modern-interior.webp',alt:'Interior de um BMW moderno, fotografia editorial de Divaris Shirichena',title:'De dentro para fora.',label:'Interior',description:'Bancos, plásticos, painel e carpete. O cuidado muda conforme o material e a necessidade.',href:'atendimento/?mode=guidance&area=interior'},
 {image:'assets/modern-ducati.webp',alt:'Ducati Panigale V4R em iluminação vermelha, fotografia editorial de Jan Kopřiva',title:'Também em duas rodas.',label:'Moto',description:'Limpeza estética das superfícies acessíveis. Moto Premium, com respeito aos materiais e às áreas de contato.',href:'atendimento/?vehicle=moto&service=motoPremium'}
];
function motionAllowed(){try{return window.ffMotion?.enabled?.()??(!matchMedia('(prefers-reduced-motion: reduce)').matches&&localStorage.getItem('ff-motion-paused')!=='1');}catch{return !matchMedia('(prefers-reduced-motion: reduce)').matches;}}
function useMotionPreference(){
 const [enabled,setEnabled]=useState(motionAllowed);
 useEffect(()=>{const update=e=>setEnabled(e.detail.enabled);window.addEventListener('ff:motion',update);return()=>window.removeEventListener('ff:motion',update);},[]);
 return enabled;
}
function useVisible(ref){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(!window.IntersectionObserver){setVisible(true);return;}const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'100px'});observer.observe(ref.current);return()=>observer.disconnect();},[ref]);
 return visible;
}
function VelocityBand(){
 const ref=useRef(null),enabled=useMotionPreference(),visible=useVisible(ref);
 const [awake,setAwake]=useState(!document.hidden);
 useEffect(()=>{const update=()=>setAwake(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 return <div ref={ref} className="velocity-inner" aria-hidden="true">{enabled&&visible&&awake?<ScrollVelocity texts={['LIMPAR. CORRIGIR. PROTEGER. ✳']} velocity={14} numCopies={4} parallaxClassName="rb-parallax" scrollerClassName="rb-scroller" damping={45} stiffness={300}/>:<div className="rb-static">LIMPAR. CORRIGIR. PROTEGER. ✳</div>}</div>;
}
function Explorer(){
 const [active,setActive]=useState(0),controls=useRef(null),enabled=useMotionPreference();
 const current=care[active];
 const cards=care.map(item=><img key={item.image} src={item.image} alt={item.alt} loading="lazy" draggable={false}/>);
 return <div className="explorer-inner">
  <div className="explorer-media"><Stack cards={cards} controlRef={controls} layout="pile" visible={3} spread={0.08} depth={0.06} radius={22} tilt={0} threshold={60} sendToBackOnClick shadow={false} disableAnimations={!enabled} onChange={setActive}/><span className="photo-tag">FINE FORM / OLHAR EDITORIAL</span></div>
  <div className="explorer-detail">
   <div className="explorer-navigation"><span className="explorer-counter" aria-live="polite">0{active+1} / 03 · {current.label}</span><button type="button" className="next-photo" onClick={()=>controls.current?.next()} aria-label="Próximo cuidado">Próximo <span aria-hidden="true">↗</span></button></div>
   <div className="explorer-caption" key={active}><h3>{current.title}</h3><p>{current.description}</p><a className="button dark-button" href={current.href}>Quero cuidar desta parte <span aria-hidden="true">↗</span></a></div>
   <p className="drag-help">Arraste a foto para o lado, toque nela ou use “Próximo”.</p>
  </div>
 </div>;
}
function ClosingSignature(){
 const enabled=useMotionPreference();
 return <div>
  <BorderGlow className="closing-panel ff-glow" disabled={!enabled} animated={false} backgroundColor="#fffaf3" glowColor="30 100 64" colors={['#ff8000','#ffc88f','#c78538']} glowRadius={14} glowIntensity={0.55} fillOpacity={0.04} borderRadius={28}>
   <div className="closing-copy"><p className="kicker"><span className="orange-dot"/>SEU PRÓXIMO CUIDADO</p><h2 id="closing-title">Tudo começa<br/>com uma boa conversa.</h2><p>Conte o que seu veículo precisa. Eu ajudo você a escolher.</p><a className="button orange" href="atendimento/">Preparar meu atendimento <span aria-hidden="true">↗</span></a></div>
  </BorderGlow>
 </div>;
}
function SummaryFolder(){const enabled=useMotionPreference();return <FolderFloat motionEnabled={enabled}/>;}
class Boundary extends Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
const gallery=document.getElementById('react-gallery');
if(gallery){createRoot(gallery).render(<Boundary fallback={<div className="gallery-fallback"><img src={care[0].image} alt={care[0].alt}/><h3>O que você quer cuidar?</h3>{care.map(item=><a key={item.label} href={item.href}>{item.label} ↗</a>)}</div>}><Explorer/></Boundary>);}
const ticker=document.getElementById('react-velocity');
if(ticker){createRoot(ticker).render(<Boundary fallback={<div className="rb-static">LIMPAR. CORRIGIR. PROTEGER. ✳</div>}><VelocityBand/></Boundary>);}
const folder=document.getElementById('react-folder');
if(folder){createRoot(folder).render(<Boundary fallback={<p className="folder-fallback">Seu veículo, o cuidado e seu horário de preferência: juntos no resumo.</p>}><SummaryFolder/></Boundary>);}

const closing=document.getElementById('react-closing');
if(closing){createRoot(closing).render(<Boundary fallback={<div className="closing-panel"><h2 id="closing-title">Tudo começa com uma boa conversa.</h2><p>Conte o que seu veículo precisa.</p><a className="button orange" href="atendimento/">Preparar meu atendimento ↗</a></div>}><ClosingSignature/></Boundary>);}
