'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, Cpu, Sprout, Settings, Eye, X } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Overview & Drive', icon: LayoutDashboard },
  { href: '/map3d', label: '3D SLAM & Map', icon: Box },
  { href: '/arm', label: 'Arm & VLA Studio', icon: Cpu },
  { href: '/mission', label: 'Plant Mission AI', icon: Sprout },
  { href: '/settings', label: 'Configuration', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-4">
        {onCloseMobile && (
          <div className="md:hidden flex items-center justify-between pb-2 border-b border-card-border">
            <span className="font-bold text-white text-sm">Navigation Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-card-border"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-card-border/40'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="bg-background/60 border border-card-border/60 rounded-xl p-3.5 text-xs text-gray-400 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-300">Jetson Sensors</span>
          <Eye className="w-4 h-4 text-blue-400" />
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between">
            <span>D415 RGB-D:</span>
            <span className="text-emerald-400">Active (30fps)</span>
          </div>
          <div className="flex justify-between">
            <span>YOLOv8 Engine:</span>
            <span className="text-emerald-400">TensorRT</span>
          </div>
          <div className="flex justify-between">
            <span>ESP32 ToF:</span>
            <span className="text-emerald-400">Online</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-card-border bg-card flex-col min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Mobile Slide-Out Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Slide-out Drawer */}
          <div className="relative w-64 max-w-[80vw] bg-card border-r border-card-border h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
