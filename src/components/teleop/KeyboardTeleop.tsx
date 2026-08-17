'use client';

import React, { useEffect, useState } from 'react';
import { useTeleop } from '@/hooks/useTeleop';
import { Keyboard } from 'lucide-react';

export const KeyboardTeleop: React.FC = () => {
  const { sendTwist, emergencyStop } = useTeleop();
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, [key]: true }));

        if (key === ' ') {
          emergencyStop();
          return;
        }

        let lin = 0;
        let ang = 0;
        if (key === 'w') lin = 0.3;
        if (key === 's') lin = -0.2;
        if (key === 'a') ang = 0.6;
        if (key === 'd') ang = -0.6;

        sendTwist(lin, ang);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        setActiveKeys((prev) => ({ ...prev, [key]: false }));
        sendTwist(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, sendTwist, emergencyStop]);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-200">
          <Keyboard className="w-4 h-4 text-blue-400" />
          <span>WASD Keyboard Drive</span>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {enabled ? 'Active' : 'Muted'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 w-36 mx-auto my-2">
        <div />
        <div
          className={`h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all ${
            activeKeys['w']
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              : 'bg-background border-card-border text-gray-400'
          }`}
        >
          W
        </div>
        <div />
        <div
          className={`h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all ${
            activeKeys['a']
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              : 'bg-background border-card-border text-gray-400'
          }`}
        >
          A
        </div>
        <div
          className={`h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all ${
            activeKeys['s']
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              : 'bg-background border-card-border text-gray-400'
          }`}
        >
          S
        </div>
        <div
          className={`h-10 rounded-lg flex items-center justify-center font-bold text-sm border transition-all ${
            activeKeys['d']
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
              : 'bg-background border-card-border text-gray-400'
          }`}
        >
          D
        </div>
      </div>

      <div className="text-center text-[11px] text-gray-500 mt-2">
        Press <span className="text-gray-300 font-mono">SPACE</span> for emergency stop
      </div>
    </div>
  );
};
