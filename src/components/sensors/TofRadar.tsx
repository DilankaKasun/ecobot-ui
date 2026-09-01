'use client';

import React from 'react';
import { useToFSensors } from '@/hooks/useToFSensors';
import { Radio, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TofRadar: React.FC = () => {
  const tof = useToFSensors();

  // Normalize distances (0 to 1200mm)
  const leftPct = Math.min(100, Math.max(5, (tof.left / 1200) * 100));
  const rightPct = Math.min(100, Math.max(5, (tof.right / 1200) * 100));

  const getColor = (val: number) => {
    if (val <= 0 || val > 1200) return 'bg-gray-600';
    if (val < 200) return 'bg-rose-500';
    if (val < 400) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (val: number) => {
    if (val <= 0) return <span className="text-[10px] text-muted-foreground">No Target</span>;
    if (val < 200) return <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold">CLOSE</span>;
    if (val < 400) return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-medium">NEAR</span>;
    return <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">CLEAR</span>;
  };

  const hasCloseObstacle = (tof.left > 0 && tof.left < 250) || (tof.right > 0 && tof.right < 250);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Radio className="w-4 h-4 text-blue-400" />
          <span>ESP32 ToF Proximity Sensors</span>
        </div>
        <div className="flex items-center gap-1">
          {hasCloseObstacle ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono font-bold text-[11px] animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Obstacle Alert
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px]">
              <ShieldCheck className="w-3 h-3" /> Path Clear
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Left Sensor */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-muted-foreground">Left ToF Sensor</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(tof.left)}
              <span className="font-mono font-bold text-white">
                {tof.left > 0 ? `${tof.left} mm (${(tof.left / 10).toFixed(1)} cm)` : '--'}
              </span>
            </div>
          </div>
          <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-card-border">
            <div
              className={`h-full transition-all duration-200 rounded-full ${getColor(tof.left)}`}
              style={{ width: `${leftPct}%` }}
            />
          </div>
        </div>

        {/* Right Sensor */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-muted-foreground">Right ToF Sensor</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(tof.right)}
              <span className="font-mono font-bold text-white">
                {tof.right > 0 ? `${tof.right} mm (${(tof.right / 10).toFixed(1)} cm)` : '--'}
              </span>
            </div>
          </div>
          <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-card-border">
            <div
              className={`h-full transition-all duration-200 rounded-full ${getColor(tof.right)}`}
              style={{ width: `${rightPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
