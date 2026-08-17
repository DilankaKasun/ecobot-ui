'use client';

import React, { useState } from 'react';
import { useRos } from '@/hooks/useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { Settings, Save, Server, Video, Activity, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { robotHost, setRobotHost, isConnected } = useRos();
  const [hostInput, setHostInput] = useState(robotHost);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(hostInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Dashboard Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Configure network connection endpoints, video streaming ports, and target Jetson device settings.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration saved! Reconnecting to new robot host...</span>
        </div>
      )}

      {/* Target Jetson Host Card */}
      <form onSubmit={handleSave} className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Robot Network Endpoint</span>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs text-gray-400 font-medium">Jetson IP Address / Hostname</label>
            <span className="text-[11px] text-gray-500 font-mono">Default: {ROS_CONFIG.DEFAULT_ROBOT_HOST}</span>
          </div>
          <input
            type="text"
            value={hostInput}
            onChange={(e) => setHostInput(e.target.value)}
            placeholder={ROS_CONFIG.DEFAULT_ROBOT_HOST}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
              setRobotHost(ROS_CONFIG.DEFAULT_ROBOT_HOST);
              localStorage.setItem('ecobot_robot_host', ROS_CONFIG.DEFAULT_ROBOT_HOST);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 3000);
            }}
            className="px-3 py-2 bg-card-border hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Set Default (192.168.8.105)
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const current = window.location.hostname || 'localhost';
                setHostInput(current);
                setRobotHost(current);
                localStorage.removeItem('ecobot_robot_host');
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
              }
            }}
            className="px-3 py-2 bg-card-border hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Auto-Detect from Browser URL
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
