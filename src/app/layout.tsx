import type { Metadata } from 'next';
import './globals.css';
import { RosProvider } from '@/hooks/useRos';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'EcoBot Next.js Dashboard',
  description: 'Autonomous Mobile Manipulator Remote Control & AI Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-gray-100 min-h-screen" suppressHydrationWarning>
        <RosProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 w-full max-w-7xl mx-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
                {children}
              </main>
            </div>
            <MobileNav />
          </div>
        </RosProvider>
      </body>
    </html>
  );
}
