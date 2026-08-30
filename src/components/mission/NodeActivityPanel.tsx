'use client';

import React from 'react';
import {
  Activity, Cpu, Bot, Move3D, ShieldCheck, ShieldAlert, AlertTriangle,
  Loader2, Radio,
} from 'lucide-react';
import {
  useRobotActivity, describeActivity, describeMotion, STALE_MS,
} from '@/hooks/useRobotActivity';

/**
 * What each node is doing, and what every field on it means.
 *
 * Built for debugging a run in progress: several nodes can move the robot,
 * they all publish a field called "status", and the same word means different
 * things depending on which one you are reading. Each row therefore carries a
 * short explanation of the field beneath its value.
 */

const Field: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: 'normal' | 'good' | 'warn' | 'bad';
}> = ({ label, value, hint, tone = 'normal' }) => {
  const valueTone =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : tone === 'bad'
          ? 'text-rose-400'
          : 'text-gray-100';
  return (
    <div className="py-2 border-b border-card-border/40 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-wide text-gray-500 shrink-0">
          {label}
        </span>
        <span className={`font-mono text-[12px] text-right break-all ${valueTone}`}>
          {value}
        </span>
      </div>
      <p className="text-[10px] text-gray-500 leading-snug mt-1">{hint}</p>
    </div>
  );
};

