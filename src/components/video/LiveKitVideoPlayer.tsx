'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import { Maximize2, Radio, Volume2, VolumeX, ScanLine, Loader } from 'lucide-react';
import { PlantDetailsHUD } from './PlantDetailsHUD';
import { normalizePlantDetections, PlantDetection } from '@/lib/plant-analysis';
import { layoutPlantHuds, Rect } from '@/lib/hud-layout';

interface LiveKitVideoPlayerProps {
  track: RemoteTrack | null | undefined;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  showStats?: boolean;
  trackName?: string;
  /**
   * Allow the Gemini plant-scanning loop on this feed. Off by default — it is
   * a paid API call every few seconds, so only the main HUD feed opts in.
   * Any feed also scans while it is fullscreen, however this is set.
   */
  enableAiVision?: boolean;
  onPlantDetected?: (items: PlantDetection[]) => void;
  /**
   * Dashboard chrome sitting on top of the feed (sidebars, map panel), in
   * viewport coordinates. HUD panels steer around these.
   */
  avoidRects?: Rect[];
}

export const LiveKitVideoPlayer: React.FC<LiveKitVideoPlayerProps> = ({
  track,
  className = 'w-full h-full',
  objectFit = 'cover',
  showStats = false,
  trackName,
  enableAiVision = false,
  onPlantDetected,
  avoidRects,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(enableAiVision);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<PlantDetection[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0, left: 0, top: 0 });

  // Track whether this feed is the one on screen fullscreen.
  useEffect(() => {
    const readFullscreenState = () => {
      const active: Element | null =
        document.fullscreenElement || (document as any).webkitFullscreenElement || null;
      const el = containerRef.current;
      // Counts when this player, or anything wrapping it, went fullscreen.
      setIsFullscreen(!!active && !!el && (active === el || active.contains(el)));
    };

    readFullscreenState();
    document.addEventListener('fullscreenchange', readFullscreenState);
    document.addEventListener('webkitfullscreenchange', readFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', readFullscreenState);
      document.removeEventListener('webkitfullscreenchange', readFullscreenState);
    };
  }, []);

  // Scanning is permitted on the main HUD feed, and on any feed while fullscreen.
  const aiEnabled = enableAiVision || isFullscreen;

  // Start scanning when it becomes permitted, stop the moment it is not.
  useEffect(() => {
    setIsSegmenting(aiEnabled);
  }, [aiEnabled]);

  // The segmentation loop is set up once; read the latest callback through a ref.
  const onPlantDetectedRef = useRef(onPlantDetected);
  useEffect(() => {
    onPlantDetectedRef.current = onPlantDetected;
  }, [onPlantDetected]);

  // Overlay geometry follows the rendered video box, so HUDs stay put on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setViewport({ width: el.clientWidth, height: el.clientHeight, left: rect.left, top: rect.top });
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placements = useMemo(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return [];

    // The player's own chrome, plus any dashboard panels layered over the feed.
    const obstacles: Rect[] = [
      { left: 0, top: 0, width: 400, height: 34 }, // stat chips (top left)
      { left: viewport.width - 150, top: 0, width: 150, height: 38 }, // quick controls (top right)
      { left: viewport.width / 2 - 130, top: 12, width: 260, height: 36 }, // "analyzing" pill
    ];

    if (avoidRects) {
      for (let i = 0; i < avoidRects.length; i++) {
        const r = avoidRects[i];
        obstacles.push({
          left: r.left - viewport.left,
          top: r.top - viewport.top,
          width: r.width,
          height: r.height,
        });
      }
    }

    return layoutPlantHuds(
      detectedItems.map((item) => item.box_2d),
      viewport.width,
      viewport.height,
      { obstacles }
    );
  }, [detectedItems, viewport, avoidRects]);

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
    if (!isSegmenting || !aiEnabled || !videoRef.current || !canvasRef.current) {
      setDetectedItems([]);
      // Clear the sidebar log too, so it never outlives the overlays.
      onPlantDetectedRef.current?.([]);
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
      onPlantDetectedRef.current?.([]);
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

        // Gemini returns the label AND the per-plant analysis the HUD renders;
        // normalize fills in anything the model left out.
        const plants = normalizePlantDetections(data.items);
        setDetectedItems(plants);
        onPlantDetectedRef.current?.(plants);

        // Polygon masks stay hidden — the bracket box + reticle reads cleaner.
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  }, [isSegmenting, aiEnabled]);

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

      {/* DOM overlays for HUDs — one per detected plant, placed to avoid collisions */}
      {isSegmenting &&
        detectedItems.map((item, idx) =>
          placements[idx] ? (
            <PlantDetailsHUD key={item.id} plant={item} placement={placements[idx]} index={idx} />
          ) : null
        )}

      {/* Analyzing Loader Overlay (Only when actively waiting for API) */}
      {isAnalyzing && aiEnabled && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-cyan-400/50 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-cyan-400 font-mono text-[10px] font-bold tracking-[0.2em] animate-pulse">ANALYZING TARGET...</span>
        </div>
      )}

      {/* Continuous Scanning Laser Line (Runs only while analyzing) */}
      {isAnalyzing && aiEnabled && (
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
        {aiEnabled && (
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
