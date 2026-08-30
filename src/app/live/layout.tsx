import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live AI Agent',
  description: 'Real-time voice and vision conversation with the robot\'s cameras.',
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
