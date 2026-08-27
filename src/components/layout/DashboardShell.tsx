'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onToggleMobileMenu={() => setMobileSidebarOpen((v) => !v)} isMobileMenuOpen={mobileSidebarOpen} />
      <div className="flex flex-1 relative">
        <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 w-full max-w-7xl mx-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
