'use client';

import React, { useState, useEffect } from 'react';
import { useRos, isLocalOrLanHost } from '@/hooks/useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { Settings, Save, Server, Video, CheckCircle2, ShieldAlert, Globe, HelpCircle } from 'lucide-react';

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
    
    // Tell the Python YOLO backend to start watching this video feed
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

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Dashboard Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Configure network connection endpoints, video streaming ports, and target Jetson device settings.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Configuration saved! Reconnecting to new robot host...</span>
        </div>
      )}

      {/* HTTPS / Vercel Mixed Content Notice */}
      {isHttpsPage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>HTTPS Video Stream Fix (Chrome / Edge Settings)</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            When connecting ROS via a Cloudflare/Ngrok Tunnel (<code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">wss://...trycloudflare.com</code>) on Vercel (<code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">https://ecobot-ui.vercel.app</code>), the video feeds run on local ports (<code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8081</code> & <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300">8085</code>).
          </p>

          <div className="bg-black/40 border border-amber-500/20 rounded-lg p-3 space-y-2 text-xs">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Allow Local Video Streams in Chrome / Edge (3 Quick Steps):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11.5px] pl-1">
              <li>On <code className="text-blue-300">https://ecobot-ui.vercel.app</code>, click the <strong>Site Settings / Tune / Lock icon</strong> next to the URL in the address bar.</li>
              <li>Click <strong>Site settings</strong>.</li>
              <li>Find <strong>Insecure content</strong> in the permissions list and change it from <strong>Block (default)</strong> to <span className="text-emerald-400 font-bold">Allow</span>.</li>
              <li>Refresh the tab — the MJPEG video feeds on ports 8081 & 8085 will now load!</li>
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
              <label className="block text-xs text-gray-400 font-medium">1. ROS 2 Bridge Endpoint (WebSocket / Tunnel)</label>
              <span className="text-[11px] text-gray-500 font-mono">Default: {ROS_CONFIG.DEFAULT_ROBOT_HOST}</span>
            </div>
            <input
              type="text"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              placeholder="wss://functional-hugh-focusing-hierarchy.trycloudflare.com"
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
              <label className="block text-xs text-gray-400 font-medium">2. Video Stream Host / Local IP Address</label>
              <span className="text-[11px] text-gray-500 font-mono">Ports: 8081, 8085</span>
            </div>
            <input
              type="text"
              value={streamHostInput}
              onChange={(e) => setStreamHostInput(e.target.value)}
              placeholder="localhost (Leave as localhost if running YOLO locally)"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Used for MJPEG video stream URLs (e.g. <code className="text-blue-300 font-semibold">http://{streamHostInput || 'localhost'}:8081/stream.mjpg</code>)
            </p>
          </div>

          <div className="pt-2 border-t border-card-border">
            <div className="flex justify-between items-center mb-1 mt-2">
              <label className="block text-xs text-blue-400 font-bold">3. Robot Cloudflare Video Link (Sends to YOLO)</label>
            </div>
            <input
              type="text"
              value={cameraSourceInput}
              onChange={(e) => setCameraSourceInput(e.target.value)}
              placeholder="https://your-cloudflare-link.trycloudflare.com/stream.mjpg"
              className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-500"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Paste the Cloudflare link here. The Frontend will send this to the YOLO model to process.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save & Reconnect
          </button>
          <button
            type="button"
            onClick={() => {
              setHostInput(ROS_CONFIG.DEFAULT_ROBOT_HOST);
              setStreamHostInput(ROS_CONFIG.DEFAULT_ROBOT_HOST);
              setRobotHost(ROS_CONFIG.DEFAULT_ROBOT_HOST);
              setStreamHost(ROS_CONFIG.DEFAULT_ROBOT_HOST);
              localStorage.setItem('ecobot_robot_host', ROS_CONFIG.DEFAULT_ROBOT_HOST);
              localStorage.setItem('ecobot_stream_host', ROS_CONFIG.DEFAULT_ROBOT_HOST);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            }}
            className="px-3 py-2 bg-card-border hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Reset to Default Robot
          </button>
        </div>
      </form>

      {/* Port Reference Card */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Video className="w-4 h-4 text-purple-400" />
          <span>Default Stream & Service Ports</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-background/50 border border-card-border rounded-lg flex justify-between items-center">
            <span className="text-gray-400">ROSBridge WebSocket:</span>
            <span className="font-mono font-bold text-white">Port {ROS_CONFIG.ROSBRIDGE_PORT}</span>
          </div>

          <div className="p-3 bg-background/50 border border-card-border rounded-lg flex justify-between items-center">
            <span className="text-gray-400">RealSense D415 MJPEG:</span>
            <span className="font-mono font-bold text-white">Port {ROS_CONFIG.REALSENSE_STREAM_PORT}</span>
          </div>

          <div className="p-3 bg-background/50 border border-card-border rounded-lg flex justify-between items-center">
            <span className="text-gray-400">Arm Wrist Camera MJPEG:</span>
            <span className="font-mono font-bold text-white">Port {ROS_CONFIG.ARM_CAMERA_PORT}</span>
          </div>

          <div className="p-3 bg-background/50 border border-card-border rounded-lg flex justify-between items-center">
            <span className="text-gray-400">Obstacle Avoidance Debug:</span>
            <span className="font-mono font-bold text-white">Port {ROS_CONFIG.OBSTACLE_STREAM_PORT}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
