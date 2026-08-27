import type { Metadata } from 'next';
import './globals.css';
import { RosProvider } from '@/hooks/useRos';
import { LiveKitProvider } from '@/hooks/useLiveKit';
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
      <body className="bg-background text-gray-100 h-screen w-screen overflow-hidden flex flex-col" suppressHydrationWarning>
        <RosProvider>
          <LiveKitProvider>
            <div className="flex flex-col w-full h-full relative">
              <Navbar />
              <div className="flex flex-1 min-h-0">
                <Sidebar />
                {/* min-h-0 above + this scroll container keep `h-full` pages
                    (/, /live, /map3d) bounded to the viewport while letting
                    taller scrolling pages (/arm, /mission) scroll. */}
                <main className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
                  {children}
                </main>
              </div>
              <MobileNav />
            </div>
          </LiveKitProvider>
        </RosProvider>
      </body>
    </html>
  );
}
