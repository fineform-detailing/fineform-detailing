import { YinDetector, StreamDecimator, estimateKey } from './dsp.js';

// Sample-clock driven. Neither DOM scheduling nor display refresh controls analysis.
export class AudioAnalysis {
  constructor(sampleRate, duration = 10) {
    this.sampleRate = sampleRate;
    this.limit = Math.round(sampleRate * duration);
    this.decimator = new StreamDecimator(sampleRate);
    this.rate = this.decimator.sampleRate;
    this.window = new Float32Array(2048);
    this.frame = new Float32Array(2048);
    this.detector = new YinDetector(this.rate);
    this.hop = Math.round(this.rate * 0.04);
    this.histogram = new Array(12).fill(0);
    this.write = this.filled = this.sinceFrame = this.totalSamples = 0;
    this.voicedSeconds = this.claritySeconds = this.frames = this.gaps = 0;
    this.pending = null;
    this.lastPitch = null;
    this.lastUpdate = 0;
    this.rms = this.peak = this.clipped = 0;
    this.closed = false;
  }

  push(samples, offset = this.totalSamples) {
    if (this.closed) return null;
    if (offset !== this.totalSamples) { this.gaps++; this.pending = null; }
    let power = 0, peak = 0, clipped = 0;
    const count = Math.min(samples.length, this.limit - this.totalSamples);
    for (let i = 0; i < count; i++) {
      const raw = samples[i];
      const value = Number.isFinite(raw) ? raw : 0;
      if (!Number.isFinite(raw)) this.gaps++;
      power += value * value;
      peak = Math.max(peak, Math.abs(value));
      if (Math.abs(value) >= 0.98) clipped++;
      const filtered = this.decimator.push(value);
      if (filtered === null) continue;
      this.window[this.write] = filtered;
      this.write = (this.write + 1) % this.window.length;
      this.filled = Math.min(this.window.length, this.filled + 1);
      this.sinceFrame++;
      if (this.filled === this.window.length && this.sinceFrame >= this.hop) {
        this.sinceFrame = 0;
        this.frame.set(this.window.subarray(this.write));
        this.frame.set(this.window.subarray(0, this.write), this.window.length - this.write);
        this.lastPitch = this.detector.detect(this.frame);
        this.addPitch(this.lastPitch, this.hop / this.rate);
        this.frames++;
      }
    }
    this.totalSamples += count;
    this.rms = count ? Math.sqrt(power / count) : 0;
    this.peak = peak;
    this.clipped = count ? clipped / count : 0;
    if (this.duration - this.lastUpdate < 0.08) return null;
    this.lastUpdate = this.duration;
    const wave = new Float32Array(128);
    for (let i = 0; i < wave.length; i++) wave[i] = this.window[(this.write + Math.floor(i * this.window.length / wave.length)) % this.window.length];
    return { type: 'pitch', pitch: this.lastPitch, voicedSeconds: this.voicedSeconds, duration: this.duration, rms: this.rms, clipped: this.clipped, wave };
  }

  addPitch(p, delta) {
    if (!p) { this.pending = null; return; }
    // Confirm in 80 ms, then credit its onset. Changed notes earn a new confirmation.
    if (this.pending?.note !== p.rounded) {
      this.pending = { note: p.rounded, seconds: delta, clarity: p.clarity * delta, confirmed: false };
      return;
    }
    const credited = this.pending.confirmed ? delta : this.pending.seconds + delta;
    const clarity = this.pending.confirmed ? p.clarity * delta : this.pending.clarity + p.clarity * delta;
    this.pending.confirmed = true;
    this.histogram[((p.rounded % 12) + 12) % 12] += credited;
    this.voicedSeconds += credited;
    this.claritySeconds += clarity;
  }

  get duration() { return this.totalSamples / this.sampleRate; }

  finish({ interrupted = false, totalSamples = this.totalSamples } = {}) {
    this.closed = true;
    if (totalSamples !== this.totalSamples) this.gaps++;
    const result = estimateKey(this.histogram, {
      voicedSeconds: this.voicedSeconds, duration: this.duration,
      clarity: this.voicedSeconds ? this.claritySeconds / this.voicedSeconds : 0
    });
    result.interrupted = interrupted || this.gaps > 0;
    if (result.interrupted) result.reliable = false;
    result.audio = { sampleRate: this.sampleRate, samples: this.totalSamples, gaps: this.gaps, frames: this.frames };
    return result;
  }
}
