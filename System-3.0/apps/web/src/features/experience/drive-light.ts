import { emptyDriveInput, initialDriveState, stepDrive, type DriveState } from './drive-model';
import type { DriveScene } from './drive-scene';
/** Canvas fallback for devices without WebGL; same controls and motion model. */
export function createLightDrive(canvas: HTMLCanvasElement, signal: AbortSignal, onReadout: (s: DriveState) => void): DriveScene {
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas indisponível');
  let state=initialDriveState(), input=emptyDriveInput(), wide=false, paused=false, disposed=false, request=0, last=0, report=0;
  let width=1,height=1;
  const round=(x:number,y:number,w:number,h:number,r:number,fill:string)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  const draw=()=>{
    const pixel=Math.min(devicePixelRatio,2); ctx.setTransform(pixel,0,0,pixel,0,0);ctx.clearRect(0,0,width,height);
    ctx.fillStyle='#c3cfc1';ctx.fillRect(0,0,width,height);
    const scale=wide?9:Math.min(width/12,27);
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-state.x,state.z);
    round(-41,-41,82,82,1,'#b1c6b6');round(-40,-40,80,80,1,'#e3e6dc');
    ctx.strokeStyle='#53c3b1';ctx.lineWidth=.16;ctx.strokeRect(-39,-39,78,78);
    ctx.strokeStyle='#c7d1c4';ctx.lineWidth=.018;
    for(let n=-40;n<=40;n+=5){ctx.beginPath();ctx.moveTo(n,-40);ctx.lineTo(n,40);ctx.stroke();ctx.beginPath();ctx.moveTo(-40,n);ctx.lineTo(40,n);ctx.stroke();}
    ctx.fillStyle='#fafaf1';for(let x=-27;x<=27;x+=9){ctx.fillRect(x-2,-25,4,.12);ctx.fillRect(x-2,25,4,.12);}
    for(const x of [-33,33])for(const z of [-26,-13,0,13,26]){ctx.fillStyle='#739889';ctx.beginPath();ctx.arc(x,z,.55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#53c3b1';ctx.beginPath();ctx.arc(x,z,.2,0,Math.PI*2);ctx.fill();}
    ctx.translate(state.x,-state.z);ctx.rotate(state.yaw);
    ctx.shadowColor='#183c2b55';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
    round(-1.04,-2.1,2.08,4.5,.55,'#172d24');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    for(const x of [-1.1,.82])for(const z of [-1.5,1.1])round(x,z,.29,.72,.1,'#1c2420');
    const paint=ctx.createLinearGradient(-1.1,0,1.1,0);paint.addColorStop(0,'#589c87');paint.addColorStop(.22,'#acd7c1');paint.addColorStop(.55,'#77b6a1');paint.addColorStop(.85,'#4e8b78');paint.addColorStop(1,'#bedfcd');
    ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(-.85,2.2);ctx.bezierCurveTo(-1.2,2.05,-1.14,.8,-.96,.5);ctx.lineTo(-.91,-1.6);ctx.bezierCurveTo(-.91,-2.45,.91,-2.45,.91,-1.6);ctx.lineTo(.96,.5);ctx.bezierCurveTo(1.14,.8,1.2,2.05,.85,2.2);ctx.closePath();ctx.fill();
    // Classic 930 roof, curved hood, rear haunches and whale-tail spoiler.
    round(-.66,-.8,1.32,1.95,.42,'#172e25');round(-.59,-.31,1.18,1.02,.22,'#74a992');
    ctx.fillStyle='#b5cec4';ctx.beginPath();ctx.moveTo(-.56,-.69);ctx.lineTo(.56,-.69);ctx.lineTo(.65,-.3);ctx.lineTo(-.65,-.3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8aa99a';ctx.beginPath();ctx.moveTo(-.6,.72);ctx.lineTo(.6,.72);ctx.lineTo(.5,1.1);ctx.lineTo(-.5,1.1);ctx.closePath();ctx.fill();
    round(-.98,1.64,1.96,.35,.1,'#263e32');round(-.83,1.66,1.66,.17,.04,'#74ad94');
    ctx.strokeStyle='#e3f2e8';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-.55,-1);ctx.lineTo(-.45,-1.95);ctx.quadraticCurveTo(0,-2.12,.45,-1.95);ctx.lineTo(.55,-1);ctx.stroke();
    for(const x of [-.68,.68]){ctx.fillStyle='#e7eaca';ctx.beginPath();ctx.ellipse(x,-1.85,.16,.23,0,0,Math.PI*2);ctx.fill();}
    round(-.91,2.03,1.82,.12,.03,'#9b3f39');round(-.91,-2.02,1.82,.08,.03,'#29493a');
    ctx.restore();
  };
  const resize=()=>{const b=canvas.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);const p=Math.min(devicePixelRatio,2);canvas.width=width*p;canvas.height=height*p;draw();};
  const loop=(time:number)=>{request=0;if(disposed||paused)return;if(document.hidden){last=0;request=requestAnimationFrame(loop);return;}state=stepDrive(state,input,last?(time-last)/1000:0);last=time;draw();if(time-report>100){onReadout(state);report=time;}request=requestAnimationFrame(loop);};
  const release=()=>{input=emptyDriveInput();};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();request=requestAnimationFrame(loop);
  const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(request);observer.disconnect();release();};signal.addEventListener('abort',dispose,{once:true});
  return {mode:'2d',control:(a,p)=>{input[a]=p;},release,pause:v=>{paused=v;release();last=0;cancelAnimationFrame(request);if(!v)request=requestAnimationFrame(loop);},reset:()=>{state=initialDriveState();release();draw();onReadout(state);},camera:v=>{wide=v;draw();},dispose};
}
