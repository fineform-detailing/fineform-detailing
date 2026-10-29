// YIN difference function + cumulative mean normalization; A4 = 440 Hz.
export const NOTES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
export const SOLFEGE = ['Dó','Dó sustenido','Ré','Mi bemol','Mi','Fá','Fá sustenido','Sol','Lá bemol','Lá','Si bemol','Si'];
const MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MINOR=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
// Streaming Blackman-windowed FIR: suppress frequencies above the analysis
// Nyquist limit before downsampling. Its state survives every audio block.
export class StreamDecimator {
  constructor(sampleRate) {
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 384000) throw new RangeError('Unsupported audio sample rate');
    this.step = Math.max(1, Math.floor(sampleRate / 12000));
    this.sampleRate = sampleRate / this.step;
    this.phase = this.position = 0;
    const length = this.step === 1 ? 1 : 16 * this.step + 1;
    this.history = new Float64Array(length);
    this.kernel = new Float64Array(length);
    if (length === 1) { this.kernel[0] = 1; return; }
    const cutoff = 0.4 / this.step, middle = (length - 1) / 2;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const t = i - middle;
      const sinc = t === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * t) / (Math.PI * t);
      const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (length - 1));
      this.kernel[i] = sinc * window; sum += this.kernel[i];
    }
    for (let i = 0; i < length; i++) this.kernel[i] /= sum;
  }
  push(value) {
    if (this.step === 1) return value;
    this.history[this.position] = value;
    if (++this.position === this.history.length) this.position = 0;
    if (++this.phase !== this.step) return null;
    this.phase = 0;
    let out = 0, at = this.position;
    for (let i = 0; i < this.kernel.length; i++) {
      if (--at < 0) at = this.history.length - 1;
      out += this.kernel[i] * this.history[at];
    }
    return out;
  }
}

