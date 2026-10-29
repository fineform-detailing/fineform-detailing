import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Worker, MessageChannel} from 'node:worker_threads';
import {pitch} from '../public/dsp.js';
import {AudioAnalysis} from '../public/audio-analysis.js';

const signal=(frequency,sampleRate,seconds=.3,amplitude=.2)=>Float32Array.from({length:Math.round(sampleRate*seconds)},(_,i)=>amplitude*Math.sin(2*Math.PI*frequency*i/sampleRate));
const cents=(actual,expected)=>Math.abs(1200*Math.log2(actual/expected));
function feed(analysis,samples,sizes=[960]){let at=0,part=0;while(at<samples.length){const end=Math.min(samples.length,at+sizes[part++%sizes.length]);analysis.push(samples.subarray(at,end),at);at=end;}}
async function worklet(sampleRate,duration,target){
  let Processor;
  class Base {constructor(){this.port={onmessage:null,postMessage(){}};}}
  vm.runInNewContext(await readFile(new URL('../public/audio-worklet.js',import.meta.url),'utf8'),{AudioWorkletProcessor:Base,sampleRate,Float32Array,Math,registerProcessor:(name,p)=>{assert.equal(name,'em-tom-capture');Processor=p;}});
  const processor=new Processor({processorOptions:{duration}});
  processor.port.onmessage({data:{type:'connect',port:target}});
  return processor;
}

