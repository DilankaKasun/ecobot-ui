'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface VideoLoadingProps {
  /** Shown under the spinner, e.g. "Connecting to WebRTC track". */
  label?: string;
  /** Dim the feed behind it. Off for overlays sitting on a live picture. */
  opaque?: boolean;
  className?: string;
}

/**
 * Shown over a video surface until its first frame arrives. Every feed uses
 * this one component so a loading stream looks the same everywhere.
 */
export const VideoLoading: React.FC<VideoLoadingProps> = ({
  label = 'Loading video feed',
  opaque = true,
  className = '',
}) => (
  <div
    className={
      'absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none ' +
      (opaque ? 'bg-background/80 backdrop-blur-sm ' : '') +
      className
    }
    role="status"
    aria-live="polite"
  >
    <div className="relative flex items-center justify-center">
      <div className="absolute w-10 h-10 rounded-full border border-primary/20" />
      <div className="absolute w-14 h-14 rounded-full border border-dashed border-primary/10 animate-spin-slow" />
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary/80 animate-pulse">
      {label}
    </span>
  </div>
);
