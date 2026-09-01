'use client';

import React from 'react';
import { useArmControl } from '@/hooks/useArmControl';
import { ARM_PARAMS } from '@/lib/kinematics';
import { Sliders, RotateCcw } from 'lucide-react';
import { ArmJoints } from '@/types/ros';

export const JointSliders: React.FC = () => {
  const { joints, setJointAngle, homeArm } = useArmControl();

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white text-base">4-DOF Joint Control</h3>
        </div>
        <button
          onClick={homeArm}
          className="flex items-center gap-1.5 px-3 py-1 bg-card-border hover:bg-gray-700 text-foreground rounded-lg text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Home Position
        </button>
      </div>

      <div className="space-y-4">
        {ARM_PARAMS.JOINTS.map((j) => {
          const jointKey = j.name as keyof ArmJoints;
          const currentVal = joints[jointKey];

          return (
            <div key={j.name} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">{j.label}</span>
                <span className="font-mono text-blue-400 font-bold">{currentVal}°</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground font-mono w-6 text-right">{j.min}°</span>
                <input
                  type="range"
                  min={j.min}
                  max={j.max}
                  step={1}
                  value={currentVal}
                  onChange={(e) => setJointAngle(jointKey, parseInt(e.target.value))}
                  className="flex-1 accent-blue-500 h-2 bg-background rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground font-mono w-8">{j.max}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
