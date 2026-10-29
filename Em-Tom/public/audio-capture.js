// Owns one microphone session. AudioWorklet -> MessagePort -> Worker bypasses
// the main thread completely; requestAnimationFrame only paints progress.
export class AudioCapture {
  constructor({ duration = 10, onPitch, onProgress, onFinishing, onResult, onError } = {}) {
    this.duration = duration;
    Object.assign(this, { onPitch, onProgress, onFinishing, onResult, onError });
    this.active = this.finishing = this.aborted = this.completed = this.interrupted = false;
  }

  async start() {
    try {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context || !navigator.mediaDevices?.getUserMedia) throw new Error('Use um navegador atualizado e abra o site por HTTPS.');
      try { this.context = new Context({ sampleRate: 48000, latencyHint: 'interactive' }); }
      catch { this.context = new Context({ latencyHint: 'interactive' }); }
      const context = this.context;
      await context.resume();
      this.assertCurrent();
      if (!context.audioWorklet || !globalThis.AudioWorkletNode) throw new Error('Atualize seu navegador para usar a captura de áudio contínua.');
      const constraints = { channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      if (navigator.mediaDevices.getSupportedConstraints?.().voiceIsolation) constraints.voiceIsolation = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });
      if (this.aborted) { stream.getTracks().forEach(track => track.stop()); this.assertCurrent(); }
      this.stream = stream;
      await context.audioWorklet.addModule('/audio-worklet.js');
      this.assertCurrent();
      this.worker = new Worker('/audio-worker.js', { type: 'module' });
      this.node = new AudioWorkletNode(context, 'em-tom-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { duration: this.duration } });
      const channel = new MessageChannel();
      await new Promise((resolve, reject) => {
        let workerReady = false, nodeReady = false;
        this.rejectStart = reject;
        this.readyTimer = setTimeout(() => reject(new Error('O áudio demorou para iniciar. Tente novamente.')), 6000);
        const ready = () => { if (workerReady && nodeReady) { clearTimeout(this.readyTimer); this.rejectStart = null; resolve(); } };
        this.worker.onerror = () => { const error = new Error('A análise de áudio foi interrompida. Tente novamente.'); this.active ? this.fail(error) : reject(error); };
        this.worker.onmessageerror = () => this.fail(new Error('Não foi possível processar o áudio. Tente novamente.'));
        this.worker.onmessage = ({ data }) => {
          if (this.aborted || this.completed) return;
          if (data.type === 'ready') { workerReady = true; ready(); }
          if (data.type === 'pitch' && this.active) this.onPitch?.(data);
          if (data.type === 'result') this.complete(data.result);
        };
        this.node.onprocessorerror = () => this.fail(new Error('A captura de áudio foi interrompida. Tente novamente.'));
        this.node.port.onmessage = ({ data }) => {
          if (data.type === 'ready') { nodeReady = true; ready(); }
          if (data.type === 'ended' && this.active && !this.finishing) this.beginFinish();
        };
        this.worker.postMessage({ type: 'connect', sampleRate: context.sampleRate, duration: this.duration, port: channel.port1 }, [channel.port1]);
        this.node.port.postMessage({ type: 'connect', port: channel.port2 }, [channel.port2]);
      });
      this.assertCurrent();
      this.source = context.createMediaStreamSource(stream);
      this.silent = context.createGain();
      this.silent.gain.value = 0;
      this.active = true;
      this.startedAt = context.currentTime;
      stream.getAudioTracks().forEach(track => {
        track.onended = () => this.stop(true);
        track.onmute = () => this.stop(true);
      });
      context.onstatechange = () => { if (this.active && context.state !== 'running') this.stop(true); };
      this.source.connect(this.node).connect(this.silent).connect(context.destination);
      let lastDraw = -Infinity;
      const draw = time => {
        if (!this.active || this.finishing) return;
        if (time - lastDraw >= 80) {
          lastDraw = time;
          this.onProgress?.(Math.min(this.duration, Math.max(0, context.currentTime - this.startedAt)));
        }
        this.animation = requestAnimationFrame(draw);
      };
      this.animation = requestAnimationFrame(draw);
      // The worklet stops at the exact sample count. This catches missing input.
      this.watchdog = setTimeout(() => this.stop(true), (this.duration + 3) * 1000);
    } catch (error) {
      await this.dispose();
      throw error;
    }
  }

  assertCurrent() { if (this.aborted) throw new DOMException('Capture cancelled', 'AbortError'); }

  beginFinish() {
    if (this.finishing || !this.active) return;
    this.finishing = true;
    cancelAnimationFrame(this.animation);
    clearTimeout(this.watchdog);
    this.onFinishing?.();
    this.drainTimer = setTimeout(() => {
      this.interrupted = true;
      this.worker?.postMessage({ type: 'finish' });
      this.errorTimer = setTimeout(() => this.fail(new Error('A análise não respondeu. Ative o microfone novamente.')), 1500);
    }, 4000);
  }

  stop(interrupted = false) {
    if (!this.active || this.completed || this.aborted) return;
    this.interrupted ||= interrupted;
    if (this.finishing) return;
    this.beginFinish();
    this.node?.port.postMessage({ type: 'stop', interrupted: this.interrupted });
  }

  async complete(result) {
    if (this.completed || this.aborted) return;
    this.completed = true;
    result.interrupted ||= this.interrupted;
    if (result.interrupted) result.reliable = false;
    await this.cleanup();
    if (!this.aborted) this.onResult?.(result);
  }

  async fail(error) {
    if (this.aborted || this.completed) return;
    if (!this.active && this.rejectStart) { this.rejectStart(error); return; }
    this.rejectStart?.(error);
    await this.dispose();
    this.onError?.(error);
  }

  async cleanup() {
    this.active = false;
    for (const timer of [this.readyTimer, this.watchdog, this.drainTimer, this.errorTimer]) clearTimeout(timer);
    cancelAnimationFrame(this.animation);
    this.stream?.getTracks().forEach(track => { track.onended = track.onmute = null; track.stop(); });
    this.stream = null;
    this.source?.disconnect();
    this.node?.disconnect();
    this.node?.port.close();
    this.silent?.disconnect();
    this.worker?.terminate();
    this.worker = null;
    const context = this.context;
    this.context = null;
    if (context) { context.onstatechange = null; await context.close().catch(() => {}); }
  }

  async dispose() {
    this.aborted = true;
    this.rejectStart?.(new DOMException('Capture cancelled', 'AbortError'));
    this.rejectStart = null;
    await this.cleanup();
  }
}
