'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRos } from '@/hooks/useRos';
import { Bot, Wifi, WifiOff, Settings as SettingsIcon, Activity } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isConnected, isConnecting, robotHost, setRobotHost } = useRos();
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [tempIp, setTempIp] = useState(robotHost);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(tempIp.trim());
    setIsEditingIp(false);
  };

  return (
    <header className="h-16 border-b border-card-border bg-card px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
            EcoBot <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">ROS 2</span>
          </h1>
          <p className="text-xs text-gray-400">Autonomous Mobile Manipulator</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Robot IP and Connection Status */}
        <div className="flex items-center gap-3 bg-background/80 border border-card-border px-3 py-1.5 rounded-lg text-sm">
          {isConnecting ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Connecting...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <Wifi className="w-4 h-4" />
              <span className="text-xs font-semibold">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <WifiOff className="w-4 h-4" />
              <span className="text-xs font-semibold">Offline</span>
            </div>
          )}

          <div className="h-4 w-px bg-card-border" />

          {isEditingIp ? (
            <form onSubmit={handleSaveIp} className="flex items-center gap-2">
              <input
                type="text"
                value={tempIp}
                onChange={(e) => setTempIp(e.target.value)}
                className="bg-card border border-card-border px-2 py-0.5 rounded text-xs text-white focus:outline-none focus:border-blue-500 w-32"
                placeholder="Robot IP"
                autoFocus
              />
              <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded">
                Save
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempIp(robotHost);
                setIsEditingIp(true);
              }}
              className="text-xs font-mono text-gray-300 hover:text-white transition-colors"
              title="Click to edit Robot IP"
            >
              {robotHost}
            </button>
          )}
        </div>

        <Link
          href="/settings"
          className="p-2 rounded-lg bg-card-border/50 text-gray-400 hover:text-white hover:bg-card-border transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
};
