'use client';

import React from 'react';
import { ClipboardList, FileSpreadsheet } from 'lucide-react';
import { isTrue, type TrialRow } from '@/lib/evaluation';
import { exportFileUrl } from '@/lib/trials-api';

/**
 * The robot cannot take uploads yet, so this only says which visits still
 * need a true answer and where to get the sheet to fill in. Visits that
 * never reached their plant have no diagnosis to check, so are left out.
 */
export const GroundTruthPanel: React.FC<{
  base: string;
  visits: TrialRow[];
  latestExport: string | null;
  onOpenTrial: (trial: string) => void;
}> = ({ base, visits, latestExport, onOpenTrial }) => {
  const checkable = visits.filter((v) => isTrue(v.reached));
  const missing = checkable.filter((v) => !v.true_health);
  const byTrial: Record<string, TrialRow[]> = {};
  const order: string[] = [];
  missing.forEach((v) => {
    if (!byTrial[v.trial]) { byTrial[v.trial] = []; order.push(v.trial); }
    byTrial[v.trial].push(v);
  });

  return (
    <section id="ground-truth" className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3 scroll-mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Ground truth</h3>
        <span className="text-[11px] text-muted-foreground">
          {checkable.length - missing.length} of {checkable.length} visits have a true answer
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Diagnosis accuracy can only be worked out for visits where someone has written down what was really wrong
        with the plant. Fill in the true answer column of ground_truth.csv from the latest export; uploading it from
        here is not possible yet.
      </p>

      {latestExport ? (
        <a href={exportFileUrl(base, latestExport, 'ground_truth.csv')} download
           className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-card-border text-[11px] font-semibold text-foreground hover:border-primary/40">
          <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
          Download ground_truth.csv
        </a>
      ) : (
        <p className="text-[11px] text-warning">Build an export first; ground_truth.csv comes with it.</p>
      )}

      {missing.length === 0 ? (
        checkable.length > 0 && <p className="text-[11px] text-success">Every visit has a true answer.</p>
      ) : (
        <ul className="space-y-1.5">
          {order.map((t) => (
            <li key={t} className="rounded-lg bg-muted/40 px-3 py-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <button onClick={() => onOpenTrial(t)}
                        className="text-xs font-mono text-primary hover:underline truncate max-w-full">
                  {t}
                </button>
                <div className="text-[11px] text-muted-foreground">
                  {byTrial[t].map((v) => `${v.plant} (Gemini said ${v.gemini_health || 'nothing'})`).join(', ')}
                </div>
              </div>
              <span className="text-[11px] font-mono text-warning shrink-0">{byTrial[t].length} needed</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
