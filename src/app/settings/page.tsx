'use client';

import React, { useState, useEffect } from 'react';
import { useRos, isLocalOrLanHost } from '@/hooks/useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { CameraFeed } from '@/components/video/CameraFeed';
import { Settings, Save, Server, Video, CheckCircle2, ShieldAlert, Globe, HelpCircle, Laptop, Wifi, Sparkles, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { robotHost, streamHost, setRobotHost, setStreamHost, isConnected, resolvedRosUrl } = useRos();
  const [hostInput, setHostInput] = useState(robotHost);
  const [streamHostInput, setStreamHostInput] = useState(streamHost);
  const [cameraSourceInput, setCameraSourceInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setHostInput(robotHost);
    setStreamHostInput(streamHost);
  }, [robotHost, streamHost]);

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(hostInput.trim());
    setStreamHost(streamHostInput.trim());
    
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

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Dashboard Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Configure network connection endpoints, video streaming hosts, and target Jetson device settings.
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

      {/* HTTPS / Mixed Content Notice */}
      {isHttpsPage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>HTTPS Video Stream Notice (Chrome / Edge Mixed Content)</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            When loading the dashboard over HTTPS, browsers block insecure HTTP MJPEG video streams on ports <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8081</code> & <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8085</code> by default.
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
          <span>Robot Network Endpoints</span>
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
              placeholder="e.g. localhost, 192.168.8.105, or wss://<tunnel-id>.trycloudflare.com"
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
              placeholder="https://<tunnel-id>.trycloudflare.com/stream.mjpg"
              className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-500"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              If running a remote tunnel, paste the camera stream URL here to feed the local YOLO detection backend.
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
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED}
          />
          <CameraFeed
            title="Wrist Camera (Port 8085)"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
          />
        </div>
      </div>
    </div>
  );
}
