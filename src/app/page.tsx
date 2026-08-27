'use client';

import React, { useState, useEffect } from 'react';
import { useRos } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { LiveKitVideoPlayer } from '@/components/video/LiveKitVideoPlayer';
import { useOdometry } from '@/hooks/useOdometry';
import { resolveStreamUrl } from '@/components/video/CameraFeed';
import { DualCameraView } from '@/components/video/DualCameraView';
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
    map: false,
    cam: false,
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full relative z-10 p-2 overflow-hidden">
          
          {/* LEFT COLUMN: Data Overview & Real 2D Map */}
          <div className="lg:col-span-3 flex flex-col gap-4 z-10 h-full overflow-hidden">
            
            {/* Data Overview Panel */}
            <div className="bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between text-gray-300 cursor-pointer select-none" onClick={() => toggleCollapse('data')}>
                <h2 className="text-sm font-bold tracking-wide">Data Overview</h2>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  {collapsed.data ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </div>
              </div>

              <div className={`flex flex-col gap-3 transition-all duration-300 overflow-hidden ${collapsed.data ? 'max-h-0 opacity-0 mt-0' : 'max-h-[500px] opacity-100 mt-4'}`}>
                {/* Position */}
                <div className="space-y-1 pb-3 border-b border-card-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">Position (X, Y)</span>
                    <Crosshair className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-1.5 font-mono text-gray-200">
                    <span className="text-lg">{formatNum(odom.x)}, {formatNum(odom.y)}</span>
                    <span className="text-xs text-gray-500">m</span>
                  </div>
                </div>

                {/* Linear Velocity */}
                <div className="space-y-1 pb-3 border-b border-card-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">Linear Velocity</span>
                    <div className="w-4 h-2 rounded-t-full border-t-2 border-x-2 border-primary opacity-80" />
                  </div>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-lg text-primary font-bold">{formatNum(odom.linearVelocity)}</span>
                    <span className="text-xs text-gray-400">m/s</span>
                  </div>
                </div>

                {/* Angular Velocity */}
                <div className="space-y-1 pb-3 border-b border-card-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">Angular Velocity</span>
                    <Activity className="w-3.5 h-3.5 text-purple" />
                  </div>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-lg text-purple font-bold">{formatNum(odom.angularVelocity)}</span>
                    <span className="text-xs text-gray-400">rad/s</span>
                  </div>
                </div>

                {/* Controller Mode */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">Controller Mode</span>
                    <Zap className="w-3.5 h-3.5 text-danger" />
                  </div>
                  <div className="inline-block px-2 py-0.5 border border-danger/30 rounded text-[9px] text-danger/80 font-mono tracking-wider">
                    {runMode === 0 ? 'RC REMOTE' : 'AUTONOMOUS'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2D Navigation Map Panel */}
            <div className={`bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ${!collapsed.map ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
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

          {/* CENTER COLUMN: Radar & Status */}
          <div className="lg:col-span-6 relative flex items-center justify-center h-full min-h-0">
            
            {/* Radar Circles */}
            <div className="relative w-full max-w-[350px] aspect-square flex items-center justify-center">
              {/* Outer faint circle */}
              <div className="absolute inset-0 rounded-full border border-primary/10" />
              {/* Inner dashed circle */}
              <div className="absolute inset-[30px] rounded-full border border-dashed border-primary/20" />
              {/* Grid crosshairs faintly visible */}
              <div className="absolute w-[1px] h-full bg-primary/10" />
              <div className="absolute h-[1px] w-full bg-primary/10" />
              
              {/* Radar scanner sweep animation */}
              {isConnected && (
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_80%,rgba(0,229,192,0.1)_100%)] animate-spin-slow" />
              )}
              
              {/* Center Status */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                {!isConnected ? (
                  <>
                    <div className="w-20 h-20 rounded-full border-2 border-danger/40 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,126,121,0.15)] bg-background">
                      <WifiOff className="w-10 h-10 text-danger/80" />
                    </div>
                    <h2 className="text-xl font-bold tracking-widest text-danger animate-pulse-slow">CONNECTION LOST</h2>
                    <p className="text-xs text-gray-500 font-mono mt-2 tracking-[0.2em]">SEARCHING FOR ROBOT SIGNAL...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full border-2 border-primary/40 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,229,192,0.15)] bg-background">
                      <Activity className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold tracking-widest text-primary animate-pulse-slow">SYSTEM ONLINE</h2>
                    <p className="text-xs text-gray-500 font-mono mt-2 tracking-[0.2em]">
                      {isLiveKitConnected ? 'WEBRTC LIVEKIT ACTIVE' : 'ALL SYSTEMS NOMINAL'}
                    </p>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Wrist Cam & Active Drawer Overlay */}
          <div className="lg:col-span-3 flex flex-col justify-end z-10 h-full overflow-hidden">
            <div className="bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300">
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
          </div>

        </div>
      )}

      {/* --- FLOATING BOTTOM ACTION TOOLBAR --- */}
      <div className="relative z-30 flex items-center justify-center px-4 pb-2">
        <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex items-center gap-2">
          <button
            onClick={() => setActiveTab((t) => (t === 'teleop' ? 'none' : 'teleop'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'teleop'
                ? 'bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,229,192,0.4)]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Driving Controls</span>
          </button>

          <button
            onClick={() => setActiveTab((t) => (t === 'perception' ? 'none' : 'perception'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'perception'
                ? 'bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,229,192,0.4)]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Perception & Radar</span>
          </button>

          <button
            onClick={() => setActiveTab((t) => (t === 'diagnostics' ? 'none' : 'diagnostics'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,229,192,0.4)]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Diagnostics</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setViewMode((m) => (m === 'hud' ? 'dual_grid' : 'hud'))}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition-all"
            title="Toggle Dual Camera Grid"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{viewMode === 'hud' ? 'Dual Grid' : 'HUD View'}</span>
          </button>
        </div>
      </div>

      {/* --- COLLAPSIBLE TOOLBAR DRAWER / MODAL --- */}
      {activeTab !== 'none' && (
        <div className="absolute inset-x-4 bottom-16 z-40 max-w-4xl mx-auto bg-card/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_16px_48px_0_rgba(0,0,0,0.7)] animate-in slide-in-from-bottom duration-300 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-card-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {activeTab === 'teleop' && <><Gamepad2 className="w-4 h-4 text-primary" /> Driving Teleoperation Controls</>}
              {activeTab === 'perception' && <><Target className="w-4 h-4 text-primary" /> YOLOv8 Perception & ToF Obstacle Radar</>}
              {activeTab === 'diagnostics' && <><Stethoscope className="w-4 h-4 text-primary" /> Robot Hardware Diagnostics</>}
            </h3>
            <button
              onClick={() => setActiveTab('none')}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeTab === 'teleop' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <VirtualJoystick />
              <KeyboardTeleop />
              <div className="flex flex-col justify-between gap-4 h-full">
                <div className="p-3 bg-background/50 border border-card-border rounded-xl text-xs text-gray-300 space-y-1">
                  <p className="font-semibold text-white">Teleoperation Active:</p>
                  <p className="text-gray-400">Use on-screen thumb joystick or WASD keys to drive the robot base in real-time.</p>
                </div>
                <EmergencyStop />
              </div>
            </div>
          )}

          {activeTab === 'perception' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetectionTable />
              <TofRadar />
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="max-w-xl mx-auto">
              <HardwareDiagnostics />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
