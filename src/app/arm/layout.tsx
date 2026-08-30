import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manipulator Studio',
  description: 'Joint control, forward/inverse kinematics and VLA prompting for the EcoBot arm.',
};

export default function ArmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
