import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioCapture} from '../public/audio-capture.js';

async function environment(run,{microphone,contextError=false,workerReady=true}={}){
  const saved=new Map(),contexts=[],workers=[],nodes=[],requests=[],tracks=[];
  const set=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
  const track={stopped:false,stop(){this.stopped=true;},onended:null,onmute:null};tracks.push(track);
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  class Context{
    constructor(options){if(contextError&&options.sampleRate)throw new Error('unsupported rate');this.options=options;this.sampleRate=options.sampleRate||44100;this.currentTime=0;this.state='running';this.closed=false;this.destination={};this.audioWorklet={addModule:async()=>{}};contexts.push(this);}
    async resume(){}
    async close(){this.closed=true;this.state='closed';}
    createMediaStreamSource(){return{connect(node){return node;},disconnect(){}};}
    createGain(){return{gain:{value:1},connect(){},disconnect(){}};}
  }
  class Worker{
    constructor(){workers.push(this);this.terminated=false;}
    postMessage(data){if(data.type==='connect'){this.port=data.port;if(workerReady)queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));}if(data.type==='finish')queueMicrotask(()=>this.onmessage?.({data:{type:'result',result:{candidates:[],duration:1,reliable:true,interrupted:true}}}));}
    terminate(){this.terminated=true;this.port?.close();}
  }
  class Node{
    constructor(){this.port={onmessage:null,postMessage:data=>{if(data.type==='connect'){this.target=data.port;queueMicrotask(()=>this.port.onmessage?.({data:{type:'ready'}}));}if(data.type==='stop'){this.stop=data;queueMicrotask(()=>workers.at(-1).onmessage?.({data:{type:'result',result:{candidates:[],duration:.25,reliable:true,interrupted:!!data.interrupted}}}));}},close:()=>this.target?.close()};nodes.push(this);}
    connect(node){return node;}
    disconnect(){}
  }
  set('AudioContext',Context);set('AudioWorkletNode',Node);set('Worker',Worker);
  set('navigator',{mediaDevices:{getSupportedConstraints:()=>({voiceIsolation:true}),getUserMedia:async options=>{requests.push(options);return microphone?await microphone(stream):stream;}}});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});
  try{await run({contexts,workers,nodes,requests,tracks,stream});}
  finally{for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('capture requests clean mono audio, supports native-rate fallback and releases all resources',async()=>{
  await environment(async({contexts,workers,nodes,requests,tracks})=>{
    let received;const capture=new AudioCapture({onResult:value=>received=value});
    await capture.start();assert.equal(contexts[0].sampleRate,44100);
    const constraints=requests[0].audio;assert.equal(constraints.sampleRate.ideal,48000);assert.equal(constraints.channelCount.ideal,1);
    for(const feature of ['echoCancellation','noiseSuppression','autoGainControl','voiceIsolation'])assert.equal(constraints[feature],false);
    assert.equal(capture.silent.gain.value,0);
    capture.stop();await tick();await tick();
    assert.equal(received.duration,.25);assert.equal(nodes[0].stop.interrupted,false);assert.ok(tracks[0].stopped);assert.ok(workers[0].terminated);assert.ok(contexts[0].closed);
  },{contextError:true});
});
test('microphone mute and suspended audio contexts return interrupted results without auto-sharing',async()=>{
  for(const reason of ['mute','suspend'])await environment(async({contexts,tracks})=>{
    let received;const capture=new AudioCapture({onResult:r=>received=r});await capture.start();
    if(reason==='mute')tracks[0].onmute();else{contexts[0].state='suspended';contexts[0].onstatechange();}
    await tick();await tick();assert.equal(received.interrupted,true);assert.equal(received.reliable,false);assert.ok(tracks[0].stopped);
  });
});
test('aborting while permission is pending stops a late microphone stream and never starts the worker',async()=>{
  let grant;await environment(async({contexts,workers,tracks,stream})=>{
    const capture=new AudioCapture(),started=capture.start();await tick();
    const rejected=assert.rejects(started,{name:'AbortError'});
    await capture.dispose();grant(stream);await rejected;
    assert.ok(contexts[0].closed);assert.ok(tracks[0].stopped);assert.equal(workers.length,0);
  },{microphone:()=>new Promise(resolve=>grant=resolve)});
});
test('aborting during the startup handshake rejects immediately and closes the worker',async()=>{
  await environment(async({workers,tracks,contexts})=>{
    const capture=new AudioCapture(),started=capture.start();await tick();
    const rejected=assert.rejects(started,{name:'AbortError'});await capture.dispose();await rejected;
    assert.ok(workers[0].terminated);assert.ok(tracks[0].stopped);assert.ok(contexts[0].closed);
  },{workerReady:false});
});
test('a completed result cannot run callbacks after the page disposes its capture',async()=>{
  await environment(async({workers,contexts})=>{
    let delivered=0,close;const capture=new AudioCapture({onResult:()=>delivered++});await capture.start();
    contexts[0].close=()=>new Promise(resolve=>close=resolve);
    workers[0].onmessage({data:{type:'result',result:{duration:10,reliable:true}}});
    await capture.dispose();close();await tick();assert.equal(delivered,0);
  });
});
test('worker errors free the microphone exactly once and allow a fresh session',async()=>{
  await environment(async({workers,tracks,contexts})=>{
    let errors=0;const capture=new AudioCapture({onError:()=>errors++});await capture.start();
    workers[0].onerror();workers[0].onerror();await tick();
    assert.equal(errors,1);assert.ok(tracks[0].stopped);assert.ok(contexts[0].closed);assert.ok(workers[0].terminated);
  });
});
