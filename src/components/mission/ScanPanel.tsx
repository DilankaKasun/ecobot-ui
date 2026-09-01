'use client';

import React from 'react';
import { Camera, FileText, Bot } from 'lucide-react';
import { usePlantMission } from '@/hooks/usePlantMission';
import { useNavRun } from '@/hooks/useNavRun';

/** Arm scanner states worth colouring differently. */
const ARM_TONE: Record<string, string> = {
  scanning: 'text-teal-300 bg-teal-500/15 border-teal-500/40',
  recovering: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
  failed: 'text-rose-300 bg-rose-500/15 border-rose-500/40',
  idle: 'text-muted-foreground bg-gray-500/10 border-gray-500/30',
};

const MISSION_TONE: Record<string, string> = {
  SCANNING: 'text-teal-300 bg-teal-500/15 border-teal-500/40',
  ANALYZING: 'text-sky-300 bg-sky-500/15 border-sky-500/40',
  COMPLETE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
  ERROR: 'text-rose-400 bg-rose-500/10 border-rose-500/40',
  PAUSED: 'text-amber-300 bg-amber-500/10 border-amber-500/40',
};

export const ScanPanel: React.FC = () => {
  const { status, captures } = usePlantMission();
  const { scanner } = useNavRun();

  const report = status.results[status.results.length - 1] as
    Record<string, unknown> | undefined;
  const armTone = ARM_TONE[scanner?.status ?? 'idle'] ?? ARM_TONE.idle;
  const vpFrac = scanner && scanner.total_viewpoints
    ? scanner.viewpoint / scanner.total_viewpoints : 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3">

      {/* ---- arm + mission node state ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        <Bot className="w-4 h-4 text-muted-foreground" />
        <span className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold ${armTone}`}>
          ARM {(scanner?.status ?? 'unknown').toUpperCase()}
        </span>
        <span className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold ${
          MISSION_TONE[status.status] ?? 'text-muted-foreground bg-gray-500/10 border-gray-500/30'}`}>
          MISSION {status.status}
        </span>
        {scanner && scanner.total_viewpoints > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">
            viewpoint {scanner.viewpoint}/{scanner.total_viewpoints}
          </span>
        )}
      </div>

      {scanner && scanner.total_viewpoints > 0 && (
        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 transition-all duration-300"
               style={{ width: `${Math.min(100, vpFrac * 100)}%` }} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Shots', v: `${captures.length}` },
          { l: 'Reports', v: `${status.results.length}` },
          { l: 'Viewpoint', v: scanner?.current_label || '—' },
        ].map((c) => (
          <div key={c.l} className="bg-black/30 rounded-lg px-2.5 py-2">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{c.l}</div>
            <div className="font-mono text-sm font-bold text-foreground truncate">{c.v}</div>
          </div>
        ))}
      </div>

      {scanner?.reason && (
        <div className="font-mono text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-2.5 py-1.5">
          {scanner.reason}
        </div>
      )}
      {status.error && (
        <div className="font-mono text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-2.5 py-1.5">
          {status.error}
        </div>
      )}

      {scanner && scanner.parts_covered.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {scanner.parts_covered.map((p) => (
            <span key={p} className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/30 font-mono text-[9px] text-teal-300">
              {p}
            </span>
          ))}
        </div>
      )}

      {/* ---- shots ---- */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
            Captured viewpoints
          </span>
        </div>
        {captures.length === 0 ? (
          <div className="font-mono text-[10px] text-gray-600 bg-black/25 rounded px-2 py-4 text-center">
            no shots yet
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {captures.map((c) => (
              <figure key={`${c.index}-${c.at}`}>
                {/* Blob URLs from the robot; next/image cannot optimise these. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt={c.label}
                     className="w-full aspect-[4/3] object-cover rounded border border-card-border" />
                <figcaption className="text-[8px] text-gray-600 font-mono truncate" title={c.label}>
                  {c.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* ---- report ---- */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
            Plant health
          </span>
        </div>
        {report ? (
          <div className="bg-background/60 border border-card-border rounded-lg p-2.5 space-y-1">
            {Object.entries(report)
              .filter(([k, v]) => k !== 'timestamp' && v !== null && v !== '')
              .map(([k, v]) => (
                <div key={k} className="font-mono text-[10px] flex gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">{k}</span>
                  <span className="text-foreground break-words">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-gray-600 bg-black/25 rounded px-2 py-4 text-center">
            no report yet
          </div>
        )}
      </div>
    </div>
  );
};