const NodeCard: React.FC<{
  icon: React.ReactNode;
  name: string;
  role: string;
  ageMs: number | null;
  children: React.ReactNode;
}> = ({ icon, name, role, ageMs, children }) => {
  const never = ageMs === null;
  const stale = ageMs !== null && ageMs > STALE_MS;
  return (
    <div className="bg-background/40 border border-card-border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-white truncate">{name}</div>
            <div className="text-[10px] text-gray-500 leading-tight">{role}</div>
          </div>
        </div>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
            never
              ? 'text-gray-500 border-card-border'
              : stale
                ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
          }`}
          title="How long ago this node last reported. Anything over 3 seconds usually means it has stopped."
        >
          {never ? 'no data' : stale ? `stale ${(ageMs / 1000).toFixed(0)}s` : 'live'}
        </span>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
};

/** What each detection_goto mode means, in one line. */
const MODE_HELP: { [k: string]: string } = {
  startup_scan:
    'Boot survey. Turns a full circle listing plants, and drives to none of them until the wheel counters read 360 degrees.',
  searching: 'Turning on the spot until a plant comes into view.',
  tracking: 'Driving to the plant using the camera. This is the normal approach.',
  blind_drive:
    'The plant went out of view while close. Driving straight on its last known heading.',
  waypoint:
    'Driving to a saved x,y using odometry. The camera is not steering here.',
  avoid: 'Turning away from an obstacle before resuming.',
  idle: 'Not driving. Waiting for a plant to appear, or paused.',
  unknown:
    'This robot build does not report a mode. Update the robot to see which controller has the wheels.',
};

export const NodeActivityPanel: React.FC = () => {
  const a = useRobotActivity();
  const { headline, detail, owner } = describeActivity(a);

  const goto = a.goto;
  const mission = a.mission;
  const scanner = a.scanner;

  const lastResult =
    mission && mission.results.length
      ? (mission.results[mission.results.length - 1] as Record<string, unknown>)
      : null;

  const moving =
    a.motion !== null &&
    (Math.abs(a.motion.linear) > 0.01 || Math.abs(a.motion.angular) > 0.02);

  const suppressed = a.missionSuppress || a.gotoSuppress;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-white text-base">Right Now</h3>
      </div>

      {/* Headline — the one thing to read first. */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          {moving && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          <span className="text-white font-semibold text-sm">{headline}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{detail}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px]">
          <span className="text-gray-500">
            in charge:{' '}
            <span className="font-mono text-primary">{owner}</span>
          </span>
          <span className="text-gray-500">
            wheels:{' '}
            <span className={`font-mono ${moving ? 'text-amber-400' : 'text-gray-300'}`}>
              {describeMotion(a.motion)}
            </span>
          </span>
        </div>
      </div>

      {/* Safety layer — the thing that silently blocks approaches. */}
      <div
        className={`rounded-lg border p-3 ${
          suppressed
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-card-border bg-background/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {suppressed ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="text-[12px] text-white font-medium">
            {suppressed
              ? 'Obstacle avoidance is standing down'
              : 'Obstacle avoidance is fully on'}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 leading-snug mt-1.5">
          {suppressed
            ? 'A node has said the thing in front is the plant it means to reach, not a hazard. Without this the robot is turned away from its own goal at 0.9 m.'
            : 'Anything closer than 0.9 m ahead will make the robot slow, turn away, or reverse — including the plant it is trying to reach.'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono">
          <span className={a.gotoSuppress ? 'text-amber-400' : 'text-gray-600'}>
            camera path: {a.gotoSuppress ? 'standing down' : 'normal'}
          </span>
          <span className={a.missionSuppress ? 'text-amber-400' : 'text-gray-600'}>
            mission path: {a.missionSuppress ? 'standing down' : 'normal'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NodeCard
          icon={<Move3D className="w-4 h-4 text-sky-400 shrink-0" />}
          name="detection_goto"
          role="Finds a plant and drives to it with the camera"
          ageMs={a.ages.goto}
        >
          <Field
            label="mode"
            value={goto ? goto.mode : '—'}
            tone={goto && goto.mode === 'startup_scan' ? 'warn' : 'normal'}
            hint={
              goto ? MODE_HELP[goto.mode] || 'Unrecognised mode.' : 'No report yet.'
            }
          />
          <Field
            label="status"
            value={goto ? goto.status : '—'}
            tone={
              goto && goto.status === 'REACHED'
                ? 'good'
                : goto && (goto.status === 'LOST' || goto.status === 'BLOCKED')
                  ? 'warn'
                  : 'normal'
            }
            hint="REACHED = parked at the plant. TRACKING = driving. SEARCHING = turning to look. BLOCKED = something in the way. LOST = the plant left view."
          />
          <Field
            label="target"
            value={goto && goto.target_class ? goto.target_class : 'none'}
            hint="The class it is chasing. Only classes in auto_track_classes are chased — by default just 'potted plant', so a plant seen as 'vase' is ignored."
          />
          <Field
            label="distance"
            value={
              goto && typeof goto.distance === 'number'
                ? `${goto.distance.toFixed(2)} m`
                : '—'
            }
            hint="Careful: in tracking mode this is metres to the plant; in waypoint mode it is metres left to the saved point. Read the mode first."
          />
          <Field
            label="active"
            value={goto && goto.active !== undefined ? String(goto.active) : '—'}
            hint="False means it is not driving at all. While false the wheels still get a zero speed, which stops the safety layer creeping forward on its own."
          />
          <Field
            label="auto_track_paused"
            value={
              goto && goto.auto_track_paused !== undefined
                ? String(goto.auto_track_paused)
                : '—'
            }
            tone={goto && goto.auto_track_paused ? 'warn' : 'normal'}
            hint="True means it will not pick a plant on its own. Set after it reaches one, and while a map mission is running. Cleared by a resume_auto_track command."
          />
        </NodeCard>

        <NodeCard
          icon={<Cpu className="w-4 h-4 text-emerald-400 shrink-0" />}
          name="plant_mission_node"
          role="Runs the scan, the photos and the report"
          ageMs={a.ages.mission}
        >
          <Field
            label="status"
            value={mission ? mission.status : '—'}
            tone={
              mission && mission.status === 'COMPLETE'
                ? 'good'
                : mission && mission.status === 'ERROR'
                  ? 'bad'
                  : 'normal'
            }
            hint="NAVIGATING = Nav2 is driving. SCANNING = waiting on the arm. ANALYZING = photos are with Gemini. WAITING = finished a plant, wants a 'next'."
          />
          <Field
            label="plant"
            value={mission ? `${mission.idx + 1} of ${mission.total || 1}` : '—'}
            hint="Which plant of the run it is on. A run with no point list is always 1 of 1."
          />
          <Field
            label="photos this plant"
            value={mission ? String(mission.captures) : '—'}
            tone={
              mission && mission.status === 'SCANNING' && mission.captures === 0
                ? 'warn'
                : 'normal'
            }
            hint="Counts up during the scan. Staying at 0 while scanning means no fresh wrist-camera frame — check the arm camera is publishing."
          />
          <Field
            label="photos wanted"
            value={mission ? String(mission.samples) : '—'}
            hint="How many viewpoints the next scan will sample. Changed from the Plant Scan panel."
          />
          <Field
            label="last nav result"
            value={
              lastResult && lastResult.nav_status
                ? String(lastResult.nav_status)
                : '—'
            }
            tone={
              lastResult && String(lastResult.nav_status || '').indexOf('fail') >= 0
                ? 'bad'
                : 'normal'
            }
            hint="'ok' = Nav2 arrived. 'skipped(already in place)' = the camera path drove instead. 'nav_failed' or 'tf_lookup_failed' point at Nav2 or the map frame."
          />
          <Field
            label="error"
            value={mission && mission.error ? mission.error : 'none'}
            tone={mission && mission.error ? 'bad' : 'normal'}
            hint="Set when the run cannot continue. 'nav2 action server not available' means navigation was not launched."
          />
        </NodeCard>

        <NodeCard
          icon={<Bot className="w-4 h-4 text-purple-400 shrink-0" />}
          name="arm_scanner_node"
          role="Moves the arm across the plant"
          ageMs={a.ages.scanner}
        >
          <Field
            label="status"
            value={scanner ? scanner.status : '—'}
            tone={
              scanner && scanner.status === 'scanning'
                ? 'good'
                : scanner && scanner.status === 'failed'
                  ? 'bad'
                  : 'normal'
            }
            hint="This is the only honest answer to 'has the arm stopped moving'. The mission can report COMPLETE on a time-out while the arm is still sweeping."
          />
          <Field
            label="viewpoint"
            value={
              scanner
                ? `${scanner.viewpoint}${
                    scanner.total_viewpoints ? ` of ${scanner.total_viewpoints}` : ''
                  }`
                : '—'
            }
            hint="Progress through the planned sweep. The total is decided when the scan starts, after unreachable poses are dropped."
          />
          <Field
            label="current view"
            value={scanner && scanner.current_label ? scanner.current_label : '—'}
            hint="Name of the pose being photographed — which part of the plant and from what angle above it."
          />
          <Field
            label="parts covered"
            value={
              scanner && scanner.parts_covered
                ? typeof scanner.parts_covered === 'object'
                  ? JSON.stringify(scanner.parts_covered)
                  : String(scanner.parts_covered)
                : '—'
            }
            hint="Which parts of the plant the sweep managed to look at — leaves, stem, pot."
          />
          <Field
            label="reason"
            value={scanner && scanner.reason ? scanner.reason : 'none'}
            tone={scanner && scanner.reason ? 'bad' : 'normal'}
            hint="Why a scan refused to run. Usually the aim point is outside the arm's reach, so every sampled viewpoint was dropped."
          />
        </NodeCard>
      </div>

      {!a.isConnected && (
        <div className="flex items-start gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            No link to the robot. Everything above is the last value seen, or
            blank if nothing has arrived this session.
          </span>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10px] text-gray-500 leading-snug">
        <Radio className="w-3 h-3 shrink-0 mt-0.5" />
        <span>
          Each card shows how long ago that node last spoke. &ldquo;stale&rdquo;
          means nothing has arrived for over 3 seconds, which usually means the
          node has died — check it is still running before trusting the values.
        </span>
      </p>
    </div>
  );
};
