'use client';

import React from 'react';
import { ChevronRight, History } from 'lucide-react';
import type { TrialSummary } from '@/lib/trials-api';

function when(s: TrialSummary) {
  if (!s.started) return s.trial;
  const d = new Date(s.started);
  return Number.isNaN(d.getTime()) ? s.started : d.toLocaleString();
}

function duration(s?: number) {
  if (s === undefined) return '—';
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export const TrialList: React.FC<{
  trials: TrialSummary[];
  onOpen: (trial: string) => void;
}> = ({ trials, onOpen }) => (
  <section id="trials" className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3 scroll-mt-4">
    <div className="flex items-center gap-2">
      <History className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">Plant run trials</h3>
      <span className="text-[11px] text-muted-foreground">{trials.length}, newest first</span>
    </div>

    {trials.length === 0 ? (
      <p className="text-[11px] text-muted-foreground border border-dashed border-card-border rounded-lg py-5 text-center">
        No trials recorded yet. Each finished plant run is saved as one.
      </p>
    ) : (
      <ul className="space-y-1.5">
        {trials.map((t) => (
          <li key={t.trial}>
            <button onClick={() => onOpen(t.trial)}
                    className="w-full text-left flex items-center gap-3 rounded-lg bg-muted/40 hover:bg-muted px-3 py-2 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-foreground truncate">{when(t)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {duration(t.duration_s)} · {t.plants_scanned ?? 0} plants scanned
                  {(t.plants_not_reached ?? 0) > 0 && `, ${t.plants_not_reached} not reached`}
                  {' · '}{Number(t.distance_driven_m ?? 0).toFixed(1)} m driven
                  {' · '}{t.photos ?? 0} photos
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
