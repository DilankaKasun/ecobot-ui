import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evaluation',
  description: 'Component tests, plant-run trials, results and export for evaluating EcoBot.',
};

export default function TrialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
