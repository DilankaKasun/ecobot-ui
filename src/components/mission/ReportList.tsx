'use client';

import React, { useState } from 'react';
import { FileText, Trash2, ExternalLink, Leaf } from 'lucide-react';
import { usePlantReports } from '@/hooks/usePlantReports';

const HEALTH_TONE: Record<string, string> = {
  healthy: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  stressed: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  diseased: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  dead: 'text-rose-500 border-rose-500/50 bg-rose-500/15',
  unknown: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
};

export const ReportList: React.FC = () => {
  const { reports, loading, remove } = usePlantReports();
  // Deleting a report throws away the only copy of its photographs, so it
  // asks once rather than acting on a stray click.
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-white">Plant reports</h3>
        <span className="font-mono text-[10px] text-gray-600">
          {reports.length}
        </span>
      </div>

      {loading ? (
        <p className="font-mono text-[11px] text-gray-600">loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-[11px] text-gray-600 border border-dashed border-card-border rounded-lg py-5 text-center">
          No reports yet. One is filed each time a plant is scanned.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {reports.map((r) => {
            const name =
              r.identification?.common_name ||
              r.identification?.scientific_name ||
              'Plant';
            const tone = HEALTH_TONE[r.health] ?? HEALTH_TONE.unknown;
            return (
              <li key={r.id}
                  className="flex items-center gap-3 bg-black/25 rounded-lg px-3 py-2">
                <Leaf className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-200 truncate">{name}</div>
                  <div className="font-mono text-[10px] text-gray-600">
                    {new Date(r.at).toLocaleString()} · {r.photos.length} photo
                    {r.photos.length === 1 ? '' : 's'}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded border font-mono text-[9px] font-bold uppercase shrink-0 ${tone}`}>
                  {r.health}
                </span>

                {/* Opens in its own tab: a report is something to read
                    beside the run, not instead of it. */}
                <a
                  href={`/mission/report/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the full report"
                  className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {confirming === r.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { void remove(r.id); setConfirming(null); }}
                      className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-semibold"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="px-2 py-1 rounded bg-card-border hover:bg-gray-700 text-gray-200 text-[10px]"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(r.id)}
                    title="Delete this report"
                    className="p-1.5 rounded hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] text-gray-600 leading-snug">
        Kept in this browser, not on the robot — they will not show on
        another machine, and clearing site data removes them.
      </p>
    </div>
  );
};
