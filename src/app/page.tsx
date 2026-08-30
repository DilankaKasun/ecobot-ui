'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRos } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { useOdometry } from '@/hooks/useOdometry';
import { resolveStreamUrl } from '@/components/video/CameraFeed';
import { DualCameraView } from '@/components/video/DualCameraView';
import { BotanicalDescription } from '@/components/video/BotanicalDescription';
import { PlantDetection } from '@/lib/plant-analysis';
import { Rect } from '@/lib/hud-layout';
import { Map2DCanvas } from '@/components/map/Map2DCanvas';
import { VirtualJoystick } from '@/components/teleop/VirtualJoystick';
import { KeyboardTeleop } from '@/components/teleop/KeyboardTeleop';
import { EmergencyStop } from '@/components/teleop/EmergencyStop';
import { DetectionTable } from '@/components/sensors/DetectionTable';
import { TofRadar } from '@/components/sensors/TofRadar';
import { HardwareDiagnostics } from '@/components/sensors/HardwareDiagnostics';
import { ROS_CONFIG } from '@/lib/ros-config';
import {
  Info,
  Crosshair,
  Activity,
  Zap,
  Maximize2,
  VideoOff,
  WifiOff,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  RefreshCw,
  Camera,
  Radio,
  Gamepad2,
  Target,
  Stethoscope,
  LayoutGrid,
  X,
} from 'lucide-react';

