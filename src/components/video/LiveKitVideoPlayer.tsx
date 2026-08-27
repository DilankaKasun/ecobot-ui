'use client';

import React, { useRef, useEffect, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import { Maximize2, Radio, Volume2, VolumeX, ScanLine } from 'lucide-react';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isSegmenting, setIsSegmenting] = useState(false);

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

  // AI Segmentation Loop
  useEffect(() => {
    if (!isSegmenting || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let intervalId: NodeJS.Timeout;
    let isFetching = false;

    const captureAndSegment = async () => {
      if (isFetching || !video || video.readyState < 2) return;
      
      // Set canvas internal resolution to match display size for drawing
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      // Create an offscreen canvas to capture the image
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 640;
      offscreen.height = video.videoHeight || 480;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;
      
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const imageBase64 = offscreen.toDataURL('image/jpeg', 0.8);

      try {
        isFetching = true;
        const res = await fetch('/api/segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        
        if (data.items && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          data.items.forEach((item: any) => {
            const { mask, label, box_2d } = item;
            
            // Draw mask
            if (mask && mask.length > 0) {
              ctx.beginPath();
              mask.forEach(([x, y]: [number, number], index: number) => {
                const cx = (x / 1000) * canvas.width;
                const cy = (y / 1000) * canvas.height;
                if (index === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
              });
              ctx.closePath();
              ctx.fillStyle = 'rgba(0, 229, 192, 0.3)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(0, 229, 192, 0.8)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Draw label near bounding box
            if (box_2d && label) {
              const [ymin, xmin] = box_2d;
              const cx = (xmin / 1000) * canvas.width;
              const cy = (ymin / 1000) * canvas.height;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.fillRect(cx, cy > 20 ? cy - 20 : cy, ctx.measureText(label).width + 8, 20);
              ctx.fillStyle = '#00e5c0';
              ctx.font = '12px monospace';
              ctx.fillText(label, cx + 4, cy > 20 ? cy - 6 : cy + 14);
            }
          });
        }
      } catch (err) {
        console.error('Segmentation API error:', err);
      } finally {
        isFetching = false;
      }
    };

    // Run immediately then every 3 seconds
    captureAndSegment();
    intervalId = setInterval(captureAndSegment, 3000);

    return () => {
      clearInterval(intervalId);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isSegmenting]);

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
        className="w-full h-full relative z-0"
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
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
          {isSegmenting && (
            <span className="bg-primary/20 backdrop-blur-sm border border-primary/40 text-primary font-mono text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
              <ScanLine className="w-2.5 h-2.5 animate-spin-slow" />
              <span>AI VISION</span>
            </span>
          )}
        </div>
      )}

      {/* Quick controls on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <button
          onClick={() => setIsSegmenting(!isSegmenting)}
          className={`p-1.5 rounded-lg border transition-colors ${
            isSegmenting 
              ? 'bg-primary/20 border-primary/40 text-primary' 
              : 'bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white border-white/10'
          }`}
          title={isSegmenting ? 'Disable AI Vision' : 'Enable AI Vision'}
        >
          <ScanLine className={`w-3.5 h-3.5 ${isSegmenting ? 'animate-pulse' : ''}`} />
        </button>
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
