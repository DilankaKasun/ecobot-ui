'use client';

import React from 'react';
import { useArmControl, ARM_PRESETS } from '@/hooks/useArmControl';
import { useArmStatus } from '@/hooks/useArmStatus';
import { useRos } from '@/hooks/useRos';
import { ARM_PARAMS } from '@/lib/kinematics';
import { Sliders, RotateCcw, Power, Scan, Compass, Package } from 'lucide-react';
import { ArmJoints } from '@/types/ros';

export const JointSliders: React.FC = () => {
  const { isConnected } = useRos();
  const { joints, setJointAngle, setAllJoints, enableArm, disableArm } = useArmControl();
  const armStatus = useArmStatus();

  const isServosEnabled =
    armStatus?.state?.toLowerCase() === 'enabled' ||
    armStatus?.status?.toLowerCase() === 'enabled' ||
    (armStatus?.state && !['disabled', 'off'].includes(armStatus.state.toLowerCase()));

  const handleToggleServos = () => {
    if (isServosEnabled) {
      disableArm();
    } else {
      enableArm();
    }
  };

  const presetIcons: Record<string, React.ReactNode> = {
    HOME: <RotateCcw className="w-3.5 h-3.5 text-blue-400" />,
    PLANT_SCAN: <Scan className="w-3.5 h-3.5 text-emerald-400" />,
    FORWARD_REACH: <Compass className="w-3.5 h-3.5 text-purple-400" />,
    TUCK: <Package className="w-3.5 h-3.5 text-amber-400" />,
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white text-base">4-DOF Joint Control</h3>
        </div>

        {/* Servos ON/OFF Toggle */}
        <button
          onClick={handleToggleServos}
          disabled={!isConnected}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            !isConnected
              ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              : isServosEnabled
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 cursor-pointer'
          }`}
        >
          <Power className={`w-3.5 h-3.5 ${isServosEnabled ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span>Servos: {isServosEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Motion Presets */}
      <div>
        <div className="text-xs font-medium text-gray-400 mb-2">Motion Presets</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(ARM_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setAllJoints(preset.joints)}
              disabled={!isConnected}
              title={preset.description}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-card-border/60 hover:bg-card-border text-gray-200 hover:text-white rounded-lg text-xs font-semibold transition-all border border-card-border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {presetIcons[key] || <RotateCcw className="w-3.5 h-3.5" />}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Joint Sliders */}
      <div className="space-y-4 pt-1">
        {ARM_PARAMS.JOINTS.map((j) => {
          const jointKey = j.name as keyof ArmJoints;
          const currentVal = joints[jointKey];

          return (
            <div key={j.name} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-gray-300">
                  {j.label}{' '}
                  <span className="text-[10px] text-gray-500 font-normal">
                    (Home: {j.home}°)
                  </span>
                </span>
                <span className="font-mono text-blue-400 font-bold">{currentVal}°</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500 font-mono w-7 text-right">{j.min}°</span>
                <input
                  type="range"
                  min={j.min}
                  max={j.max}
                  step={1}
                  value={currentVal}
                  onChange={(e) => setJointAngle(jointKey, parseInt(e.target.value, 10))}
                  disabled={!isConnected}
                  className="flex-1 accent-blue-500 h-2 bg-background rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px] text-gray-500 font-mono w-8">{j.max}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
