'use client';

import React from 'react';
import { useRos } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Radio, LogOut, Bot } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export const Navbar: React.FC = () => {
  const { operatorMode, setOperatorMode } = useRos();
  const { isConnected: isLiveKitConnected, isConnecting: isLiveKitConnecting, roomName } = useLiveKit();
  const { label: userLabel, logout } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card backdrop-blur-md border-b border-card-border shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary group-hover:bg-primary/30 transition-colors">
            <Bot className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-foreground tracking-wide text-sm flex items-center gap-1.5">
            EcoBot <span className="font-medium text-muted-foreground">Terminal</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono ml-1 border border-card-border">
              ROS 2
            </span>
          </h1>
        </Link>

        {/* LiveKit Cloud Status Badge */}
        <Link
          href="/settings"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
            isLiveKitConnected
              ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,229,192,0.2)]'
              : isLiveKitConnecting
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
          }`}
          title={`LiveKit Room: ${roomName}`}
        >
          <Radio className={`w-3 h-3 ${isLiveKitConnected ? 'animate-pulse' : isLiveKitConnecting ? 'animate-spin' : ''}`} />
          <span>{isLiveKitConnected ? `LiveKit (${roomName})` : isLiveKitConnecting ? 'Connecting LiveKit...' : 'LiveKit Offline'}</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <ThemeToggle />
        
        {/* Operator Toggle */}
        <button
          onClick={() => setOperatorMode(operatorMode === 'operator' ? 'observer' : 'operator')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md border transition-all text-xs font-semibold ${
            operatorMode === 'operator'
              ? 'bg-primary/20 backdrop-blur-md border-primary/40 text-primary shadow-[0_0_15px_rgba(0,229,192,0.2)]'
              : 'bg-card backdrop-blur-md border-card-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{operatorMode === 'operator' ? 'Operator' : 'View Only'}</span>
        </button>

        {/* Signed-in operator + sign out */}
        <div className="flex items-center gap-2 border-l border-card-border pl-4">
          <span className="hidden md:inline text-[11px] font-mono text-muted-foreground max-w-[120px] truncate" title={userLabel ?? ''}>
            {userLabel}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
