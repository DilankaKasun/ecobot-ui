'use client';

import React, { useState } from 'react';
import { useRos } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, RefreshCw, WifiOff, Wifi, Radio, LogOut } from 'lucide-react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  const { isConnected, operatorMode, setOperatorMode, robotHost, setRobotHost } = useRos();
  const { isConnected: isLiveKitConnected, isConnecting: isLiveKitConnecting, roomName } = useLiveKit();
  const { label: userLabel, logout } = useAuth();
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [tempIp, setTempIp] = useState(robotHost);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(tempIp.trim());
    setIsEditingIp(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card/20 backdrop-blur-md border-b border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-card/20 border border-white/5 rounded-md px-4 py-1.5 shadow-sm">
          <h1 className="font-bold text-gray-100 tracking-wide text-sm flex items-center gap-2">
            EcoBot <span className="font-medium text-gray-400">Terminal</span>
            <span className="text-[10px] bg-card-border/50 text-gray-400 px-1.5 py-0.5 rounded font-mono ml-1">
              ROS 2
            </span>
          </h1>
        </div>

        {/* LiveKit Cloud Status Badge */}
        <Link
          href="/settings"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
            isLiveKitConnected
              ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,229,192,0.2)]'
              : isLiveKitConnecting
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-card/30 border-white/5 text-gray-500 hover:text-gray-300'
          }`}
          title={`LiveKit Room: ${roomName}`}
        >
          <Radio className={`w-3 h-3 ${isLiveKitConnected ? 'animate-pulse' : isLiveKitConnecting ? 'animate-spin' : ''}`} />
          <span>{isLiveKitConnected ? `LiveKit (${roomName})` : isLiveKitConnecting ? 'Connecting LiveKit...' : 'LiveKit Offline'}</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Operator Toggle */}
        <button
          onClick={() => setOperatorMode(operatorMode === 'operator' ? 'observer' : 'operator')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md border transition-all text-xs font-semibold ${
            operatorMode === 'operator'
              ? 'bg-primary/20 backdrop-blur-md border-primary/40 text-primary shadow-[0_0_15px_rgba(0,229,192,0.2)]'
              : 'bg-card/20 backdrop-blur-md border-white/5 text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{operatorMode === 'operator' ? 'Operator' : 'View Only'}</span>
        </button>

        {/* Status Icons & IP Input */}
        <div className="flex items-center gap-4 text-gray-400 border-l border-white/10 pl-6">
          {isEditingIp ? (
            <form onSubmit={handleSaveIp} className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempIp}
                onChange={(e) => setTempIp(e.target.value)}
                className="bg-card/20 backdrop-blur-md border border-primary/40 px-2 py-0.5 rounded text-xs text-primary focus:outline-none focus:border-primary w-40 font-mono shadow-[0_0_15px_rgba(0,229,192,0.2)]"
                placeholder="Robot wss://..."
                autoFocus
                onBlur={handleSaveIp}
              />
            </form>
          ) : (
            <button
              onClick={() => {
                setTempIp(robotHost);
                setIsEditingIp(true);
              }}
              className="text-xs font-mono text-gray-400 hover:text-primary transition-colors max-w-[150px] truncate"
              title="Click to edit Robot Host"
            >
              {robotHost}
            </button>
          )}

          <RefreshCw className={`w-4 h-4 ${!(isConnected || isLiveKitConnected) ? 'text-danger animate-spin-slow' : 'text-gray-400'}`} />
          {(isConnected || isLiveKitConnected) ? (
            <Wifi className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <WifiOff className="w-4 h-4 text-danger opacity-80" />
          )}
        </div>

        {/* Signed-in operator + sign out */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <span className="hidden md:inline text-[11px] font-mono text-gray-400 max-w-[120px] truncate" title={userLabel ?? ''}>
            {userLabel}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-md text-gray-500 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
