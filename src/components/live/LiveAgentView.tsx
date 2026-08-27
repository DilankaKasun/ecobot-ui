'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import {
  Bot,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  SwitchCamera,
  Radio,
  Loader2,
  AlertTriangle,
  VideoOff,
} from 'lucide-react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { GEMINI_LIVE_CONFIG } from '@/lib/gemini-live-config';

interface AgentSource {
  key: string;
  label: string;
  track: RemoteTrack;
}

const STATUS_TEXT: Record<string, string> = {
  idle: 'Idle',
  connecting: 'Connecting to Gemini Live…',
  listening: 'Listening',
  speaking: 'Speaking',
  error: 'Error',
};

export const LiveAgentView: React.FC = () => {
  const {
    isConnected: lkConnected,
    mainCameraTrack,
    wristCameraTrack,
    detectionOverlayTrack,
  } = useLiveKit();

  const {
    status,
    error,
    connected,
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
  } = useGeminiLive();

  const sources = useMemo<AgentSource[]>(() => {
    const list: AgentSource[] = [];
    if (mainCameraTrack) list.push({ key: 'main', label: 'Main Navigation Cam', track: mainCameraTrack });
    if (wristCameraTrack) list.push({ key: 'wrist', label: 'Wrist / Arm Cam', track: wristCameraTrack });
    if (detectionOverlayTrack)
      list.push({ key: 'detection', label: 'Detection Overlay', track: detectionOverlayTrack });
    return list;
  }, [mainCameraTrack, wristCameraTrack, detectionOverlayTrack]);

  const [sourceIdx, setSourceIdx] = useState(0);
  const activeSource = sources.length ? sources[sourceIdx % sources.length] : null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Attach the selected robot track to the local <video> we capture frames from.
  useEffect(() => {
    const el = videoRef.current;
    const track = activeSource?.track;
    if (!el || !track) return;
    try {
      track.attach(el);
    } catch {
      /* noop */
    }
    return () => {
      try {
        track.detach(el);
      } catch {
        /* noop */
      }
    };
  }, [activeSource?.track]);

  // Clamp the selected index if the available source list shrinks.
  useEffect(() => {
    if (sourceIdx !== 0 && sourceIdx >= sources.length) setSourceIdx(0);
  }, [sources.length, sourceIdx]);

  const cycleSource = useCallback(() => {
    if (sources.length < 2) return;
    setSourceIdx((i) => {
      const next = (i + 1) % sources.length;
      if (connected) sendNote(`[Operator switched your camera view to: ${sources[next].label}]`);
      return next;
    });
  }, [sources, connected, sendNote]);

  // Pump ~1 fps JPEG frames from the active feed into the live session.
  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || !v.videoWidth) return;
      const scale = Math.min(1, GEMINI_LIVE_CONFIG.FRAME_MAX_WIDTH / v.videoWidth);
      c.width = Math.max(2, Math.round(v.videoWidth * scale));
      c.height = Math.max(2, Math.round(v.videoHeight * scale));
      const ctx = c.getContext('2d');
      if (!ctx) return;
      try {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        sendFrame(c.toDataURL('image/jpeg', GEMINI_LIVE_CONFIG.FRAME_JPEG_QUALITY));
      } catch {
        /* tainted canvas / not ready */
      }
    }, GEMINI_LIVE_CONFIG.FRAME_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [connected, sendFrame, activeSource?.key]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript.length, partialOperator, partialAgent]);

  const noFeed = sources.length === 0;
  const busy = status === 'connecting';

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
      {/* --- LEFT: what the agent sees --- */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 order-1">
        <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-white/5 bg-black/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          {/* video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* empty state */}
          {noFeed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 px-6 bg-background/80">
              <VideoOff className="w-10 h-10 text-danger/60" />
              <p className="text-sm font-semibold text-gray-200">No robot camera available for the agent</p>
              <p className="text-xs text-gray-500 max-w-sm">
                The Live Agent sees the robot through LiveKit WebRTC tracks. Connect LiveKit
                {lkConnected ? ' and wait for a camera track to publish' : ' from the Configuration page'} to
                give the agent eyes.
              </p>
            </div>
          )}

          {/* top-left: source label */}
          {activeSource && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-primary/40 text-primary font-mono text-[10px] px-2 py-0.5 rounded-md">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                AGENT VIEW
              </span>
              <span className="bg-black/60 backdrop-blur-sm border border-white/10 text-gray-200 font-mono text-[10px] px-2 py-0.5 rounded-md">
                {activeSource.label}
              </span>
            </div>
          )}

          {/* top-right: camera switch */}
          <button
            onClick={cycleSource}
            disabled={sources.length < 2}
            title={
              sources.length < 2
                ? 'Only one robot camera is available'
                : 'Switch which camera the agent sees'
            }
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/60 hover:bg-black/80 text-gray-200 border border-white/10 backdrop-blur-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SwitchCamera className="w-4 h-4" />
            <span className="hidden sm:inline">Switch Camera</span>
          </button>

          {/* bottom-center: status pill */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md text-[11px] font-mono font-semibold border ${
                status === 'error'
                  ? 'bg-danger/15 border-danger/40 text-danger'
                  : connected
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-black/60 border-white/10 text-gray-300'
              }`}
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {status === 'speaking' && <Bot className="w-3 h-3 animate-pulse" />}
              {status === 'listening' && <Mic className="w-3 h-3" />}
              <span>{STATUS_TEXT[status] || status}</span>
              {connected && (
                <span className="ml-1 flex items-end gap-[2px] h-3">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className="w-[3px] bg-current rounded-sm transition-all duration-100"
                      style={{ height: `${Math.max(3, Math.min(12, inputLevel * 12 * (1 + n * 0.4)))}px` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* control bar */}
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
          {!connected ? (
            <button
              onClick={connect}
              disabled={busy || noFeed}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-black shadow-[0_0_15px_rgba(0,229,192,0.4)] hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              {busy ? 'Connecting…' : 'Start Live Session'}
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  muted
                    ? 'bg-danger/20 border-danger/40 text-danger'
                    : 'bg-card/40 border-white/10 text-gray-200 hover:bg-white/5'
                }`}
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {muted ? 'Mic Muted' : 'Mic Live'}
              </button>
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-danger/90 text-white hover:bg-danger transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                End Session
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="shrink-0 flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* --- RIGHT: transcript --- */}
      <div className="order-2 lg:w-80 shrink-0 flex flex-col min-h-0 max-h-[32vh] lg:max-h-none rounded-xl border border-white/5 bg-card/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-gray-100">Conversation</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-sm">
          {transcript.length === 0 && !partialOperator && !partialAgent && (
            <p className="text-xs text-gray-500 leading-relaxed">
              Start the session, then just talk. Ask the agent what it sees, where obstacles are, or to
              identify a plant. Use <span className="text-gray-300 font-semibold">Switch Camera</span> to
              change its point of view.
            </p>
          )}
          {transcript.map((entry) => (
            <div key={entry.id} className={entry.role === 'agent' ? 'text-gray-200' : 'text-primary'}>
              <span className="block text-[10px] font-mono uppercase tracking-wider opacity-60 mb-0.5">
                {entry.role === 'agent' ? 'EcoBot Copilot' : 'Operator'}
              </span>
              <p className="leading-snug whitespace-pre-wrap">{entry.text}</p>
            </div>
          ))}
          {partialOperator && (
            <div className="text-primary/70">
              <span className="block text-[10px] font-mono uppercase tracking-wider opacity-60 mb-0.5">
                Operator
              </span>
              <p className="leading-snug italic">{partialOperator}</p>
            </div>
          )}
          {partialAgent && (
            <div className="text-gray-300/80">
              <span className="block text-[10px] font-mono uppercase tracking-wider opacity-60 mb-0.5">
                EcoBot Copilot
              </span>
              <p className="leading-snug italic">{partialAgent}</p>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
};
