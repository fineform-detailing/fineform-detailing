import { AudioAnalysis } from './audio-analysis.js';

let analysis = null, port = null, done = false;
function finish(options) {
  if (done || !analysis) return;
  done = true;
  self.postMessage({ type: 'result', result: analysis.finish(options) });
  port?.close();
}
self.onmessage = ({ data }) => {
  if (data.type === 'connect') {
    analysis = new AudioAnalysis(data.sampleRate, data.duration);
    port = data.port;
    port.onmessage = ({ data: frame }) => {
      if (done) return;
      if (frame.type === 'end') { finish(frame); return; }
      if (frame.type !== 'samples') return;
      const update = analysis.push(frame.samples, frame.offset);
      if (update) self.postMessage(update, [update.wave.buffer]);
    };
    port.start();
    self.postMessage({ type: 'ready' });
  }
  // Timeout/interruption returns only the processed part, always manual-only.
  if (data.type === 'finish') finish({ interrupted: true });
};
