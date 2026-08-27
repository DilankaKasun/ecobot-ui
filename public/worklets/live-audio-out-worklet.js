/**
 * Playback worklet for the Live Agent tab.
 * Receives 24 kHz mono PCM16 chunks from Gemini (posted as ArrayBuffers) and
 * streams them gaplessly to the output. Host must create the AudioContext with
 * { sampleRate: 24000 } so no resampling is needed here.
 *
 * Messages: { type: 'audio', buffer: ArrayBuffer<Int16> } | { type: 'flush' }
 */
class LiveAudioOutWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._queue = []; // Float32Array chunks waiting to play
    this._offset = 0;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'flush') {
        this._queue = [];
        this._offset = 0;
        return;
      }
      if (data.type === 'audio' && data.buffer) {
        const i16 = new Int16Array(data.buffer);
        const f32 = new Float32Array(i16.length);
        for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
        this._queue.push(f32);
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const ch0 = output[0];
    if (!ch0) return true;

    for (let i = 0; i < ch0.length; i++) {
      if (this._queue.length === 0) {
        ch0[i] = 0;
        continue;
      }
      const current = this._queue[0];
      ch0[i] = current[this._offset++];
      if (this._offset >= current.length) {
        this._queue.shift();
        this._offset = 0;
      }
    }
    // Mirror to any additional output channels.
    for (let c = 1; c < output.length; c++) output[c].set(ch0);
    return true;
  }
}

registerProcessor('live-audio-out-worklet', LiveAudioOutWorklet);
