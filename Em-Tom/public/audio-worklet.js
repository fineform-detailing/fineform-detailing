// Only buffer/transfer audio here. Pitch detection stays in a separate Worker.
// Actual block lengths are used; render quanta need not always be 128 samples.
class EmTomCapture extends AudioWorkletProcessor {
  constructor({ processorOptions = {} } = {}) {
    super();
    this.limit = Math.round(sampleRate * Math.min(10, Math.max(0, processorOptions.duration ?? 10)));
    this.size = Math.max(128, Math.round(sampleRate * 0.02));
    this.buffer = new Float32Array(this.size);
    this.offset = this.written = 0;
    this.target = null;
    this.finished = false;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'connect') { this.target = data.port; this.port.postMessage({ type: 'ready' }); }
      if (data.type === 'stop') this.finish(!!data.interrupted);
    };
  }

  flush() {
    if (!this.offset || !this.target) return;
    const samples = this.offset === this.buffer.length ? this.buffer : this.buffer.slice(0, this.offset);
    this.target.postMessage({ type: 'samples', samples, offset: this.written - this.offset }, [samples.buffer]);
    this.offset = 0;
    this.buffer = new Float32Array(this.size);
  }

  finish(interrupted = false) {
    if (this.finished) return;
    this.finished = true;
    this.flush();
    this.target?.postMessage({ type: 'end', totalSamples: this.written, interrupted });
    this.port.postMessage({ type: 'ended' });
    this.target?.close();
  }

  process(inputs) {
    if (this.finished) return false;
    if (!this.target) return true;
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length && this.written < this.limit; i++) {
      let value = 0;
      for (let channel = 0; channel < channels.length; channel++) value += channels[channel][i] || 0;
      this.buffer[this.offset++] = value / channels.length;
      this.written++;
      if (this.offset === this.size) this.flush();
    }
    if (this.written >= this.limit) this.finish();
    // Outputs stay silent: never play the microphone through the speaker.
    return !this.finished;
  }
}
registerProcessor('em-tom-capture', EmTomCapture);
