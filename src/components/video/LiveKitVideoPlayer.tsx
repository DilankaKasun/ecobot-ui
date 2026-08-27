'use client';

import React, { useRef, useEffect, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import { Maximize2, Radio, Volume2, VolumeX, ScanLine, Loader } from 'lucide-react';
import { PlantDetailsHUD } from './PlantDetailsHUD';

interface LiveKitVideoPlayerProps {
  track: RemoteTrack | null | undefined;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  showStats?: boolean;
  trackName?: string;
  enableAiVision?: boolean;
  onPlantDetected?: (items: any[]) => void;
}

export const LiveKitVideoPlayer: React.FC<LiveKitVideoPlayerProps> = ({
  track,
  className = 'w-full h-full',
  objectFit = 'cover',
  showStats = false,
  trackName,
  enableAiVision = true,
  onPlantDetected,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isSegmenting, setIsSegmenting] = useState(enableAiVision);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<any[]>([]);

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
    if (!isSegmenting || !videoRef.current || !canvasRef.current) {
      setDetectedItems([]);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let intervalId: NodeJS.Timeout;
    let isFetching = false;
    let prevImageData: Uint8ClampedArray | null = null;

    const captureAndSegment = async () => {
      if (isFetching || !video || video.readyState < 2) return;
      
      // Set canvas internal resolution to match display size for drawing
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      // Create an offscreen canvas to capture the image
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 640;
      offscreen.height = video.videoHeight || 480;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;
      
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const currImageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;

      // Check if frame has changed significantly
      let shouldProcess = true;
      if (prevImageData) {
        let diffCount = 0;
        const step = 40; // check every 10th pixel (4 channels * 10)
        const totalPixelsChecked = Math.floor(currImageData.length / step);
        
        for (let i = 0; i < currImageData.length; i += step) {
          const rDiff = Math.abs(currImageData[i] - prevImageData[i]);
          const gDiff = Math.abs(currImageData[i+1] - prevImageData[i+1]);
          const bDiff = Math.abs(currImageData[i+2] - prevImageData[i+2]);
          // High color threshold (80) to ignore minor lighting changes and small leaf shadows
          if (rDiff + gDiff + bDiff > 80) diffCount++;
        }
        
        // If less than 15% of pixels changed significantly, skip API call
        // This high threshold ignores wind moving leaves but catches the whole camera moving
        if (diffCount / totalPixelsChecked < 0.15) {
          shouldProcess = false;
        }
      }

      // Store current frame for next comparison
      prevImageData = new Uint8ClampedArray(currImageData);

      if (!shouldProcess) {
        // Keep existing canvas and detectedItems, just skip the expensive API call
        return;
      }

      // Clear the old HUD and masks immediately before scanning the new frame!
      setDetectedItems([]);
      onPlantDetected?.([]);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      const imageBase64 = offscreen.toDataURL('image/jpeg', 0.8);

      try {
        isFetching = true;
        setIsAnalyzing(true);
        const res = await fetch('/api/segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        
        if (data.items) {
          setDetectedItems(data.items);
          onPlantDetected?.(data.items);
        } else {
          setDetectedItems([]);
          onPlantDetected?.([]);
        }

        if (data.items && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          data.items.forEach((item: any) => {
            const { mask } = item;
            
            // Draw mask only (HUD handles labels and bounding boxes)
            // The user requested to hide the polygon mask since the bounding box + reticle looks cleaner
            /*
            if (mask && mask.length > 0) {
              ctx.beginPath();
              mask.forEach(([x, y]: [number, number], index: number) => {
                const cx = (x / 1000) * canvas.width;
                const cy = (y / 1000) * canvas.height;
                if (index === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
              });
              ctx.closePath();
              ctx.fillStyle = 'rgba(45, 212, 191, 0.4)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(45, 212, 191, 1)';
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            */
          });
        }
      } catch (err) {
        console.error('Segmentation API error:', err);
      } finally {
        isFetching = false;
        setIsAnalyzing(false);
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
      
      {/* 2D Canvas for drawing raw segmentation polygons */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
      />

      {/* DOM overlays for HUDs */}
      {isSegmenting && canvasRef.current && detectedItems.map((item, idx) => (
        item.box_2d ? (
          <PlantDetailsHUD 
            key={idx}
            box_2d={item.box_2d}
            label={item.label}
            canvasWidth={canvasRef.current!.width}
            canvasHeight={canvasRef.current!.height}
          />
        ) : null
      ))}

      {/* Analyzing Loader Overlay (Only when actively waiting for API) */}
      {isAnalyzing && enableAiVision && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-cyan-400/50 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-cyan-400 font-mono text-[10px] font-bold tracking-[0.2em] animate-pulse">ANALYZING TARGET...</span>
        </div>
      )}

      {/* Continuous Scanning Laser Line (Runs only while analyzing) */}
      {isAnalyzing && enableAiVision && (
        <div className="absolute inset-x-16 animate-scanline z-20 pointer-events-none">
          <div className="w-full h-0.5 bg-teal-400 shadow-[0_0_20px_5px_rgba(45,212,191,0.8)] relative">
            {/* Corner brackets that move with the line */}
            <div className="absolute -top-4 -left-4 w-6 h-10 border-t-2 border-l-2 border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
            <div className="absolute -top-4 -right-4 w-6 h-10 border-t-2 border-r-2 border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-10 border-b-2 border-l-2 border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
            <div className="absolute -bottom-4 -right-4 w-6 h-10 border-b-2 border-r-2 border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
          </div>
        </div>
      )}

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

      {/* Quick controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 transition-opacity duration-200 z-20">
        {enableAiVision && (
          <button
            onClick={() => setIsSegmenting(!isSegmenting)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSegmenting 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Toggle AI Vision"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        )}
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
