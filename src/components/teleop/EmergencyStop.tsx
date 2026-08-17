'use client';

import React from 'react';
import { useTeleop } from '@/hooks/useTeleop';
import { OctagonAlert } from 'lucide-react';

export const EmergencyStop: React.FC = () => {
  const { emergencyStop } = useTeleop();

  return (
    <button
      onClick={emergencyStop}
      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.98] text-white font-bold text-base shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-3 transition-all cursor-pointer border border-red-400/40"
    >
      <OctagonAlert className="w-6 h-6 animate-pulse" />
      <span>EMERGENCY STOP</span>
    </button>
  );
};
