'use client';

import React, { useEffect, useState } from 'react';
import type { SegObject, SegStatus } from '@/hooks/useGeminiSegmentation';
import { Scan, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  sourceRef: React.RefObject<HTMLElement>;
  objects: SegObject[];
  status: SegStatus;
  error: string | null;
  latencyMs: number | null;
  model: string | null;
  objectFit?: 'contain' | 'cover';
}

// stable-ish colour per label
const PALETTE = ['#00e5c0', '#ff7e79', '#a78bfa', '#fbbf24', '#38bdf8', '#f472b6', '#4ade80', '#fb923c'];
function colorFor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const SegmentationOverlay: React.FC<Props> = ({
  sourceRef,
  objects,
  status,
  error,
  latencyMs,
  model,
  objectFit = 'contain',
}) => {
  const [aspect, setAspect] = useState(16 / 9);

  useEffect(() => {
    const el = sourceRef.current;
    if (!el) return;
    const media = el.querySelector('video, img') as HTMLVideoElement | HTMLImageElement | null;
    if (!media) return;
    const w = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const h = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (w > 0 && h > 0) setAspect(w / h);
  }, [sourceRef, objects, status]);

  const VBW = 1000;
  const VBH = Math.round(1000 / aspect);
  const par = objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio={par}
      >
        {objects.map((o, i) => {
          const c = colorFor(o.label);
          const [x0, y0, x1, y1] = o.box;
          const pts = o.polygon?.map(([x, y]) => `${x * VBW},${y * VBH}`).join(' ');
          return (
            <g key={i}>
              {pts ? (
                <polygon points={pts} fill={c} fillOpacity={0.22} stroke={c} strokeWidth={2} />
              ) : (
                <rect
                  x={x0 * VBW}
                  y={y0 * VBH}
                  width={(x1 - x0) * VBW}
                  height={(y1 - y0) * VBH}
                  fill={c}
                  fillOpacity={0.12}
                  stroke={c}
                  strokeWidth={2}
                />
              )}
              <text
                x={x0 * VBW + 4}
                y={Math.max(12, y0 * VBH - 4)}
                fill={c}
                fontSize={13}
                fontWeight={700}
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 }}
              >
                {o.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* status pill */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1 text-[10px] font-mono">
        {status === 'working' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        {status === 'error' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
        {(status === 'ok' || status === 'idle') && <Scan className="w-3 h-3 text-primary" />}
        <span className="text-gray-200">
          {status === 'error'
            ? (error || 'segmentation error').slice(0, 60)
            : status === 'working'
            ? 'Gemini segmenting…'
            : `${objects.length} object${objects.length === 1 ? '' : 's'}`}
        </span>
        {latencyMs != null && status !== 'error' && (
          <span className="text-gray-500">· {(latencyMs / 1000).toFixed(1)}s</span>
        )}
        {model && status !== 'error' && (
          <span className="text-gray-600 hidden sm:inline">· {model.replace('gemini-', '')}</span>
        )}
      </div>
    </div>
  );
};
