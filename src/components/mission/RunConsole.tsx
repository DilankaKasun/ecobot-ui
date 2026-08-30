'use client';

import React, { useEffect, useState } from 'react';
import {
  Play, Square, SkipForward, Crosshair, Map, Camera, ShieldOff, Shield,
  AlertTriangle, CircleDot,
} from 'lucide-react';
import {
  useNavRun, RUN_PIPELINE, RunState, PlantCandidate, Detection, Vel,
  isPlantClass,
} from '@/hooks/useNavRun';

/* ---------------------------------------------------------------- bits */

const Cell: React.FC<{
  label: string; value: React.ReactNode; sub?: string; tone?: string;
}> = ({ label, value, sub, tone = 'text-gray-100' }) => (
  <div className="bg-black/30 rounded-lg px-2.5 py-2 min-w-0">
    <div className="text-[9px] text-gray-500 uppercase tracking-wide truncate">
      {label}
    </div>
    <div className={`font-mono text-sm font-bold truncate ${tone}`}>{value}</div>
    {sub && <div className="text-[9px] text-gray-600 font-mono truncate">{sub}</div>}
  </div>
);

const STATE_TONE: Record<string, string> = {
  IDLE: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  SURVEY: 'text-violet-300 bg-violet-500/10 border-violet-500/40',
  PICK: 'text-gray-300 bg-gray-500/10 border-gray-500/30',
  REACQUIRE: 'text-violet-300 bg-violet-500/10 border-violet-500/40',
  DRIVE: 'text-sky-300 bg-sky-500/10 border-sky-500/40',
  HANDOVER: 'text-amber-300 bg-amber-500/10 border-amber-500/40',
  APPROACH: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40',
  SCAN: 'text-teal-300 bg-teal-500/10 border-teal-500/40',
  REPORT: 'text-teal-300 bg-teal-500/10 border-teal-500/40',
  TURN_AWAY: 'text-violet-300 bg-violet-500/10 border-violet-500/40',
  DONE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
};

