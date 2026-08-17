'use client';

import React from 'react';
import { useOdometry } from '@/hooks/useOdometry';
import { Gauge, Navigation, Activity, Zap } from 'lucide-react';

export const TelemetryCards: React.FC = () => {
  const { odom, runMode } = useOdometry();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Position Card */}
      <div className="bg-card border border-card-border rounded-xl p-3.5">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
          <span>Position (X, Y)</span>
          <Navigation className="w-4 h-4 text-blue-400" />
        </div>
        <div className="font-mono text-lg font-bold text-white">
          {odom.x.toFixed(2)}, {odom.y.toFixed(2)} <span className="text-xs font-normal text-gray-400">m</span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Heading: <span className="font-mono text-gray-300">{odom.yaw.toFixed(1)}°</span>
        </div>
      </div>

      {/* Linear Speed */}
      <div className="bg-card border border-card-border rounded-xl p-3.5">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
          <span>Linear Velocity</span>
          <Gauge className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="font-mono text-lg font-bold text-emerald-400">
          {odom.linearVelocity.toFixed(2)} <span className="text-xs font-normal text-gray-400">m/s</span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">Wheel Encoder Odometry</div>
      </div>

      {/* Angular Velocity */}
      <div className="bg-card border border-card-border rounded-xl p-3.5">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
          <span>Angular Velocity</span>
          <Activity className="w-4 h-4 text-purple-400" />
        </div>
        <div className="font-mono text-lg font-bold text-purple-400">
          {odom.angularVelocity.toFixed(2)} <span className="text-xs font-normal text-gray-400">rad/s</span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">Yaw Rate Feedback</div>
      </div>

      {/* Run Mode */}
      <div className="bg-card border border-card-border rounded-xl p-3.5">
        <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
          <span>Controller Mode</span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
              runMode === 1
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {runMode === 1 ? 'RC REMOTE' : 'CMD VEL'}
          </span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">RP2040 Pico State</div>
      </div>
    </div>
  );
};
