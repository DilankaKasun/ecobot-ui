'use client';

import React, { useRef, useEffect, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import { Maximize2, Radio, Volume2, VolumeX } from 'lucide-react';

interface LiveKitVideoPlayerProps {
  track: RemoteTrack | null | undefined;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  showStats?: boolean;
  trackName?: string;
}

export const LiveKitVideoPlayer: React.FC<LiveKitVideoPlayerProps> = ({
  track,
  className = 'w-full h-full',
  objectFit = 'cover',
  showStats = false,
  trackName,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;

    try {
      track.attach(el);
    } catch (err) {
      console.warn('[LiveKitVideoPlayer attach error]', err);
    }

    return () => {
      try {
        track.detach(el);
      } catch (err) {
        // ignore
      }
    };
  }, [track]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!track) return null;

  return (
    <div ref={containerRef} className={`relative overflow-hidden group ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        style={{ objectFit }}
        className="w-full h-full"
      />

      {showStats && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-primary/40 text-primary font-mono text-[10px] px-2 py-0.5 rounded-md shadow">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>WebRTC &lt;100ms</span>
          </span>
          {trackName && (
            <span className="bg-black/60 backdrop-blur-sm border border-white/10 text-gray-300 font-mono text-[10px] px-2 py-0.5 rounded-md">
              {trackName}
            </span>
          )}
        </div>
      )}

      {/* Quick controls on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white border border-white/10 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white border border-white/10 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