export default function DashboardPage() {
  const { isConnected, robotHost, streamHost, subscribe } = useRos();
  const { isConnected: isLiveKitConnected, mainCameraTrack, wristCameraTrack } = useLiveKit();
  const { odom, runMode } = useOdometry();

  // Panels minimize/expand state
  const [collapsed, setCollapsed] = useState({
    data: false,
    map: true,
    cam: true,
  });

  const toggleCollapse = (key: keyof typeof collapsed) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // State to handle camera feed swapping & view mode
  const [isSwapped, setIsSwapped] = useState(false);
  const [viewMode, setViewMode] = useState<'hud' | 'dual_grid'>('hud');
  const [activeTab, setActiveTab] = useState<'none' | 'teleop' | 'perception' | 'diagnostics'>('none');

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [bgStreamError, setBgStreamError] = useState<boolean>(false);
  const [pipStreamError, setPipStreamError] = useState<boolean>(false);
  const [detectedPlants, setDetectedPlants] = useState<PlantDetection[]>([]);

  // Panels layered over the camera feed — the AR overlays route around them.
  const logPanelRef = useRef<HTMLDivElement | null>(null);
  const camPanelRef = useRef<HTMLDivElement | null>(null);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const [hudAvoidRects, setHudAvoidRects] = useState<Rect[]>([]);

  useEffect(() => {
    const sameRects = (a: Rect[], b: Rect[]) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (
          Math.round(a[i].left) !== Math.round(b[i].left) ||
          Math.round(a[i].top) !== Math.round(b[i].top) ||
          Math.round(a[i].width) !== Math.round(b[i].width) ||
          Math.round(a[i].height) !== Math.round(b[i].height)
        ) {
          return false;
        }
      }
      return true;
    };

    const panels = [logPanelRef.current, camPanelRef.current, mapPanelRef.current];

    const measure = () => {
      const next: Rect[] = [];
      panels.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width > 4 && r.height > 4) {
          next.push({ left: r.left, top: r.top, width: r.width, height: r.height });
        }
      });
      setHudAvoidRects((prev) => (sameRects(prev, next) ? prev : next));
    };

    measure();
    window.addEventListener('resize', measure);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      panels.forEach((el) => {
        if (el && observer) observer.observe(el);
      });
    }

    return () => {
      window.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
    };
  }, [detectedPlants.length, viewMode, collapsed.data, collapsed.cam, collapsed.map]);

  // ROS Topic image data fallback
  const [mainRosImage, setMainRosImage] = useState<string | null>(null);
  const [armRosImage, setArmRosImage] = useState<string | null>(null);

  // Reset errors on refreshKey or host changes
  useEffect(() => {
    setBgStreamError(false);
    setPipStreamError(false);
  }, [robotHost, streamHost, refreshKey]);

  // Subscribe to ROS CompressedImage topics as fallback over WebSocket tunnel
  useEffect(() => {
    if (!isConnected) {
      setMainRosImage(null);
      setArmRosImage(null);
      return;
    }

    const unsubMain = subscribe(
      ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED,
      'sensor_msgs/msg/CompressedImage',
      (msg: any) => {
        if (msg && msg.data) {
          const b64 = typeof msg.data === 'string' ? msg.data : '';
          setMainRosImage(b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`);
        }
      }
    );

    const unsubArm = subscribe(
      ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED,
      'sensor_msgs/msg/CompressedImage',
      (msg: any) => {
        if (msg && msg.data) {
          const b64 = typeof msg.data === 'string' ? msg.data : '';
          setArmRosImage(b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`);
        }
      }
    );

    return () => {
      unsubMain();
      unsubArm();
    };
  }, [isConnected, subscribe]);

  const handleRefreshStreams = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBgStreamError(false);
    setPipStreamError(false);
    setRefreshKey((k) => k + 1);
  };

  // Helper to format numbers like the mockup
  const formatNum = (num: number) => num.toFixed(2);

  const bgPort = isSwapped ? ROS_CONFIG.ARM_CAMERA_PORT : ROS_CONFIG.REALSENSE_STREAM_PORT;
  const bgEndpoint = isSwapped ? 'arm_camera.mjpg' : 'stream.mjpg';
  const pipPort = isSwapped ? ROS_CONFIG.REALSENSE_STREAM_PORT : ROS_CONFIG.ARM_CAMERA_PORT;
  const pipEndpoint = isSwapped ? 'stream.mjpg' : 'arm_camera.mjpg';

  const bgFeedUrl = resolveStreamUrl(robotHost, streamHost, bgPort, bgEndpoint, refreshKey);
  const pipFeedUrl = resolveStreamUrl(robotHost, streamHost, pipPort, pipEndpoint, refreshKey);
  const pipLabel = isSwapped ? "Main Navigation Feed" : "Manipulator Wrist Cam";

  const bgLiveKitTrack = isSwapped ? wristCameraTrack : mainCameraTrack;
  const pipLiveKitTrack = isSwapped ? mainCameraTrack : wristCameraTrack;

  const bgRosImage = isSwapped ? armRosImage : mainRosImage;
  const pipRosImage = isSwapped ? mainRosImage : armRosImage;

  const isMock = robotHost === 'mock' || streamHost === 'mock';

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between">
      
      {/* --- BACKGROUND CAMERA FEED (HUD MODE) --- */}
      {viewMode === 'hud' && (
        <div className="absolute inset-0 w-full h-full z-0 bg-background/80 transition-all duration-500 overflow-hidden">
          {isMock ? (
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/40 via-background to-background flex items-center justify-center opacity-60">
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,229,192,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,192,0.15)_1px,transparent_1px)] bg-[size:32px_32px]" />
            </div>
          ) : isLiveKitConnected && bgLiveKitTrack ? (
            <div className="w-full h-full opacity-75 mix-blend-screen">
              <LiveKitVideoPlayer
                track={bgLiveKitTrack}
                objectFit="cover"
                className="w-full h-full"
                showStats={true}
                trackName={isSwapped ? 'wrist_camera' : 'realsense_camera'}
                onPlantDetected={setDetectedPlants}
                avoidRects={hudAvoidRects}
              />
            </div>
          ) : bgRosImage ? (
            <img 
              src={bgRosImage} 
              alt="Background Camera Feed" 
              className="w-full h-full object-cover opacity-70 mix-blend-screen" 
            />
          ) : isConnected && bgFeedUrl && !bgStreamError ? (
            <img 
              src={bgFeedUrl} 
              alt="Background Camera Feed" 
              className="w-full h-full object-cover opacity-70 mix-blend-screen transition-opacity duration-500" 
              onError={() => setBgStreamError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-background/90 via-background to-background flex items-center justify-center">
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
          {/* Subtle radial gradient overlay to ensure UI elements remain readable */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/80 pointer-events-none" />
        </div>
      )}

      {/* --- DUAL CAMERA GRID VIEW MODE --- */}
      {viewMode === 'dual_grid' ? (
        <div className="relative z-10 w-full h-full p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              Side-by-Side Dual Camera Feeds
            </h2>
            <button
              onClick={() => setViewMode('hud')}
              className="px-3 py-1 bg-card-border hover:bg-white/10 text-xs font-semibold rounded-lg text-gray-200 transition-colors"
            >
              Return to HUD
            </button>
          </div>
          <DualCameraView />
        </div>
      ) : (
        /* --- MAIN HUD GRID --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full relative z-10 p-2 overflow-hidden pointer-events-none">
          
          {/* LEFT COLUMN: Data Overview & Real 2D Map */}
          <div className="lg:col-span-3 flex flex-col gap-4 z-10 h-full overflow-hidden pointer-events-auto">
            
            {/* Data Overview Panel */}
            {detectedPlants.length > 0 && (
              <div
                ref={logPanelRef}
                className="flex flex-col transition-all duration-300 animate-[fade-in-down_0.4s_ease-out_forwards] p-4 mt-16 bg-black/10 rounded-xl"
              >
                <div className="flex items-center justify-between text-green-400 cursor-pointer select-none mb-2" onClick={() => toggleCollapse('data')}>
                  <h2 className="text-base font-bold tracking-widest uppercase flex items-center gap-2">
                    Botanical Log
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-green-400/40 text-green-400/80">
                      {detectedPlants.length} {detectedPlants.length === 1 ? 'SPECIMEN' : 'SPECIMENS'}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-500" />
                    {collapsed.data ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* One readout per detected plant, matching the AR overlays on the feed */}
                <div className={`flex flex-col gap-3 transition-all duration-300 ${collapsed.data ? 'max-h-0 opacity-0 mt-0 overflow-hidden' : 'max-h-[60vh] opacity-100 mt-4 overflow-y-auto pr-1'}`}>
                  {detectedPlants.map((plant, idx) => (
                    <div
                      key={plant.id}
                      className={idx > 0 ? 'border-t border-green-400/20 pt-3' : undefined}
                    >
                      <BotanicalDescription plant={plant} index={idx} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* CENTER COLUMN: Radar & Status */}
          <div className="lg:col-span-6 relative flex items-center justify-center h-full min-h-0 pointer-events-none">
            {!(isConnected || isLiveKitConnected) && (
              <div className="relative w-full max-w-[350px] aspect-square flex items-center justify-center">
                {/* Outer faint circle */}
                <div className="absolute inset-0 rounded-full border border-primary/10" />
                {/* Inner dashed circle */}
                <div className="absolute inset-[30px] rounded-full border border-dashed border-primary/20" />
                {/* Grid crosshairs faintly visible */}
                <div className="absolute w-[1px] h-full bg-primary/10" />
                <div className="absolute h-[1px] w-full bg-primary/10" />
                
                {/* Center Status */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-danger/40 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,126,121,0.15)] bg-background">
                    <WifiOff className="w-10 h-10 text-danger/80" />
                  </div>
                  <h2 className="text-xl font-bold tracking-widest text-danger animate-pulse-slow">CONNECTION LOST</h2>
                  <p className="text-xs text-gray-500 font-mono mt-2 tracking-[0.2em]">SEARCHING FOR ROBOT SIGNAL...</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Wrist Cam & Active Drawer Overlay */}
          <div className="lg:col-span-3 flex flex-col justify-end gap-4 z-10 h-full overflow-hidden pointer-events-auto">
            <div ref={camPanelRef} className="bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between text-xs cursor-pointer select-none" onClick={() => toggleCollapse('cam')}>
                <span className="text-gray-400 font-mono">{pipLabel}</span>
                <div className="flex items-center gap-2">
                  {isLiveKitConnected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30">
                      <Radio className="w-2.5 h-2.5" />
                      WebRTC
                    </span>
                  )}
                  <button
                    onClick={handleRefreshStreams}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Reload Camera Feeds"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <span className={`font-mono font-bold ${!isConnected ? 'text-danger/80 animate-pulse-slow' : 'text-primary'}`}>
                    {!isConnected ? 'OFFLINE' : (pipStreamError && !pipRosImage && !pipLiveKitTrack) ? 'BLOCKED' : 'ONLINE'}
                  </span>
                  {collapsed.cam ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </div>
              </div>
              
              {/* Clickable PIP Feed */}
              <div className={`transition-all duration-300 overflow-hidden ${collapsed.cam ? 'max-h-0 opacity-0 mt-0' : 'max-h-[500px] opacity-100 mt-3'}`}>
                <div 
                  onClick={() => setIsSwapped(!isSwapped)}
                  className="aspect-video bg-background/50 border border-card-border/30 rounded-lg flex items-center justify-center relative overflow-hidden group cursor-pointer"
                  title="Click to swap with background"
                >
                  {isMock ? (
                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 to-black flex items-center justify-center relative overflow-hidden">
                      <div className="flex flex-col items-center gap-1 z-10 text-primary/70">
                        <Camera className="w-6 h-6 opacity-60" />
                        <span className="text-[10px] font-mono font-bold">MOCK CAM</span>
                      </div>
                    </div>
                  ) : isLiveKitConnected && pipLiveKitTrack ? (
                    <LiveKitVideoPlayer
                      track={pipLiveKitTrack}
                      objectFit="cover"
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      trackName={isSwapped ? 'realsense_camera' : 'wrist_camera'}
                      enableAiVision={false}
                    />
                  ) : pipRosImage ? (
                    <img 
                      src={pipRosImage} 
                      alt="PIP Camera" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : isConnected && pipFeedUrl && !pipStreamError ? (
                    <img 
                      src={pipFeedUrl} 
                      alt="PIP Camera" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      onError={() => setPipStreamError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                      <VideoOff className="w-6 h-6 text-danger/40" />
                      <span className="text-[10px] font-mono text-gray-400">Feed Offline (Port {pipPort})</span>
                      <button
                        onClick={handleRefreshStreams}
                        className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded text-[9px] font-mono hover:bg-primary/30"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {/* Scanline overlay for aesthetic */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
                  
                  {/* Hover Swap Indicator */}
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-2 text-white/90">
                      <ArrowRightLeft className="w-5 h-5" />
                      <span className="text-xs font-bold tracking-widest">SWAP FEEDS</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>

            {/* 2D Navigation Map Panel */}
            <div ref={mapPanelRef} className={`bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ${!collapsed.map ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
              <div className="flex items-center justify-between text-gray-300 cursor-pointer select-none mb-1" onClick={() => toggleCollapse('map')}>
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  2D Navigation Map
                </h2>
                <div className="flex items-center gap-2">
                  {collapsed.map ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </div>
              </div>

              <div className={`transition-all duration-300 flex flex-col overflow-hidden ${collapsed.map ? 'max-h-0 opacity-0 mt-0 flex-none' : 'max-h-[800px] opacity-100 mt-2 flex-1'}`}>
                <Map2DCanvas />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Bottom Navigation Toolbar and Drawer removed as requested */}

    </div>
  );
}
