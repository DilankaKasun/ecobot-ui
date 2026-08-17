'use client';

import React, { useState } from 'react';
import { useArmControl } from '@/hooks/useArmControl';
import { Crosshair, Send } from 'lucide-react';

export const CartesianControl: React.FC = () => {
  const { currentPose, sendPoseGoal } = useArmControl();
  const [targetX, setTargetX] = useState<number>(0.25);
  const [targetY, setTargetY] = useState<number>(0.0);
  const [targetZ, setTargetZ] = useState<number>(0.2);

  const handleSendGoal = (e: React.FormEvent) => {
    e.preventDefault();
    sendPoseGoal({ x: targetX, y: targetY, z: targetZ });
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Crosshair className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white text-base">Inverse Kinematics (Cartesian Target)</h3>
        </div>

        {/* Current Pose Feedback */}
        <div className="p-3 bg-background/60 border border-card-border rounded-xl mb-4">
          <div className="text-xs text-gray-400 mb-1 font-medium">Current Wrist Pose (FK)</div>
          <div className="grid grid-cols-3 gap-2 font-mono text-sm font-bold text-center">
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-gray-400 text-xs font-normal">X: </span>
              <span className="text-blue-400">{currentPose.x.toFixed(3)}m</span>
            </div>
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-gray-400 text-xs font-normal">Y: </span>
              <span className="text-purple-400">{currentPose.y.toFixed(3)}m</span>
            </div>
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-gray-400 text-xs font-normal">Z: </span>
              <span className="text-emerald-400">{currentPose.z.toFixed(3)}m</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSendGoal} className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Target X (Forward)</label>
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="0.45"
                value={targetX}
                onChange={(e) => setTargetX(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Target Y (Lateral)</label>
              <input
                type="number"
                step="0.01"
                min="-0.30"
                max="0.30"
                value={targetY}
                onChange={(e) => setTargetY(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Target Z (Height)</label>
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="0.40"
                value={targetZ}
                onChange={(e) => setTargetZ(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send IK Goal to Manipulator
          </button>
        </form>
      </div>

      <p className="text-[11px] text-gray-500 mt-4">
        Coordinates are relative to the arm base. Reachable range is approx 15–40cm forward envelope.
      </p>
    </div>
  );
};
