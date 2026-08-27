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
