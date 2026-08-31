'use client';

import React, { useState, useEffect } from 'react';
import { useRos, isLocalOrLanHost } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { ROS_CONFIG } from '@/lib/ros-config';
import { CameraFeed } from '@/components/video/CameraFeed';
import { Settings, Save, Server, Video, CheckCircle2, ShieldAlert, Globe, HelpCircle, Laptop, Wifi, Sparkles, RefreshCw, Radio, Link as LinkIcon, Unlink } from 'lucide-react';

export default function SettingsPage() {
  const { robotHost, streamHost, setRobotHost, setStreamHost, isConnected, resolvedRosUrl } = useRos();
  const {
    livekitUrl,
    roomName,
    token,
    isConnected: isLiveKitConnected,
    isConnecting: isLiveKitConnecting,
    error: livekitError,
    videoTracks,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    setLivekitUrl,
    setRoomName,
    setToken,
  } = useLiveKit();

  const [hostInput, setHostInput] = useState(robotHost);
  const [streamHostInput, setStreamHostInput] = useState(streamHost);
  const [cameraSourceInput, setCameraSourceInput] = useState("");
  const [lkUrlInput, setLkUrlInput] = useState(livekitUrl);
  const [lkRoomInput, setLkRoomInput] = useState(roomName);
  const [lkTokenInput, setLkTokenInput] = useState(token);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setHostInput(robotHost);
    setStreamHostInput(streamHost);
    setLkUrlInput(livekitUrl);
    setLkRoomInput(roomName);
    setLkTokenInput(token);
  }, [robotHost, streamHost, livekitUrl, roomName, token]);

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(hostInput.trim());
    setStreamHost(streamHostInput.trim());
    setLivekitUrl(lkUrlInput.trim());
    setRoomName(lkRoomInput.trim());
    setToken(lkTokenInput.trim());
    
    // Tell the Python YOLO backend to start watching this video feed if provided
    if (cameraSourceInput.trim()) {
      try {
        await fetch('http://localhost:8081/api/set-camera', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cameraSourceInput.trim() }),
        });
      } catch (err) {
        console.warn("Could not push camera URL to local YOLO engine.");
      }
    }
    
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const applyPreset = (robot: string, stream: string) => {
    setHostInput(robot);
    setStreamHostInput(stream);
    setRobotHost(robot);
    setStreamHost(stream);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_robot_host', robot);
      localStorage.setItem('ecobot_stream_host', stream);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLiveKitConnectToggle = () => {
    if (isLiveKitConnected) {
      disconnectLiveKit();
    } else {
      setLivekitUrl(lkUrlInput.trim());
      setRoomName(lkRoomInput.trim());
      setToken(lkTokenInput.trim());
      connectLiveKit(lkUrlInput.trim(), lkTokenInput.trim(), lkRoomInput.trim());
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Dashboard Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Configure network connection endpoints, LiveKit WebRTC, and target Jetson device settings.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Configuration saved! Connecting to updated endpoints...</span>
        </div>
      )}

      {/* Quick Presets */}
      <div className="bg-card border border-card-border rounded-xl p-4 shadow-lg space-y-3">
        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Quick Connection Presets
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset('localhost', 'localhost')}
            className="p-2.5 bg-background/60 hover:bg-card-border/60 border border-card-border rounded-lg text-left transition-colors cursor-pointer group"
          >
            <div className="font-semibold text-gray-200 group-hover:text-primary flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5" />
              <span>Local Dev (localhost)</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">ws://localhost:9090</p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(ROS_CONFIG.DEFAULT_LAN_IP, ROS_CONFIG.DEFAULT_LAN_IP)}
            className="p-2.5 bg-background/60 hover:bg-card-border/60 border border-card-border rounded-lg text-left transition-colors cursor-pointer group"
          >
            <div className="font-semibold text-gray-200 group-hover:text-primary flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <span>Jetson LAN IP</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{ROS_CONFIG.DEFAULT_LAN_IP}</p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('mock', 'mock')}
            className="p-2.5 bg-background/60 hover:bg-card-border/60 border border-card-border rounded-lg text-left transition-colors cursor-pointer group"
          >
            <div className="font-semibold text-gray-200 group-hover:text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Offline Mock Mode</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">Synthetic Simulation</p>
          </button>
        </div>
      </div>

      {/* LiveKit WebRTC Configuration Card */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span>LiveKit WebRTC Connection (Ultra-Low Latency &lt;100ms)</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
            isLiveKitConnected ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-card-border text-gray-400'
          }`}>
            {isLiveKitConnected ? `CONNECTED (${videoTracks.length} tracks)` : isLiveKitConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          LiveKit streams video tracks and telemetry from ROS 2 directly to browser WebRTC with adaptive bitrate and sub-second latency over the internet.
        </p>

        {livekitError && (
          <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 text-xs">
            {livekitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">LiveKit Server WebSocket URL</label>
            <input
              type="text"
              value={lkUrlInput}
              onChange={(e) => setLkUrlInput(e.target.value)}
              placeholder="wss://your-project.livekit.cloud"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1">Room Name</label>
            <input
              type="text"
              value={lkRoomInput}
              onChange={(e) => setLkRoomInput(e.target.value)}
              placeholder="ecobot-teleop"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 font-medium mb-1">LiveKit Access Token (Optional if server API keys configured)</label>
            <input
              type="password"
              value={lkTokenInput}
              onChange={(e) => setLkTokenInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleLiveKitConnectToggle}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLiveKitConnected
                ? 'bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50'
                : 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30'
            }`}
          >
            {isLiveKitConnected ? <Unlink className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
            <span>{isLiveKitConnected ? 'Disconnect LiveKit' : 'Connect LiveKit WebRTC'}</span>
          </button>
        </div>
      </div>

      {/* HTTPS / Mixed Content Notice */}
      {isHttpsPage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>HTTPS Video Stream Notice (Chrome / Edge Mixed Content)</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            When loading the dashboard over HTTPS, browsers block insecure HTTP MJPEG video streams on ports <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8081</code> & <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8085</code> by default. LiveKit WebRTC bypasses this completely!
          </p>

          <div className="bg-black/40 border border-amber-500/20 rounded-lg p-3 space-y-2 text-xs">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>To Allow Local Video Streams in Chrome / Edge:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11.5px] pl-1">
              <li>Click the <strong>Site Settings / Lock icon</strong> next to the URL in the address bar.</li>
              <li>Click <strong>Site settings</strong>.</li>
              <li>Find <strong>Insecure content</strong> and set it to <span className="text-emerald-400 font-bold">Allow</span>.</li>
              <li>Reload the tab — video feeds will now load smoothly!</li>
            </ol>
          </div>
        </div>
      )}

      {/* Target Jetson Host Card */}
      <form onSubmit={handleSave} className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Robot Network Endpoints (ROS 2 Bridge & HTTP Streams)</span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-gray-400 font-medium">1. ROS 2 Bridge WebSocket Endpoint</label>
              <span className="text-[11px] text-gray-500 font-mono">Port: {ROS_CONFIG.ROSBRIDGE_PORT}</span>
            </div>
            <input
              type="text"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              placeholder="e.g. localhost or 192.168.8.105 (LAN). Remote control uses LiveKit — no host needed."
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            {resolvedRosUrl && (
              <p className="text-[11px] font-mono text-gray-400 mt-1">
                Resolved ROS Target: <span className="text-blue-300 font-semibold">{resolvedRosUrl}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs text-gray-400 font-medium">2. Video Stream Host / IP / MJPEG Base URL</label>
              <span className="text-[11px] text-gray-500 font-mono">Ports: 8081, 8085</span>
            </div>
            <input
              type="text"
              value={streamHostInput}
              onChange={(e) => setStreamHostInput(e.target.value)}
              placeholder="e.g. localhost or 192.168.8.105"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Used for MJPEG video stream URLs (e.g. <code className="text-blue-300 font-semibold">http://{streamHostInput || 'localhost'}:8081/stream.mjpg</code>)
            </p>
          </div>

          <div className="pt-2 border-t border-card-border">
            <div className="flex justify-between items-center mb-1 mt-2">
              <label className="block text-xs text-blue-400 font-bold">3. Camera Source URL for Local YOLO Engine (Optional)</label>
            </div>
            <input
              type="text"
              value={cameraSourceInput}
              onChange={(e) => setCameraSourceInput(e.target.value)}
              placeholder="http://192.168.8.105:8084/arm_camera.mjpg"
              className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-500"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Optional override: paste an MJPEG stream URL to feed the local YOLO detection backend.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save & Connect
          </button>
        </div>
      </form>

      {/* Live Stream Test Previews */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Video className="w-4 h-4 text-purple-400" />
          Live Camera Stream Previews
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CameraFeed
            title="RealSense D415 (Port 8081)"
            port={ROS_CONFIG.REALSENSE_STREAM_PORT}
            endpoint="stream.mjpg"
            livekitTrackName="realsense"
          />
          <CameraFeed
            title="Wrist Camera (Port 8085)"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            livekitTrackName="wrist"
          />
        </div>
      </div>
    </div>
  );
}
