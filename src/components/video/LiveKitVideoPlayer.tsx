'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { RemoteTrack } from 'livekit-client';
import { Maximize2, Radio, Volume2, VolumeX, ScanLine, Loader } from 'lucide-react';
import { PlantDetailsHUD } from './PlantDetailsHUD';
import { VideoLoading } from './VideoLoading';
import { normalizePlantDetections, PlantDetection } from '@/lib/plant-analysis';
import { layoutPlantHuds, Rect } from '@/lib/hud-layout';
import { useRos } from '@/hooks/useRos';

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
  /**
   * If true, runs the AI loop but suppresses the AR HUD bounding boxes on the video.
   */
  hideArOverlay?: boolean;
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
  hideArOverlay = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(enableAiVision);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<PlantDetection[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const { subscribe, publish } = useRos();
  const [alreadyAnalyzed, setAlreadyAnalyzed] = useState<Set<string>>(new Set());

  // Hold the loading overlay until the track actually paints a frame.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const markReady = () => setIsVideoReady(true);
    const markWaiting = () => setIsVideoReady(false);

    // A new track starts unready, unless it is already painting by the time
    // these listeners go on.
    // Note: We also attach onCanPlay/onPlaying directly to the video element
    // below, as React event handlers are more reliable across remounts than
    // addEventListener inside useEffect.
    setIsVideoReady(el.readyState >= 2);
  }, [track]);

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

  // ROS YOLO Subscription Loop
  useEffect(() => {
    if (!isSegmenting || !aiEnabled) {
      setDetectedItems([]);
      onPlantDetectedRef.current?.([]);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let isFetching = false;
    
    const unsubscribe = subscribe('/ecobot/vision/plants', 'std_msgs/String', async (msg: any) => {
      try {
        if (!video.videoWidth) return;
        const data = JSON.parse(msg.data);
        
        // Backend returns: box_2d: [xmin, ymin, xmax, ymax] in pixels
        // Frontend needs: [ymin, xmin, ymax, xmax] normalized to 0-1000
        const plants = data.map((p: any) => {
           const [xmin, ymin, xmax, ymax] = p.box_2d;
           const normYmin = Math.round((ymin / video.videoHeight) * 1000);
           const normXmin = Math.round((xmin / video.videoWidth) * 1000);
           const normYmax = Math.round((ymax / video.videoHeight) * 1000);
           const normXmax = Math.round((xmax / video.videoWidth) * 1000);
           return {
             ...p,
             box_2d: [normYmin, normXmin, normYmax, normXmax]
           };
        });
        
        setDetectedItems(plants);
        onPlantDetectedRef.current?.(plants);
        
        if (isFetching) return;
        
        for (const p of data) {
           const [xmin, ymin, xmax, ymax] = p.box_2d;
           const boxWidth = xmax - xmin;
           const boxHeight = ymax - ymin;
           const areaPercent = (boxWidth * boxHeight) / (video.videoWidth * video.videoHeight);
           
           if (areaPercent > 0.1 && !alreadyAnalyzed.has(p.id)) {
               const canvas = canvasRef.current;
               if (!canvas) continue;
               
               const offscreen = document.createElement('canvas');
               const padX = boxWidth * 0.1;
               const padY = boxHeight * 0.1;
               const cXmin = Math.max(0, xmin - padX);
               const cYmin = Math.max(0, ymin - padY);
               const cXmax = Math.min(video.videoWidth, xmax + padX);
               const cYmax = Math.min(video.videoHeight, ymax + padY);
               
               offscreen.width = cXmax - cXmin;
               offscreen.height = cYmax - cYmin;
               
               const offCtx = offscreen.getContext('2d');
               if (offCtx) {
                 offCtx.drawImage(video, cXmin, cYmin, offscreen.width, offscreen.height, 0, 0, offscreen.width, offscreen.height);
                 const imageBase64 = offscreen.toDataURL('image/jpeg', 0.8);
                 
                 isFetching = true;
                 setIsAnalyzing(true);
                 
                 try {
                     const res = await fetch('/api/analyze_plant', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ imageBase64 }),
                     });
                     
                     const analysis = await res.json();
                     setAlreadyAnalyzed(prev => new Set(prev).add(p.id));
                     
                     publish('/ecobot/map_pin', 'std_msgs/String', {
                        data: JSON.stringify({
                           id: p.id,
                           desc: analysis.condition?.status || "Analyzed",
                           distance: 1.0
                        })
                     });
                 } catch (e) {
                     console.error(e);
                 } finally {
                     isFetching = false;
                     setIsAnalyzing(false);
                 }
               }
               break; 
           }
        }
      } catch (e) {
        console.error("YOLO parse error", e);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSegmenting, aiEnabled, subscribe, publish, alreadyAnalyzed]);

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
        onLoadedData={() => setIsVideoReady(true)}
        onCanPlay={() => setIsVideoReady(true)}
        onPlaying={() => setIsVideoReady(true)}
        onTimeUpdate={() => setIsVideoReady(true)}
      />
      
      {!isVideoReady && <VideoLoading label="Connecting to camera" />}

      {/* 2D Canvas for drawing raw segmentation polygons */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
      />

      {/* DOM overlays for HUDs — one per detected plant, placed to avoid collisions */}
      {isSegmenting && !hideArOverlay &&
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
            <span className="bg-black/60 backdrop-blur-sm border border-card-border text-muted-foreground font-mono text-[10px] px-2 py-0.5 rounded-md">
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
                : 'bg-black/40 border-card-border text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Toggle AI Vision"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-muted-foreground hover:text-white border border-card-border transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-muted-foreground hover:text-white border border-card-border transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