test('quiet pitched signals and bass/treble stay accurate at 44.1, 48, 96 and 192 kHz',()=>{
  for(const sr of [44100,48000,96000,192000])for(const hz of [32.703,41.203,55,65.406,220,440,1500,2093.005]){
    const p=pitch(signal(hz,sr,.3,.003),sr);
    assert.ok(p,`Missing quiet ${hz} Hz at ${sr}`);
    assert.ok(cents(p.frequency,hz)<5,`${hz} Hz at ${sr}: ${p.frequency}`);
  }
});
test('anti-alias filtering rejects an ultrasonic fold-down that would look like A4',()=>{
  for(const sr of [48000,96000,192000])assert.equal(pitch(signal(11560,sr),sr),null);
  assert.equal(pitch(new Float32Array(4096).fill(.4),48000),null);
  assert.equal(pitch(Float32Array.from({length:4096},()=>NaN),48000),null);
});
test('continuous analysis retains fast 200 ms notes and is independent of block partitioning',()=>{
  const sr=48000,notes=[261.626,293.665,329.628,349.228,391.995,440,493.883,523.251];
  const samples=new Float32Array(sr*3.2);let at=0;
  for(const hz of [...notes,...notes]){samples.set(signal(hz,sr,.2),at);at+=sr*.2;}
  const regular=new AudioAnalysis(sr),irregular=new AudioAnalysis(sr);
  feed(regular,samples);feed(irregular,samples,[128,256,4096,37,1024]);
  assert.deepEqual(irregular.histogram,regular.histogram);
  assert.equal(irregular.frames,regular.frames);
  assert.ok(regular.voicedSeconds>2.5);
  assert.equal(regular.finish().distinct,7);
  assert.equal(regular.finish().candidates[0].label,'C');
});
test('sample-clock duration and coverage cannot exceed the exact ten-second limit',()=>{
  const sr=48000,analysis=new AudioAnalysis(sr);
  analysis.push(signal(220,sr,10.04),0);
  const result=analysis.finish({totalSamples:480000});
  assert.equal(result.duration,10);assert.equal(result.audio.samples,480000);
  assert.equal(result.audio.gaps,0);assert.ok(result.voicedSeconds<=10);
});
test('silence and random noise do not accumulate stable notes',()=>{
  const sr=48000,silence=new AudioAnalysis(sr),noise=new AudioAnalysis(sr);
  feed(silence,new Float32Array(sr));
  let seed=937;const samples=Float32Array.from({length:sr},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return .1*(seed/4294967296-.5);});
  feed(noise,samples);
  assert.equal(silence.finish().candidates.length,0);
  assert.equal(noise.finish().candidates.length,0);
});
test('missing samples, interruption and a mismatched final count disable automatic sharing',()=>{
  const major=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
  for(const fault of ['gap','end','interrupted']){
    const analysis=new AudioAnalysis(48000);analysis.histogram=[...major];analysis.voicedSeconds=8;analysis.claritySeconds=7.9;analysis.totalSamples=480000;
    if(fault==='gap')analysis.push(new Float32Array(),400000);
    const r=analysis.finish({interrupted:fault==='interrupted',totalSamples:fault==='end'?480001:480000});
    assert.equal(r.reliable,false);assert.equal(r.interrupted,true);
  }
});
test('worklet transfers every sample exactly once with variable render block sizes and no speaker output',async()=>{
  for(const sr of [44100,48000,192000]){
    const messages=[];
    const target={postMessage:(data,transfer)=>messages.push(structuredClone(data,{transfer})),close(){}};
    const processor=await worklet(sr,.21,target),input=signal(220,sr,.25),blocks=[128,256,64,1024];
    let at=0,part=0;
    while(at<input.length){const end=Math.min(input.length,at+blocks[part++%blocks.length]);const output=new Float32Array(end-at);processor.process([[input.subarray(at,end)]],[[output]]);assert.ok(output.every(x=>x===0));at=end;}
    const frames=messages.filter(m=>m.type==='samples');let offset=0;
    for(const frame of frames){assert.equal(frame.offset,offset);assert.deepEqual(frame.samples,input.subarray(offset,offset+frame.samples.length));offset+=frame.samples.length;}
    assert.equal(offset,Math.round(sr*.21));assert.equal(messages.at(-1).type,'end');assert.equal(messages.at(-1).totalSamples,offset);assert.equal(messages.filter(m=>m.type==='end').length,1);
  }
});
test('manual stop flushes a partial final block before the end message',async()=>{
  const messages=[],processor=await worklet(48000,10,{postMessage:(m,t)=>messages.push(structuredClone(m,{transfer:t})),close(){}});
  processor.process([[signal(220,48000,128/48000)]]);
  processor.port.onmessage({data:{type:'stop',interrupted:true}});
  assert.equal(messages[0].samples.length,128);assert.equal(messages[1].totalSamples,128);assert.equal(messages[1].interrupted,true);
  assert.equal(processor.process([[]]),false);
});
test('real MessageChannel drains all ten seconds through the Worker even without any UI animation', {timeout:15000},async()=>{
  const workerUrl=new URL('../public/audio-worker.js',import.meta.url).href;
  const boot=`const {parentPort}=require('node:worker_threads'); globalThis.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};parentPort.on('message',data=>self.onmessage?.({data}));import(${JSON.stringify(workerUrl)}).then(()=>parentPort.postMessage({type:'loaded'}));`;
  const worker=new Worker(boot,{eval:true});
  const messages=[];
  try{
    const waitFor=type=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{cleanup();reject(new Error('Missing '+type));},10000);const handler=data=>{if(data.type===type){cleanup();resolve(data);}};const cleanup=()=>{clearTimeout(timeout);worker.off('message',handler);};worker.on('message',handler);});
    worker.on('message',data=>messages.push(data));
    await waitFor('loaded');
    const {port1,port2}=new MessageChannel(),ready=waitFor('ready');
    worker.postMessage({type:'connect',sampleRate:48000,duration:10,port:port1},[port1]);await ready;
    const result=waitFor('result'),processor=await worklet(48000,10,port2);
    const input=signal(220,48000,10);
    // Deliberately deliver the whole capture synchronously; no rAF or UI pump.
    for(let at=0;at<input.length;at+=128)processor.process([[input.subarray(at,at+128)]]);
    const {result:analysis}=await result;
    assert.equal(analysis.duration,10);assert.equal(analysis.audio.samples,480000);assert.equal(analysis.audio.gaps,0);assert.equal(analysis.interrupted,false);assert.ok(analysis.voicedSeconds>9.5);
    assert.equal(messages.filter(m=>m.type==='result').length,1);
    assert.ok(messages.filter(m=>m.type==='pitch').length<=126);
  }finally{await worker.terminate();}
});
