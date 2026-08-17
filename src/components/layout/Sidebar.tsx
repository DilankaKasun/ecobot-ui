'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, Cpu, Sprout, Settings, Eye } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview & Drive', icon: LayoutDashboard },
  { href: '/map3d', label: '3D SLAM & Map', icon: Box },
  { href: '/arm', label: 'Arm & VLA Studio', icon: Cpu },
  { href: '/mission', label: 'Plant Mission AI', icon: Sprout },
  { href: '/settings', label: 'Configuration', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-card-border bg-card flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-card-border/40'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="bg-background/60 border border-card-border/60 rounded-xl p-3.5 text-xs text-gray-400">
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
    </aside>
  );
};