const DRIVER_BADGE: Record<string, { icon: React.ElementType; tone: string; text: string }> = {
  map: { icon: Map, tone: 'text-sky-300 bg-sky-500/15 border-sky-500/40', text: 'MAP DRIVER' },
  camera: { icon: Camera, tone: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40', text: 'CAMERA DRIVER' },
  handover: { icon: Crosshair, tone: 'text-amber-300 bg-amber-500/15 border-amber-500/40', text: 'HANDING OVER' },
  none: { icon: CircleDot, tone: 'text-gray-400 bg-gray-500/10 border-gray-500/30', text: 'NOBODY DRIVING' },
};

/** One velocity source, with the live flag the safety layer actually uses. */
const VelRow: React.FC<{ name: string; vel: Vel; note?: string }> = ({ name, vel, note }) => (
  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] ${
    vel.live ? 'bg-sky-500/10 border-sky-500/40' : 'bg-black/30 border-card-border'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vel.live ? 'bg-sky-400 animate-pulse' : 'bg-gray-700'}`} />
    <span className="text-gray-400 w-20 shrink-0 truncate">{name}</span>
    <span className="text-gray-100 w-16 shrink-0">{vel.x >= 0 ? ' ' : ''}{vel.x.toFixed(3)}</span>
    <span className="text-gray-100 w-16 shrink-0">{vel.z >= 0 ? ' ' : ''}{vel.z.toFixed(3)}</span>
    <span className="text-gray-600 w-14 shrink-0">{vel.hz.toFixed(0)}Hz</span>
    {note && <span className="text-gray-600 truncate">{note}</span>}
  </div>
);

const CAND_TONE: Record<string, string> = {
  pending: 'text-sky-300',
  done: 'text-emerald-400',
  failed: 'text-rose-400',
  duplicate: 'text-gray-500',
};

/* ------------------------------------------------------------- console */

export const RunConsole: React.FC = () => {
  const {
    status, detections, suppressed, vels, odom, isConnected, transport,
    timeLeft, nodeAlive, start, stop, next, scanHere, setSamples,
  } = useNavRun();
  const [samples, setSamplesLocal] = useState(6);

  // Keep the run's own state machine and the page's idea of "busy" in step.
  const running = status.running;
  const driver = DRIVER_BADGE[status.driver] ?? DRIVER_BADGE.none;
  const DriverIcon = driver.icon;

  const deadlineFrac = status.deadline_s && timeLeft != null
    ? 1 - timeLeft / status.deadline_s : 0;
  const deadlineClose = timeLeft != null && timeLeft < 5;

  const plantDets = detections.filter((d) => isPlantClass(d.class_name));
  const nearest = plantDets.reduce<Detection | null>(
    (a, d) => (a == null || (d.distance ?? 99) < (a.distance ?? 99) ? d : a), null);

  useEffect(() => {
    if (!running) return;
  }, [running]);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-lg space-y-3">

      {/* ---- headline: state, driver, deadline ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
          STATE_TONE[status.state] ?? STATE_TONE.IDLE}`}>
          {status.state}
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-bold ${driver.tone}`}>
          <DriverIcon className="w-3.5 h-3.5" />
          {driver.text}
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-bold ${
          suppressed
            ? 'text-amber-300 bg-amber-500/15 border-amber-500/40'
            : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'}`}>
          {suppressed ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
          {suppressed ? 'AVOIDANCE OFF' : 'AVOIDANCE ON'}
        </span>

        <div className="flex-1" />

        {!nodeAlive && (
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 font-mono text-[11px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            plant_run_node SILENT
          </span>
        )}
        <span className="font-mono text-[10px] text-gray-600">
          {transport === 'none' ? 'no link' : transport}
        </span>
      </div>

      {/* the node's own words — one line, its reason for what it is doing */}
      <div className="font-mono text-[11px] text-gray-300 bg-black/30 rounded-lg px-3 py-2 leading-snug">
        {status.saying || '—'}
      </div>

      {/* ---- deadline bar: every state has one ---- */}
      {status.deadline_s != null && (
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-gray-500">
              {status.elapsed_s.toFixed(1)}s elapsed
            </span>
            <span className={deadlineClose ? 'text-rose-400 font-bold' : 'text-gray-500'}>
              {timeLeft?.toFixed(1)}s until timeout ({status.deadline_s}s)
            </span>
          </div>
          <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                deadlineClose ? 'bg-rose-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min(100, deadlineFrac * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ---- pipeline strip ---- */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {RUN_PIPELINE.map((s: RunState) => {
          const active = s === status.state;
          return (
            <div
              key={s}
              className={`px-2 py-1 rounded font-mono text-[9px] font-bold whitespace-nowrap border ${
                active
                  ? (STATE_TONE[s] ?? STATE_TONE.IDLE)
                  : 'text-gray-700 bg-black/20 border-transparent'}`}
            >
              {s}
            </div>
          );
        })}
      </div>

      {/* ---- controls ---- */}
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label htmlFor="samples" className="block text-[9px] text-gray-500 uppercase tracking-wide mb-1">
            Photos
          </label>
          <input
            id="samples" type="number" min={1} max={40} value={samples}
            onChange={(e) => setSamplesLocal(Number(e.target.value))}
            onBlur={() => setSamples(samples)}
            className="w-16 bg-background border border-card-border rounded-lg px-2 py-1.5 text-white font-mono text-xs"
          />
        </div>
        <button
          onClick={() => start(samples)}
          disabled={!isConnected || running}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold"
        >
          <Play className="w-3.5 h-3.5" /> Start run
        </button>
        <button
          onClick={stop}
          disabled={!isConnected || !running}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-700/80 hover:bg-rose-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold"
        >
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
        <button
          onClick={next}
          disabled={!isConnected || !running}
          title="Give up on this plant and pick the next"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card-border hover:bg-gray-700 disabled:opacity-40 text-gray-200 text-xs font-semibold"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip plant
        </button>
        <button
          onClick={() => scanHere(samples)}
          disabled={!isConnected || running}
          title="Scan where the robot already stands — no driving"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold"
        >
          <Camera className="w-3.5 h-3.5" /> Scan here
        </button>
        {!isConnected && (
          <span className="text-[11px] text-amber-300">No link to the robot</span>
        )}
      </div>

      {/* ---- live numbers ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <Cell
          label="Target"
          value={status.target ? status.target.name : '—'}
          sub={status.target
            ? `${status.target.range_m.toFixed(2)}m @ ${status.target.heading_deg.toFixed(0)}°`
            : undefined}
          tone={status.target ? 'text-emerald-300' : 'text-gray-600'}
        />
        <Cell
          label="Nearest plant seen"
          value={nearest?.distance != null ? `${nearest.distance.toFixed(2)}m` : '—'}
          sub={nearest?.bearing_deg != null
            ? `${nearest.bearing_deg >= 0 ? '+' : ''}${nearest.bearing_deg.toFixed(0)}° off centre`
            : 'not in view'}
          tone={nearest ? 'text-emerald-300' : 'text-gray-600'}
        />
        <Cell label="Plants seen" value={status.plants.length}
              sub={`${status.done} scanned`} />
        <Cell label="Odom x,y" value={`${odom.x.toFixed(2)}, ${odom.y.toFixed(2)}`}
              sub={`yaw ${odom.yaw_deg.toFixed(0)}°`} />
        <Cell label="Wheel speed" value={`${odom.v.toFixed(2)} m/s`}
              sub={`${odom.w.toFixed(2)} rad/s`} />
        <Cell
          label="Detections"
          value={`${plantDets.length} plant`}
          sub={`${detections.length} objects total`}
          tone={plantDets.length ? 'text-emerald-300' : 'text-gray-500'}
        />
      </div>

      {/* ---- distance to the two rings ---- */}
      {nearest?.distance != null && (
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px] text-gray-500">
            <span>park 0.65m</span>
            <span>hand over 1.20m</span>
            <span>3m</span>
          </div>
          <div className="relative h-6 bg-black/40 rounded-lg overflow-hidden">
            {/* blind zone the depth camera cannot measure in */}
            <div className="absolute inset-y-0 left-0 bg-rose-500/25"
                 style={{ width: `${(0.5 / 3) * 100}%` }} />
            {/* the band the camera driver parks in */}
            <div className="absolute inset-y-0 bg-emerald-500/25"
                 style={{ left: `${(0.58 / 3) * 100}%`, width: `${(0.14 / 3) * 100}%` }} />
            <div className="absolute inset-y-0 w-px bg-amber-400/70"
                 style={{ left: `${(1.2 / 3) * 100}%` }} />
            <div
              className="absolute inset-y-0 w-1 bg-white rounded"
              style={{ left: `${Math.min(99, (nearest.distance / 3) * 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-white/90">
              {nearest.distance.toFixed(2)}m
            </span>
          </div>
        </div>
      )}

      {/* ---- who is publishing velocity ---- */}
      <div className="space-y-1">
        <div className="flex gap-2 font-mono text-[9px] text-gray-600 px-2.5">
          <span className="w-3.5" /><span className="w-20">source</span>
          <span className="w-16">lin x</span><span className="w-16">ang z</span>
          <span className="w-14">rate</span>
        </div>
        <VelRow name="/nav_cmd_vel" vel={vels.nav} note="map driver" />
        <VelRow name="/goto_cmd_vel" vel={vels.goto} note="camera driver" />
        <VelRow name="/cmd_vel" vel={vels.cmd} note="→ wheels" />
      </div>

      {/* ---- plants the survey knows about ---- */}
      {status.plants.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] text-gray-500 uppercase tracking-wide">
            Plants ({status.plants.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {status.plants.map((p: PlantCandidate, i: number) => (
              <div key={i}
                   className="flex items-center gap-2 font-mono text-[10px] bg-black/25 rounded px-2 py-1">
                <span className={`w-16 shrink-0 font-bold ${CAND_TONE[p.state] ?? 'text-gray-400'}`}>
                  {p.state}
                </span>
                <span className="text-gray-300 w-14 shrink-0">
                  {p.heading_deg.toFixed(0)}°
                </span>
                <span className="text-gray-300 w-14 shrink-0">
                  {p.range_m.toFixed(2)}m
                </span>
                <span className="text-gray-600 w-10 shrink-0">×{p.sightings}</span>
                <span className="text-gray-600 truncate">{p.reason || p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- what the camera can see right now ---- */}
      <div className="space-y-1">
        <div className="text-[9px] text-gray-500 uppercase tracking-wide">
          Live detections
        </div>
        {detections.length === 0 ? (
          <div className="font-mono text-[10px] text-gray-600 bg-black/25 rounded px-2 py-1.5">
            nothing in view
          </div>
        ) : (
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {detections.map((d, i) => {
              const plant = isPlantClass(d.class_name);
              return (
                <div key={i}
                     className={`flex items-center gap-2 font-mono text-[10px] rounded px-2 py-1 ${
                       plant ? 'bg-emerald-500/10 border border-emerald-500/30'
                             : 'bg-black/25'}`}>
                  <span className={`w-28 shrink-0 truncate ${plant ? 'text-emerald-300 font-bold' : 'text-gray-400'}`}>
                    {d.class_name}
                  </span>
                  <span className="text-gray-500 w-10 shrink-0">
                    {(d.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-gray-300 w-14 shrink-0">
                    {d.distance != null ? `${d.distance.toFixed(2)}m` : 'no depth'}
                  </span>
                  <span className="text-gray-300 w-14 shrink-0">
                    {d.bearing_deg != null
                      ? `${d.bearing_deg >= 0 ? '+' : ''}${d.bearing_deg.toFixed(0)}°`
                      : '—'}
                  </span>
                  {plant && <span className="text-emerald-500/70">counts as a plant</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
