import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Robot host, camera stream and LiveKit configuration.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
