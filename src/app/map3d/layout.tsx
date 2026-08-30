import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D Map',
  description: 'SLAM point-cloud and 3D map visualization.',
};

export default function Map3dLayout({ children }: { children: React.ReactNode }) {
  return children;
}
