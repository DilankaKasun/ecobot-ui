'use client';

import React, { useEffect, useState } from 'react';
import {
  Leaf, Play, Square, Pause, SkipForward, Loader2, Camera, FileText,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { usePlantMission } from '@/hooks/usePlantMission';

/** Statuses the node reports while a scan is in flight. */
const BUSY = new Set([
  'NAVIGATING', 'SCANNING', 'ANALYSING', 'ANALYZING', 'SEARCHING',
]);

function tone(status: string) {
  if (status === 'COMPLETE') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (status === 'ERROR') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (BUSY.has(status)) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  return 'text-gray-400 bg-card-border/30 border-card-border';
}

/** The report comes back as free-form JSON; show whatever fields it has. */
const ReportBody: React.FC<{ report: Record<string, unknown> }> = ({ report }) => {
  const entries = Object.entries(report).filter(
    ([k, v]) => k !== 'timestamp' && v !== null && v !== ''
  );
  if (!entries.length) {
    return <p className="text-[11px] text-gray-500">Report returned no fields.</p>;
  }
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="text-[11px]">
          <span className="text-gray-500 uppercase tracking-wide">
            {k.replace(/_/g, ' ')}
          </span>
          <div className="text-gray-200 mt-0.5 leading-snug">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </div>
        </div>
      ))}
    </div>
  );
};

export const PlantScanPanel: React.FC = () => {
  const {
    status, captures, isConnected, scanHere, start, stop, pause, resume, next,
    setSamples, clearCaptures,
  } = usePlantMission();
  const [samples, setSamplesLocal] = useState(6);

  // Adopt the robot's count once it reports one, so the field shows what the
  // next scan will actually do rather than this component's default.
  useEffect(() => {
    if (status.samples) setSamplesLocal(status.samples);
  }, [status.samples]);

  const busy = BUSY.has(status.status);
  const paused = status.status === 'PAUSED';
  const latestReport = status.results[status.results.length - 1];

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white text-base">Plant Scan</h3>
        </div>
        <span
          className={`px-2.5 py-1 rounded-md border font-mono text-[11px] font-bold uppercase ${tone(status.status)}`}
        >
          {busy && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
          {status.status}
        </span>
      </div>

      <p className="text-[11px] text-gray-500 leading-snug">
        The arm sweeps an arc from level with the plant up to looking down on
        it, aiming at points picked at random inside the detected box, and
        photographs each one. The set then goes to Gemini for a short report.
      </p>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label htmlFor="samples" className="block text-[11px] text-gray-400 mb-1">
            Photos per plant
          </label>
          <input
            id="samples"
            type="number"
            min={1}
            max={40}
            value={samples}
            disabled={busy}
            onChange={(e) => setSamplesLocal(Number(e.target.value))}
            onBlur={() => setSamples(samples)}
            className="w-24 bg-background border border-card-border rounded-lg px-2.5 py-1.5 text-white font-mono text-sm disabled:opacity-50"
          />
        </div>

        <button
          onClick={() => { clearCaptures(); scanHere(samples); }}
          disabled={!isConnected || busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Scan plant here
        </button>

        <button
          onClick={() => { clearCaptures(); start(samples); }}
          disabled={!isConnected || busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Start mission
        </button>

        <button
          onClick={paused ? resume : pause}
          disabled={!isConnected || (!busy && !paused)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600/80 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold transition-colors"
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={stop}
          disabled={!isConnected || (!busy && !paused)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-700/80 hover:bg-rose-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
          Stop
        </button>

        <button
          onClick={next}
          disabled={!isConnected || status.status !== 'WAITING'}
          title="Move on to the next waypoint"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-border hover:bg-gray-700 disabled:opacity-40 text-gray-200 text-xs font-semibold transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Next
        </button>

        {!isConnected && (
          <span className="text-[11px] text-amber-300">Not connected to the robot</span>
        )}
      </div>

      {status.error && (
        <div className="flex items-start gap-2 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{status.error}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Plant', value: status.total ? `${status.idx + 1} / ${status.total}` : '--' },
          { label: 'Shots taken', value: `${captures.length}` },
          { label: 'Reports', value: `${status.results.length}` },
        ].map((c) => (
          <div key={c.label} className="bg-black/30 rounded-lg py-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">{c.label}</div>
            <div className="font-mono text-sm font-bold text-gray-100">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Camera className="w-3.5 h-3.5 text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-300">Captured viewpoints</h4>
        </div>
        {captures.length === 0 ? (
          <div className="text-[11px] text-gray-600 border border-dashed border-card-border rounded-lg py-6 text-center">
            Shots appear here as the arm takes them.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {captures.map((c) => (
              <figure key={`${c.index}-${c.at}`} className="space-y-1">
                {/* Blob URLs from the robot; next/image cannot optimise these. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.url}
                  alt={c.label}
                  className="w-full aspect-[4/3] object-cover rounded-md border border-card-border"
                />
                <figcaption className="text-[9px] text-gray-500 font-mono truncate" title={c.label}>
                  {c.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-300">Gemini report</h4>
        </div>
        {latestReport ? (
          <div className="bg-background/60 border border-card-border rounded-lg p-3">
            <ReportBody report={latestReport as Record<string, unknown>} />
          </div>
        ) : (
          <div className="text-[11px] text-gray-600 border border-dashed border-card-border rounded-lg py-6 text-center">
            {busy ? 'Scanning — the report is written once every shot is in.'
                  : 'No report yet.'}
          </div>
        )}
      </div>
    </div>
  );
};
