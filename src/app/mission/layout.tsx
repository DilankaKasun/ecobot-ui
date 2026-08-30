import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plant Run',
  description: 'Autonomous multi-waypoint plant-scan mission control.',
};

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
