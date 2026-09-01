'use client';

import React, { useState } from 'react';
import { useArmControl } from '@/hooks/useArmControl';
import { useArmGoalResult, GoalResult } from '@/hooks/useArmGoalResult';
import { reachCheck } from '@/lib/kinematics';
import {
  Crosshair, Send, Loader2, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';


/** Status line plus the servo angles the solver produced, if it succeeded. */
const GoalOutcome: React.FC<{ result: GoalResult }> = ({ result }) => {
  if (result.status === 'idle' || result.status === 'sending') return null;

  const ok = result.status === 'ok';
  const tone = ok
    ? { box: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', Icon: CheckCircle2 }
    : result.status === 'out_of_reach'
      ? { box: 'bg-amber-500/10 border-amber-500/30 text-amber-300', Icon: AlertTriangle }
      : { box: 'bg-rose-500/10 border-rose-500/30 text-rose-300', Icon: XCircle };

  const headline: Record<string, string> = {
    ok: 'Goal accepted — arm moving',
    out_of_reach: 'Out of reach',
    no_solution: 'No solution within joint limits',
    joint_limits: 'Solution needs a joint past its limit',
    bad_request: 'Malformed goal',
    error: 'Arm reported an error',
    timeout: 'No reply from the arm',
  };

  return (
    <div className={`rounded-lg border px-3 py-2 space-y-2 ${tone.box}`}>
      <div className="flex items-start gap-2 text-[11px] font-semibold">
        <tone.Icon className="w-3.5 h-3.5 shrink-0 mt-px" />
        <span>{headline[result.status] ?? result.status}</span>
      </div>

      {result.reason && (
        <p className="text-[10.5px] leading-snug opacity-90 pl-5">{result.reason}</p>
      )}

      {result.angles && result.angles.length === 4 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide opacity-70 pl-5 mb-1">
            Servo angles {ok ? 'commanded' : 'the solver wanted'}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {result.angles.map((a, i) => (
              <div key={i} className="bg-black/40 rounded-md py-1 text-center">
                <div className="text-[9px] uppercase opacity-70">
                  {result.joints?.[i] ?? ['Base', 'Shoulder', 'Elbow', 'Wrist'][i]}
                </div>
                <div className="font-mono text-[11px] font-bold">{Math.round(a)}&deg;</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CartesianControl: React.FC = () => {
  const { currentPose, sendPoseGoal } = useArmControl();
  // Targets are entered in centimetres; /arm/pose_goal takes metres, so the
  // conversion happens once at the point of publishing.
  const [targetX, setTargetX] = useState<number>(-20);
  const [targetY, setTargetY] = useState<number>(0);
  const [targetZ, setTargetZ] = useState<number>(55);

  const { result, markSending } = useArmGoalResult();

  // Warn before sending when the point is simply outside the arm's span;
  // anything closer than that is up to the solver and the joint limits.
  const preflight = reachCheck(targetX / 100, targetY / 100, targetZ / 100);

  const handleSendGoal = (e: React.FormEvent) => {
    e.preventDefault();
    markSending();
    sendPoseGoal({ x: targetX / 100, y: targetY / 100, z: targetZ / 100 });
  };

  const sending = result.status === 'sending';

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Crosshair className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white text-base">Inverse Kinematics (Cartesian Target)</h3>
        </div>

        {/* Current Pose Feedback */}
        <div className="p-3 bg-background/60 border border-card-border rounded-xl mb-4">
          <div className="text-xs text-muted-foreground mb-1 font-medium">Current Wrist Pose (FK)</div>
          <div className="grid grid-cols-3 gap-2 font-mono text-sm font-bold text-center">
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-muted-foreground text-xs font-normal">X: </span>
              <span className="text-blue-400">{(currentPose.x * 100).toFixed(1)}cm</span>
            </div>
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-muted-foreground text-xs font-normal">Y: </span>
              <span className="text-purple-400">{(currentPose.y * 100).toFixed(1)}cm</span>
            </div>
            <div className="bg-card-border/30 p-1.5 rounded">
              <span className="text-muted-foreground text-xs font-normal">Z: </span>
              <span className="text-emerald-400">{(currentPose.z * 100).toFixed(1)}cm</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSendGoal} className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">Target X (Forward, cm)</label>
              <input
                type="number"
                step="1"
                min="-45"
                max="45"
                value={targetX}
                onChange={(e) => setTargetX(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">Target Y (Lateral, cm)</label>
              <input
                type="number"
                step="1"
                min="-30"
                max="30"
                value={targetY}
                onChange={(e) => setTargetY(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">Target Z (Height, cm)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="75"
                value={targetZ}
                onChange={(e) => setTargetZ(parseFloat(e.target.value))}
                className="w-full bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          {!preflight.withinSpan && (
            <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>Out of reach — {preflight.reason}.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className={`w-full py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
              sending
                ? 'bg-purple-900 text-purple-300 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Solving and moving...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send IK Goal to Manipulator
              </>
            )}
          </button>

          <GoalOutcome result={result} />
        </form>
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Coordinates are measured from the arm base, with Z from the floor —
        the shoulder pivot sits at {(0.32 * 100).toFixed(0)}cm. Forward reach
        is negative X in this frame.
      </p>
    </div>
  );
};
