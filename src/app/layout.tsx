import type { Metadata } from 'next';
import './globals.css';
import { RosProvider } from '@/hooks/useRos';
import { DashboardShell } from '@/components/layout/DashboardShell';

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
          <DashboardShell>{children}</DashboardShell>
        </RosProvider>
      </body>
    </html>
  );
}
