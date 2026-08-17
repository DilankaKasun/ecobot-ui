'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Box, Cpu, Sprout, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Drive', icon: LayoutDashboard },
  { href: '/map3d', label: '3D Map', icon: Box },
  { href: '/arm', label: 'Arm', icon: Cpu },
  { href: '/mission', label: 'Mission', icon: Sprout },
  { href: '/settings', label: 'Config', icon: Settings },
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-card-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === '/' && pathname === '/') ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};