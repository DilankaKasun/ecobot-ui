'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, Cpu, Sprout, Settings, Eye, Bot } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview & Drive', icon: LayoutDashboard },
  { href: '/map3d', label: '3D SLAM & Map', icon: Box },
  { href: '/arm', label: 'Arm & VLA Studio', icon: Cpu },
  { href: '/mission', label: 'Plant Mission AI', icon: Sprout },
  { href: '/live', label: 'Live AI Agent', icon: Bot },
  { href: '/settings', label: 'Configuration', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-16 shrink-0 border-r border-white/5 bg-card/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex-col items-center py-6 min-h-full">
      <nav className="flex flex-col gap-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary/90 text-background shadow-[0_0_20px_rgba(0,229,192,0.5)] backdrop-blur-md'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto pb-4">
        <Link
          href="/settings"
          title="Configuration"
          className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all duration-300"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </aside>
  );
};
