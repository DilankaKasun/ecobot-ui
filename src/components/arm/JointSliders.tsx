'use client';

import React from 'react';
import { useArmControl, ARM_PRESETS } from '@/hooks/useArmControl';
import { ARM_PARAMS } from '@/lib/kinematics';
import { Sliders, RotateCcw, ChevronLeft, ChevronRight, ShieldAlert, WifiOff } from 'lucide-react';
import { ArmJoints } from '@/types/ros';
import { useRos } from '@/hooks/useRos';

export const JointSliders: React.FC = () => {
  const { isConnected, operatorMode } = useRos();
  const { joints, setJointAngle, stepJoint, setAllJoints, homeArm } = useArmControl();

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white text-base">4-DOF Joint Control</h3>
        </div>
        <button
          onClick={homeArm}
          className="flex items-center gap-1.5 px-3 py-1 bg-card-border hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Home Position
        </button>
      </div>

      {!isConnected && (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Robot offline / connecting. Sliders update local pose; connect to stream to arm.</span>
        </div>
      )}

      {isConnected && operatorMode === 'observer' && (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span><strong>Observer (View-Only)</strong> mode active. Switch to <strong>Operator</strong> in top navbar to send commands.</span>
        </div>
      )}

      {/* Preset Poses */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {ARM_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setAllJoints(preset.joints)}
            className="py-1.5 px-2 bg-black/40 hover:bg-card-border border border-card-border/60 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all text-center cursor-pointer active:scale-95"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {ARM_PARAMS.JOINTS.map((j) => {
          const jointKey = j.name as keyof ArmJoints;
          const currentVal = joints[jointKey] ?? j.home;

          return (
            <div key={j.name} className="p-3 bg-background/50 border border-card-border/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-200">{j.label}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-black/50 border border-card-border rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      min={j.min}
                      max={j.max}
                      value={currentVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setJointAngle(jointKey, val);
                      }}
                      className="w-10 bg-transparent text-right font-mono text-blue-400 font-bold text-xs focus:outline-none"
                    />
                    <span className="text-gray-400 font-mono text-[11px]">°</span>
                  </div>
                </div>
              </div>

              {/* Slider + Stepper Controls */}
              <div className="flex items-center gap-2">
                {/* -5 and -1 buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => stepJoint(jointKey, -5)}
                    disabled={currentVal <= j.min}
                    className="p-1 px-1.5 rounded bg-card-border/70 hover:bg-gray-700 disabled:opacity-30 text-[10px] font-mono text-gray-300 cursor-pointer"
                    title="-5°"
                  >
                    -5°
                  </button>
                  <button
                    onClick={() => stepJoint(jointKey, -1)}
                    disabled={currentVal <= j.min}
                    className="p-1 rounded bg-card-border/70 hover:bg-gray-700 disabled:opacity-30 text-gray-300 cursor-pointer"
                    title="-1°"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Range Slider */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono w-5 text-right">{j.min}°</span>
                  <input
                    type="range"
                    min={j.min}
                    max={j.max}
                    step={1}
                    value={currentVal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!isNaN(v)) setJointAngle(jointKey, v);
                    }}
                    className="flex-1 accent-blue-500 h-2 bg-black/60 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-500 font-mono w-6">{j.max}°</span>
                </div>

                {/* +1 and +5 buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => stepJoint(jointKey, 1)}
                    disabled={currentVal >= j.max}
                    className="p-1 rounded bg-card-border/70 hover:bg-gray-700 disabled:opacity-30 text-gray-300 cursor-pointer"
                    title="+1°"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => stepJoint(jointKey, 5)}
                    disabled={currentVal >= j.max}
                    className="p-1 rounded bg-card-border/70 hover:bg-gray-700 disabled:opacity-30 text-[10px] font-mono text-gray-300 cursor-pointer"
                    title="+5°"
                  >
                    +5°
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
