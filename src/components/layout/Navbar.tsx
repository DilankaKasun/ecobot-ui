'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRos } from '@/hooks/useRos';
import { Bot, Wifi, WifiOff, Settings as SettingsIcon, Activity, AlertTriangle, ShieldCheck, Eye, Share2, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isConnected, isConnecting, robotHost, streamHost, setRobotHost, isMixedContentWarning, connectionError, operatorMode, setOperatorMode } = useRos();
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [tempIp, setTempIp] = useState(robotHost);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSaveIp = (e: React.FormEvent) => {
    e.preventDefault();
    setRobotHost(tempIp.trim());
    setIsEditingIp(false);
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.origin);
      url.searchParams.set('robot', robotHost);
      if (streamHost) {
        url.searchParams.set('stream', streamHost);
      }
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <header className="h-14 md:h-16 border-b border-card-border bg-card px-3 sm:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Bot className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-base md:text-lg text-white leading-tight flex items-center gap-2">
            EcoBot{' '}
            <span className="hidden xs:inline-block text-[11px] md:text-xs px-1.5 md:px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
              ROS 2
            </span>
          </h1>
          <p className="hidden md:block text-xs text-gray-400 truncate">Autonomous Mobile Manipulator</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Multi-User Mode Toggle */}
        <div className="hidden lg:flex items-center bg-background/80 border border-card-border rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setOperatorMode('operator')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              operatorMode === 'operator'
                ? 'bg-blue-600 text-white font-semibold shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Operator Mode: Full control active"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Operator</span>
          </button>
          <button
            onClick={() => setOperatorMode('observer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              operatorMode === 'observer'
                ? 'bg-amber-600 text-white font-semibold shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Observer Mode: View streams & telemetry only (prevents multi-user control conflicts)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Only</span>
          </button>
        </div>

        {/* Compact View-Only indicator for small screens */}
        {operatorMode === 'observer' && (
          <span className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
            <Eye className="w-3 h-3" />
            View
          </span>
        )}

        {/* Share Configured URL Button */}
        <button
          onClick={handleCopyShareLink}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-card-border/60 hover:bg-card-border text-gray-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
          title="Copy shared link for other users (includes active robot endpoint)"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
          <span>{copiedLink ? 'Copied!' : 'Share'}</span>
        </button>

        {/* Mixed Content Warning Badge if on HTTPS trying ws:// */}
        {isMixedContentWarning && !isConnected && (
          <Link
            href="/settings"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs hover:bg-amber-500/30 transition-colors"
            title={connectionError || 'Insecure WebSocket (ws://) blocked on HTTPS page'}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>HTTPS Notice</span>
          </Link>
        )}

        {/* Robot IP and Connection Status */}
        <div className="flex items-center gap-2 sm:gap-3 bg-background/80 border border-card-border px-2 sm:px-3 py-1.5 rounded-lg text-sm min-w-0">
          {isConnecting ? (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline text-xs font-medium">Connecting...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <Wifi className="hidden sm:block w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400" title={connectionError || 'Offline'}>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <WifiOff className="hidden sm:block w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Offline</span>
            </div>
          )}

          <div className="hidden sm:block h-4 w-px bg-card-border" />

          {isEditingIp ? (
            <form onSubmit={handleSaveIp} className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempIp}
                onChange={(e) => setTempIp(e.target.value)}
                className="bg-card border border-card-border px-2 py-0.5 rounded text-xs text-white focus:outline-none focus:border-blue-500 w-32 sm:w-44 font-mono"
                placeholder="Robot IP / wss://..."
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
              className="text-[11px] sm:text-xs font-mono text-gray-300 hover:text-white transition-colors max-w-[80px] sm:max-w-[150px] truncate"
              title="Click to edit Robot Host / Endpoint"
            >
              {robotHost}
            </button>
          )}
        </div>

        <Link
          href="/settings"
          className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-card-border/50 text-gray-400 hover:text-white hover:bg-card-border transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Link>
      </div>
    </header>
  );
};
