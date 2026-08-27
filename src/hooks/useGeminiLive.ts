'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { GEMINI_LIVE_CONFIG } from '@/lib/gemini-live-config';
import { arrayBufferToBase64, base64ToArrayBuffer } from '@/lib/audio/pcm';

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export interface TranscriptEntry {
  id: number;
  role: 'operator' | 'agent';
  text: string;
}

interface UseGeminiLive {
  status: LiveStatus;
  error: string | null;
  connected: boolean;
  muted: boolean;
  inputLevel: number; // 0..1, smoothed mic RMS for the UI meter
  transcript: TranscriptEntry[];
  partialOperator: string;
  partialAgent: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  /** Send a single JPEG frame (data URL or bare base64) as realtime video input. */
  sendFrame: (jpeg: string) => void;
  /** Inject a side note into the conversation without ending the operator's turn. */
  sendNote: (text: string) => void;
}

const stripDataUrl = (s: string) => {
  const comma = s.indexOf(',');
  return s.slice(0, 5) === 'data:' && comma !== -1 ? s.slice(comma + 1) : s;
};

export function useGeminiLive(): UseGeminiLive {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [partialOperator, setPartialOperator] = useState('');
  const [partialAgent, setPartialAgent] = useState('');

  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const micNodeRef = useRef<AudioWorkletNode | null>(null);
  const playerRef = useRef<AudioWorkletNode | null>(null);
  const mutedRef = useRef(false);
  const levelRef = useRef(0);
  const idRef = useRef(0);
  const opBufRef = useRef('');
  const agentBufRef = useRef('');
  const closingRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Push mic level into React state on a gentle cadence (not every audio chunk).
  useEffect(() => {
    const id = setInterval(() => setInputLevel(levelRef.current), 100);
    return () => clearInterval(id);
  }, []);

  const flushTranscript = useCallback(() => {
    const op = opBufRef.current.trim();
    const ag = agentBufRef.current.trim();
    const additions: TranscriptEntry[] = [];
    if (op) additions.push({ id: ++idRef.current, role: 'operator', text: op });
    if (ag) additions.push({ id: ++idRef.current, role: 'agent', text: ag });
    if (additions.length) setTranscript((prev) => [...prev, ...additions]);
    opBufRef.current = '';
    agentBufRef.current = '';
    setPartialOperator('');
    setPartialAgent('');
  }, []);

  const teardown = useCallback(() => {
    closingRef.current = true;
    try {
      sessionRef.current?.close?.();
    } catch {
      /* noop */
    }
    sessionRef.current = null;

    micNodeRef.current?.disconnect();
    micNodeRef.current = null;
    playerRef.current?.disconnect();
    playerRef.current = null;

    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    inCtxRef.current?.close().catch(() => {});
    inCtxRef.current = null;
    outCtxRef.current?.close().catch(() => {});
    outCtxRef.current = null;

    levelRef.current = 0;
    setInputLevel(0);
  }, []);

  const disconnect = useCallback(() => {
    teardown();
    flushTranscript();
    setStatus('idle');
  }, [teardown, flushTranscript]);

  const handleMessage = useCallback(
    (msg: any) => {
      const sc = msg?.serverContent;

      // --- audio out ---
      const parts: any[] = sc?.modelTurn?.parts || [];
      for (let i = 0; i < parts.length; i++) {
        const inline = parts[i]?.inlineData;
        if (inline?.data && String(inline.mimeType || '').indexOf('audio/pcm') === 0) {
          const buf = base64ToArrayBuffer(inline.data);
          playerRef.current?.port.postMessage({ type: 'audio', buffer: buf }, [buf]);
          if (!closingRef.current) setStatus('speaking');
        }
      }
      // Some SDK versions expose the audio via a convenience getter.
      if (typeof msg?.data === 'string' && msg.data.length > 0 && parts.length === 0) {
        const buf = base64ToArrayBuffer(msg.data);
        playerRef.current?.port.postMessage({ type: 'audio', buffer: buf }, [buf]);
        if (!closingRef.current) setStatus('speaking');
      }

      // --- transcription ---
      const inT = sc?.inputTranscription?.text;
      if (inT) {
        opBufRef.current += inT;
        setPartialOperator(opBufRef.current);
      }
      const outT = sc?.outputTranscription?.text;
      if (outT) {
        agentBufRef.current += outT;
        setPartialAgent(agentBufRef.current);
      }

      if (sc?.interrupted) {
        playerRef.current?.port.postMessage({ type: 'flush' });
      }
      if (sc?.turnComplete) {
        flushTranscript();
        if (!closingRef.current) setStatus('listening');
      }
    },
    [flushTranscript]
  );

  const connect = useCallback(async () => {
    if (sessionRef.current || status === 'connecting') return;
    closingRef.current = false;
    setError(null);
    setStatus('connecting');
    setTranscript([]);
    opBufRef.current = '';
    agentBufRef.current = '';
    setPartialOperator('');
    setPartialAgent('');

    try {
      const res = await fetch('/api/gemini-live');
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Token request failed (${res.status})`);
      const { token, model } = data as { token: string; model: string };

      // --- audio graph (needs the click gesture that triggered connect) ---
      const outCtx = new AudioContext({ sampleRate: GEMINI_LIVE_CONFIG.OUTPUT_SAMPLE_RATE });
      await outCtx.audioWorklet.addModule(GEMINI_LIVE_CONFIG.WORKLET_PLAYER_URL);
      const player = new AudioWorkletNode(outCtx, 'live-audio-out-worklet');
      player.connect(outCtx.destination);
      outCtxRef.current = outCtx;
      playerRef.current = player;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      micStreamRef.current = stream;
      const inCtx = new AudioContext();
      await inCtx.audioWorklet.addModule(GEMINI_LIVE_CONFIG.WORKLET_MIC_URL);
      const source = inCtx.createMediaStreamSource(stream);
      const micNode = new AudioWorkletNode(inCtx, 'live-mic-worklet');
      micNode.port.onmessage = (e: MessageEvent) => {
        const d = e.data;
        if (!d || d.type !== 'audio') return;
        levelRef.current = levelRef.current * 0.8 + Math.min(1, d.rms * 4) * 0.2;
        if (mutedRef.current || !sessionRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: arrayBufferToBase64(d.buffer), mimeType: 'audio/pcm;rate=16000' },
          });
        } catch {
          /* socket closed mid-flight */
        }
      };
      const silentSink = inCtx.createGain();
      silentSink.gain.value = 0;
      source.connect(micNode);
      micNode.connect(silentSink);
      silentSink.connect(inCtx.destination);
      inCtxRef.current = inCtx;
      micNodeRef.current = micNode;

      // --- live session ---
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: GEMINI_LIVE_CONFIG.API_VERSION },
      });

      const session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            if (!closingRef.current) setStatus('listening');
          },
          onmessage: handleMessage,
          onerror: (e: any) => {
            if (closingRef.current) return;
            setError(e?.message || 'Live session error');
            setStatus('error');
          },
          onclose: () => {
            if (closingRef.current) return;
            teardown();
            setStatus('idle');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: GEMINI_LIVE_CONFIG.SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
      sessionRef.current = session;
    } catch (err: any) {
      console.error('[useGeminiLive] connect failed', err);
      teardown();
      setError(err?.message || 'Failed to start the live session');
      setStatus('error');
    }
  }, [status, handleMessage, teardown]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const sendFrame = useCallback((jpeg: string) => {
    if (!sessionRef.current || !jpeg) return;
    try {
      sessionRef.current.sendRealtimeInput({
        media: { data: stripDataUrl(jpeg), mimeType: 'image/jpeg' },
      });
    } catch {
      /* socket closed */
    }
  }, []);

  const sendNote = useCallback((text: string) => {
    if (!sessionRef.current || !text) return;
    try {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: false,
      });
    } catch {
      /* socket closed */
    }
  }, []);

  // Tear down on unmount.
  useEffect(() => () => teardown(), [teardown]);

  return {
    status,
    error,
    connected: status === 'listening' || status === 'speaking',
    muted,
    inputLevel,
    transcript,
    partialOperator,
    partialAgent,
    connect,
    disconnect,
    toggleMute,
    sendFrame,
    sendNote,
  };
}
