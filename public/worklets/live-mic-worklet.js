/**
 * Mic capture worklet for the Live Agent tab.
 * Downsamples the mic input (whatever `sampleRate` the context runs at) to
 * 16 kHz mono, converts to PCM16, and posts ~128 ms chunks to the main thread
 * along with a rough RMS level for the UI meter.
 */
class LiveMicWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._targetRate = 16000;
    this._ratio = sampleRate / this._targetRate;
    this._resampleBuf = [];
    this._readPos = 0;
    this._pcmAcc = [];
    this._chunkSamples = 2048; // ~128 ms at 16 kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this._resampleBuf.push(channel[i]);
    }

    // Linear-interpolation resample down to 16 kHz.
    const out = [];
    while (this._readPos + this._ratio < this._resampleBuf.length) {
      const i0 = Math.floor(this._readPos);
      const frac = this._readPos - i0;
      const a = this._resampleBuf[i0];
      const b = this._resampleBuf[i0 + 1] || 0;
      out.push(a + (b - a) * frac);
      this._readPos += this._ratio;
    }
    const consumed = Math.floor(this._readPos);
    if (consumed > 0) {
      this._resampleBuf.splice(0, consumed);
      this._readPos -= consumed;
    }
    if (out.length === 0) return true;

    let sumSq = 0;
    for (let i = 0; i < out.length; i++) {
      let v = out[i];
      if (v > 1) v = 1;
      else if (v < -1) v = -1;
      sumSq += v * v;
      this._pcmAcc.push(v < 0 ? v * 0x8000 : v * 0x7fff);
    }
    const rms = Math.sqrt(sumSq / out.length);

    while (this._pcmAcc.length >= this._chunkSamples) {
      const slice = this._pcmAcc.splice(0, this._chunkSamples);
      const pcm = new Int16Array(slice.length);
      for (let i = 0; i < slice.length; i++) pcm[i] = slice[i];
      this.port.postMessage({ type: 'audio', buffer: pcm.buffer, rms }, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor('live-mic-worklet', LiveMicWorklet);
