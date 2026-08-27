'use client';

import React from 'react';
import { useArmStatus } from '@/hooks/useArmStatus';
import { useRos } from '@/hooks/useRos';
import { useArmControl } from '@/hooks/useArmControl';
import { Cpu, Home, Power } from 'lucide-react';

function stateTone(state?: string): { text: string; dot: string } {
  const s = (state || '').toLowerCase();
  if (['idle', 'ready', 'standby', 'homing', 'enabled'].includes(s)) {
    return { text: 'text-emerald-400', dot: 'bg-emerald-500' };
  }
  if (['moving', 'executing', 'active', 'busy', 'working', 'scanning'].includes(s)) {
    return { text: 'text-blue-400', dot: 'bg-blue-500' };
  }
  if (['disabled', 'off'].includes(s)) {
    return { text: 'text-amber-400', dot: 'bg-amber-500' };
  }
  if (['error', 'fault', 'blocked', 'limit', 'stalled'].includes(s)) {
    return { text: 'text-rose-400', dot: 'bg-rose-500' };
  }
  return { text: 'text-gray-400', dot: 'bg-gray-500' };
}

function fmtJoint(value: number | undefined): string {
  if (typeof value !== 'number' || !isFinite(value)) return '--';
  return `${Math.round(value)}°`;
}

function fmtMeter(value: number | undefined): string {
  if (typeof value !== 'number' || !isFinite(value)) return '--';
  return `${value.toFixed(3)}m`;
}

export const ArmStatusCard: React.FC = () => {
  const { isConnected } = useRos();
  const armStatus = useArmStatus();
  const { joints: localJoints, homeArm, currentPose, enableArm, disableArm } = useArmControl();

  const isServosEnabled =
    armStatus?.state?.toLowerCase() === 'enabled' ||
    armStatus?.status?.toLowerCase() === 'enabled' ||
    (armStatus?.state && !['disabled', 'off'].includes(armStatus.state.toLowerCase()));

  const state = armStatus?.state || armStatus?.status || (isConnected ? (isServosEnabled ? 'ENABLED' : 'IDLE') : '--');
  const tone = stateTone(state);

  const jointsFromStatus = Array.isArray(armStatus?.joints)
    ? armStatus?.joints
    : armStatus?.joints && typeof armStatus.joints === 'object'
      ? [
          (armStatus.joints as any).base,
          (armStatus.joints as any).shoulder,
          (armStatus.joints as any).elbow,
          (armStatus.joints as any).wrist,
        ]
      : null;

  const displayJoints = jointsFromStatus?.some((v) => typeof v === 'number')
    ? jointsFromStatus
    : [localJoints.base, localJoints.shoulder, localJoints.elbow, localJoints.wrist];

  const [base, shoulder, elbow, wrist] = displayJoints.map((v) => Number(v));
  const eef = armStatus?.end_effector || currentPose;
  const gripper = typeof armStatus?.gripper === 'string' ? armStatus.gripper : armStatus?.gripper?.state;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-200">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span>Arm Status & Telemetry</span>
        </div>
        <span className={`flex items-center gap-1.5 font-mono font-bold uppercase text-[11px] ${tone.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          {state}
        </span>
      </div>

      {!isConnected ? (
        <div className="py-6 text-center text-gray-500 text-xs">
          Connect to ROS to view arm status
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: 'Base', value: fmtJoint(base) },
              { label: 'Shoulder', value: fmtJoint(shoulder) },
              { label: 'Elbow', value: fmtJoint(elbow) },
              { label: 'Wrist', value: fmtJoint(wrist) },
            ].map((j) => (
              <div key={j.label} className="bg-background/60 border border-card-border/40 rounded-lg py-2 px-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{j.label}</div>
                <div className="font-mono text-sm font-bold text-gray-100">{j.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5 text-[11px] bg-background/40 border border-card-border/30 rounded-lg p-2.5">
            {eef && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">End-Effector (X, Y, Z)</span>
                <span className="font-mono text-gray-200 font-semibold">
                  ({fmtMeter(eef.x)}, {fmtMeter(eef.y)}, {fmtMeter(eef.z)})
                </span>
              </div>
            )}
            {gripper && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Gripper State</span>
                <span className="font-mono text-gray-200 uppercase">{gripper}</span>
              </div>
            )}
          </div>

          {armStatus?.error && (
            <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
              {armStatus.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={homeArm}
              className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-card-border"
            >
              <Home className="w-3.5 h-3.5" />
              Home Arm
            </button>
            <button
              onClick={isServosEnabled ? disableArm : enableArm}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                isServosEnabled
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isServosEnabled ? 'Disable Servos' : 'Enable Servos'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};