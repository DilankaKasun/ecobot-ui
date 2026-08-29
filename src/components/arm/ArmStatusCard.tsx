'use client';

import React from 'react';
import { useArmStatus } from '@/hooks/useArmStatus';
import { useRos } from '@/hooks/useRos';
import { useArmControl } from '@/hooks/useArmControl';
import { Cpu, Home } from 'lucide-react';

function stateTone(state?: string): { text: string; dot: string } {
  const s = (state || '').toLowerCase();
  // 'enabled'/'disabled' are what arm_manual_node actually publishes.
  if (s === 'disabled') {
    return { text: 'text-amber-400', dot: 'bg-amber-500' };
  }
  if (['idle', 'ready', 'standby', 'homing', 'enabled'].includes(s)) {
    return { text: 'text-emerald-400', dot: 'bg-emerald-500' };
  }
  if (['moving', 'executing', 'active', 'busy', 'working'].includes(s)) {
    return { text: 'text-blue-400', dot: 'bg-blue-500' };
  }
  if (['error', 'fault', 'blocked', 'limit', 'stalled'].includes(s)) {
    return { text: 'text-rose-400', dot: 'bg-rose-500' };
  }
  return { text: 'text-gray-400', dot: 'bg-gray-500' };
}

/** End-effector coordinates are metres, not angles. */
function fmtMeters(value: number | undefined): string {
  if (typeof value !== 'number' || !isFinite(value)) return '--';
  return `${value.toFixed(3)}m`;
}

export const ArmStatusCard: React.FC = () => {
  const { isConnected } = useRos();
  const armStatus = useArmStatus();
  const { currentPose, isSynced, homeArm } = useArmControl();

  const state = armStatus?.state || armStatus?.status || (isConnected ? 'IDLE' : '--');
  const tone = stateTone(state);

  // Fall back to the pose derived from live joint feedback; the node's status
  // topic carries only a state word, no end-effector position.
  const eef = armStatus?.end_effector ?? currentPose;
  const gripper = typeof armStatus?.gripper === 'string' ? armStatus.gripper : armStatus?.gripper?.state;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-200">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span>Arm Status</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span
              className={`font-mono text-[10px] uppercase ${
                isSynced ? 'text-emerald-400' : 'text-gray-500'
              }`}
              title={
                isSynced
                  ? 'Joint values are live from /arm/joint_angles'
                  : 'No joint feedback received yet — showing last commanded values'
              }
            >
              {isSynced ? 'live' : 'no feed'}
            </span>
          )}
          <span className={`flex items-center gap-1.5 font-mono font-bold uppercase text-[11px] ${tone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            {state}
          </span>
        </div>
      </div>

      {!isConnected ? (
        <div className="py-6 text-center text-gray-500 text-xs">
          Connect to ROS to view arm status
        </div>
      ) : (
        <>
          {(eef || gripper) && (
            <div className="mt-3 space-y-1.5 text-[11px]">
              {eef && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">End-Effector</span>
                  <span className="font-mono text-gray-200">
                    ({fmtMeters(eef.x)} , {fmtMeters(eef.y)} , {fmtMeters(eef.z)})
                  </span>
                </div>
              )}
              {gripper && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Gripper</span>
                  <span className="font-mono text-gray-200 uppercase">{gripper}</span>
                </div>
              )}
            </div>
          )}

          {armStatus?.error && (
            <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
              {armStatus.error}
            </div>
          )}

          <button
            onClick={homeArm}
            className="mt-3 w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-card-border"
          >
            <Home className="w-3.5 h-3.5" />
            Home Arm
          </button>
        </>
      )}
    </div>
  );
};