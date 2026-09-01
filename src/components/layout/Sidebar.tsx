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
    <aside className="hidden md:flex w-16 shrink-0 border-r border-card-border bg-card backdrop-blur-md shadow-sm flex-col items-center py-6 min-h-full">
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
                  ? 'bg-primary/90 text-background shadow-sm backdrop-blur-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