// Reusable scratch storage and early YIN minimum detection bound mobile CPU/GC.
export class YinDetector {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.x = new Float64Array(4096);
    this.diff = new Float64Array(Math.ceil(sampleRate / 32) + 3);
  }
  detect(samples) {
    const n = samples.length, sr = this.sampleRate;
    if (n < 128) return null;
    if (n > this.x.length) this.x = new Float64Array(n);
    const x = this.x, diff = this.diff;
    let mean = 0;
    for (let i = 0; i < n; i++) { if (!Number.isFinite(samples[i])) return null; mean += samples[i]; }
    mean /= n;
    let power = 0;
    for (let i = 0; i < n; i++) { x[i] = samples[i] - mean; power += x[i] * x[i]; }
    const rms = Math.sqrt(power / n);
    if (rms < 0.001) return null;
    const maxTau = Math.min(Math.ceil(sr / 32) + 1, Math.floor(n / 2) - 1);
    const minTau = Math.max(2, Math.floor(sr / 2100));
    const window = Math.min(1024, n - maxTau);
    diff[0] = 1;
    let running = 0, found = -1;
    for (let tau = 1; tau <= maxTau; tau++) {
      let total = 0;
      for (let j = 0; j < window; j++) { const delta = x[j] - x[j + tau]; total += delta * delta; }
      running += total;
      diff[tau] = running ? total * tau / running : 1;
      if (tau > minTau && diff[tau - 1] < 0.12 && diff[tau] >= diff[tau - 1]) { found = tau - 1; break; }
    }
    if (found < 0) return null;
    const clarity = 1 - diff[found];
    if (clarity < 0.88) return null;
    const a = diff[found - 1], b = diff[found], c = diff[found + 1], denom = a - 2 * b + c;
    let refined = found + (denom ? 0.5 * (a - c) / denom : 0), multiple = 1;
    // Short high notes have few samples per cycle. Refine over multiple cycles
    // using raw differences to avoid normalized-parabola bias in the treble.
    if (sr / refined > 300) {
      multiple = Math.min(8, Math.floor((n - window - 3) / (refined + 1)));
      if (multiple > 1) {
        const center = Math.round(refined * multiple);
        const difference = lag => { let sum = 0; for (let j = 0; j < window; j++) { const d = x[j] - x[j + lag]; sum += d * d; } return sum; };
        let lag = center, best = Infinity;
        for (let t = center - 2; t <= center + 2; t++) { const value = difference(t); if (value < best) { best = value; lag = t; } }
        const left = difference(lag - 1), right = difference(lag + 1), denominator = left - 2 * best + right;
        refined = lag + (denominator ? 0.5 * (left - right) / denominator : 0);
      } else multiple = 1;
    }
    const frequency = sr * multiple / refined;
    if (!Number.isFinite(frequency) || frequency < 32 || frequency > 2100) return null;
    const midi = 69 + 12 * Math.log2(frequency / 440), rounded = Math.round(midi);
    return { frequency, midi, rounded, note: NOTES[((rounded % 12) + 12) % 12], octave: Math.floor(rounded / 12) - 1, cents: Math.round((midi - rounded) * 100), clarity, rms };
  }
}
export function pitch(samples, sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 384000 || samples.length < 1024) return null;
  const decimator = new StreamDecimator(sampleRate);
  const reduced = new Float32Array(Math.floor(samples.length / decimator.step));
  let length = 0;
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) return null;
    const value = decimator.push(samples[i]);
    if (value !== null) reduced[length++] = value;
  }
  return new YinDetector(decimator.sampleRate).detect(reduced.subarray(0, length));
}
function correlation(a,b) {
  const ma=a.reduce((s,x)=>s+x,0)/12,mb=b.reduce((s,x)=>s+x,0)/12;
  let dot=0,aa=0,bb=0;for(let i=0;i<12;i++){const x=a[i]-ma,y=b[i]-mb;dot+=x*y;aa+=x*x;bb+=y*y;}
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
export function estimateKey(histogram,{voicedSeconds=0,duration=0,clarity=0}={}) {
  const total=histogram.reduce((s,x)=>s+x,0),distinct=histogram.filter(x=>x>total*0.035).length;
  if(!total)return {candidates:[],confidence:0,reliable:false,reason:'Cante uma melodia para começar.',distinct,voicedSeconds,duration};
  const candidates=[];
  for(const [mode,profile] of [['major',MAJOR],['minor',MINOR]])for(let tonic=0;tonic<12;tonic++){
    const rotated=Array.from({length:12},(_,i)=>profile[(i-tonic+12)%12]);
    candidates.push({tonic,mode,score:correlation(histogram,rotated),label:NOTES[tonic]+(mode==='minor'?'m':'')});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0],margin=best.score-candidates[1].score;
  // A quality index, NOT a calibrated probability of the key being correct.
  const confidence=Math.round(100*Math.min(1,Math.max(0,best.score))*Math.min(1,distinct/5)*Math.min(1,voicedSeconds/4)*(0.65+0.35*Math.min(1,margin/0.15)));
  const reliable=duration>=8&&voicedSeconds>=4&&distinct>=5&&best.score>=0.70&&margin>=0.08&&clarity>=0.90&&confidence>=72;
  let reason='Confira a sugestão com o ouvido antes de tocar.';
  if(duration<8||voicedSeconds<4)reason='Cante um trecho mais longo, com a voz próxima do microfone.';
  else if(distinct<5)reason='Poucas notas diferentes. Cante outra parte da melodia.';
  else if(margin<0.08)reason='Há tons próximos na análise. Escolha e confirme com a banda.';
  else if(!reliable)reason='A melodia não definiu o tom com clareza. Confirme manualmente.';
  return {candidates:candidates.slice(0,3),confidence,reliable,reason,distinct,voicedSeconds,duration,margin,clarity};
}
export function keyLabel(tonic,mode) {return NOTES[tonic]+(mode==='minor'?'m':'');}
export function keyName(tonic,mode) {return SOLFEGE[tonic]+' '+(mode==='minor'?'menor':'maior');}
