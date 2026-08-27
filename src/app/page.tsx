'use client';

import React, { useState } from 'react';
import { useRos } from '@/hooks/useRos';
import { useOdometry } from '@/hooks/useOdometry';
import { resolveStreamUrl } from '@/components/video/CameraFeed';
import { ROS_CONFIG } from '@/lib/ros-config';
import { Info, Crosshair, Activity, Zap, Maximize2, VideoOff, WifiOff, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';

export default function DashboardPage() {
  const { isConnected, robotHost, streamHost } = useRos();
  const { odom, runMode } = useOdometry();

  // Simple state to minimize/expand panels
  const [collapsed, setCollapsed] = useState({
    data: false,
    map: false,
    cam: false
  });

  const toggleCollapse = (key: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // State to handle camera feed swapping
  const [isSwapped, setIsSwapped] = useState(false);

  // Helper to format numbers like the mockup
  const formatNum = (num: number) => num.toFixed(2);

  const bgFeedUrl = resolveStreamUrl(robotHost, streamHost, isSwapped ? ROS_CONFIG.ARM_CAMERA_PORT : ROS_CONFIG.REALSENSE_STREAM_PORT, isSwapped ? 'arm_camera.mjpg' : 'stream.mjpg', 0);
  const pipFeedUrl = resolveStreamUrl(robotHost, streamHost, isSwapped ? ROS_CONFIG.REALSENSE_STREAM_PORT : ROS_CONFIG.ARM_CAMERA_PORT, isSwapped ? 'stream.mjpg' : 'arm_camera.mjpg', 0);
  const pipLabel = isSwapped ? "Main Camera Feed" : "Manipulator Wrist Cam";

  return (
    <div className="relative w-full h-full overflow-hidden">
      
      {/* --- BACKGROUND CAMERA FEED --- */}
      <div className="absolute inset-0 w-full h-full z-0 bg-background/80 transition-all duration-500">
        {isConnected && streamHost && (
          <img 
            src={bgFeedUrl} 
            alt="Background Camera Feed" 
            className="w-full h-full object-cover opacity-70 mix-blend-screen" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
        {/* Subtle radial gradient overlay to ensure UI elements remain readable */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/80 pointer-events-none" />
      </div>

      {/* --- GRID SYSTEM --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full relative z-10">
        
        {/* LEFT COLUMN: Data Overview & Map */}
        <div className="lg:col-span-3 flex flex-col gap-4 z-10 h-full">
          
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

          {/* Map Placeholder Panel */}
          <div className={`bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ${!collapsed.map ? 'flex-1 min-h-0' : ''}`}>
            <div className="flex items-center justify-between text-gray-300 cursor-pointer select-none" onClick={() => toggleCollapse('map')}>
              <h2 className="text-sm font-bold tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                Map
              </h2>
              <div className="flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                {collapsed.map ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
              </div>
            </div>
            {/* Minimal Map Area */}
            <div className={`transition-all duration-300 flex flex-col overflow-hidden ${collapsed.map ? 'max-h-0 opacity-0 mt-0 flex-none' : 'max-h-[800px] opacity-100 mt-3 flex-1'}`}>
              <div className="flex-1 bg-background/50 border border-card-border/30 rounded-lg relative overflow-hidden flex items-center justify-center">
                {/* Fake Robot Position indicator */}
                <div className="w-6 h-6 border-2 border-primary rounded-sm rotate-45 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                </div>
              </div>
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
                  <p className="text-xs text-gray-500 font-mono mt-2 tracking-[0.2em]">ALL SYSTEMS NOMINAL</p>
                </>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Wrist Cam */}
        <div className="lg:col-span-3 flex flex-col justify-end z-10 h-full">
          <div className="bg-card/20 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between text-xs cursor-pointer select-none" onClick={() => toggleCollapse('cam')}>
              <span className="text-gray-400 font-mono">{pipLabel}</span>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${!isConnected ? 'text-danger/80 animate-pulse-slow' : 'text-primary'}`}>
                  {!isConnected ? 'OFFLINE' : 'ONLINE'}
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
                {isConnected && streamHost ? (
                  <img 
                    src={pipFeedUrl} 
                    alt="PIP Camera" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <VideoOff className="w-8 h-8 text-danger/30" />
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
    </div>
  );
}
