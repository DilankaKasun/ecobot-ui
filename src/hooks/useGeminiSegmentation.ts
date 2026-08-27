'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SegObject {
  label: string;
  box: [number, number, number, number]; // x0,y0,x1,y1 in 0..1
  polygon: [number, number][] | null; // [x,y] in 0..1
  pngMask: string | null;
}

export type SegStatus = 'idle' | 'working' | 'ok' | 'error';

interface Options {
  /** ref to the element wrapping the <video>/<img> feed */
  sourceRef: React.RefObject<HTMLElement>;
  enabled: boolean;
  /** ms to wait between finishing one inference and starting the next */
  intervalMs?: number;
  /** longest edge (px) the captured frame is downscaled to before upload */
  maxEdge?: number;
  /** what to look for; passed straight to Gemini */
  prompt?: string;
  model?: string;
}

interface Result {
  objects: SegObject[];
  status: SegStatus;
  error: string | null;
  lastLatencyMs: number | null;
  model: string | null;
  /** trigger a single inference now (ignores interval) */
  runOnce: () => void;
}

function findMedia(root: HTMLElement | null): HTMLVideoElement | HTMLImageElement | null {
  if (!root) return null;
  const video = root.querySelector('video');
  if (video && video.readyState >= 2 && video.videoWidth > 0) return video as HTMLVideoElement;
  const img = root.querySelector('img');
  if (img && (img as HTMLImageElement).naturalWidth > 0) return img as HTMLImageElement;
  return video || (img as HTMLImageElement) || null;
}

export function useGeminiSegmentation({
  sourceRef,
  enabled,
  intervalMs = 2500,
  maxEdge = 640,
  prompt,
  model,
}: Options): Result {
  const [objects, setObjects] = useState<SegObject[]>([]);
  const [status, setStatus] = useState<SegStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [model_, setModel] = useState<string | null>(null);

  const runningRef = useRef(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const promptRef = useRef(prompt);
  const modelRef = useRef(model);
  promptRef.current = prompt;
  modelRef.current = model;

  const captureFrame = useCallback((): string | null => {
    const media = findMedia(sourceRef.current);
    if (!media) return null;

    const nw = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const nh = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!nw || !nh) return null;

    const scale = Math.min(1, maxEdge / Math.max(nw, nh));
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      ctx.drawImage(media, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
      // cross-origin MJPEG <img> taints the canvas
      throw new Error(
        'Cannot read this video feed (cross-origin frame capture blocked). Works with LiveKit / ROS-WSS feeds.',
      );
    }
  }, [sourceRef, maxEdge]);

  const runOnce = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('working');
    try {
      const dataUrl = captureFrame();
      if (!dataUrl) {
        setStatus((s) => (s === 'working' ? 'idle' : s));
        return;
      }
      const res = await fetch('/api/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          prompt: promptRef.current || undefined,
          model: modelRef.current || undefined,
        }),
      });
      const json = await res.json();
      if (cancelledRef.current) return;
      if (!res.ok) {
        setError(json.error || `Segment API HTTP ${res.status}`);
        setStatus('error');
        return;
      }
      setObjects(json.objects || []);
      setModel(json.model || null);
      setLastLatencyMs(json.latencyMs ?? null);
      setError(json.note && (json.objects || []).length === 0 ? json.note : null);
      setStatus('ok');
    } catch (e: any) {
      if (cancelledRef.current) return;
      setError(e?.message || 'Segmentation failed');
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, [captureFrame]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) {
      setStatus('idle');
      setObjects([]);
      setError(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    let stopped = false;
    const loop = async () => {
      if (stopped || cancelledRef.current) return;
      await runOnce();
      if (stopped || cancelledRef.current) return;
      timerRef.current = setTimeout(loop, intervalMs);
    };
    loop();

    return () => {
      stopped = true;
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, intervalMs, runOnce]);

  return { objects, status, error, lastLatencyMs, model: model_, runOnce };
}
