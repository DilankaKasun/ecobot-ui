'use client';

import React, { useState } from 'react';
import { ClipboardList, FileSpreadsheet } from 'lucide-react';
import { TRUTH_FIELDS, reported, truthMissing, type TrialRow } from '@/lib/evaluation';
import { exportFileUrl, trialPhotoUrl } from '@/lib/trials-api';

/**
 * The robot cannot take uploads yet, so this shows each visited plant with
 * its photos and which of the four answers the sheet still needs, and links
 * to the sheet itself. Plants that were never scanned have no Gemini answer
 * to judge, so are left out.
 */
export const GroundTruthPanel: React.FC<{
  base: string;
  visits: TrialRow[];
  captures: TrialRow[];
  latestExport: string | null;
  onOpenTrial: (trial: string) => void;
}> = ({ base, visits, captures, latestExport, onOpenTrial }) => {
  const [showDone, setShowDone] = useState(false);
  const checkable = visits.filter(reported);
  const missing = checkable.filter((v) => truthMissing(v).length > 0);
  const rows = showDone ? checkable : missing;

  const photosFor = (v: TrialRow) =>
    captures.filter((c) => c.trial === v.trial && c.plant === v.plant).slice(0, 4);

  return (
    <section id="ground-truth" className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3 scroll-mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Ground truth</h3>
        <span className="text-[11px] text-muted-foreground">
          {checkable.length - missing.length} of {checkable.length} scanned plants done
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        The robot can&apos;t know whether Gemini was right. For each plant it scanned, fill in four answers on
        ground_truth.csv: {TRUTH_FIELDS.map((f) => f.label.toLowerCase()).join(', ')}. The photos are shown
        beside each plant to help. The next export compares Gemini&apos;s answers with yours. Uploading the sheet
        from here is not possible yet.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {latestExport ? (
          <a href={exportFileUrl(base, latestExport, 'ground_truth.csv')} download
             className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-card-border text-[11px] font-semibold text-foreground hover:border-primary/40">
            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
            Download ground_truth.csv
          </a>
        ) : (
          <p className="text-[11px] text-warning">Build an export first; ground_truth.csv comes with it.</p>
        )}
        {checkable.length > 0 && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Show finished plants too
          </label>
        )}
      </div>

      {missing.length === 0 && checkable.length > 0 && !showDone && (
        <p className="text-[11px] text-success">Every scanned plant has its ground truth.</p>
      )}

      <ul className="space-y-2">
        {rows.map((v) => {
          const need = truthMissing(v);
          const photos = photosFor(v);
          return (
            <li key={`${v.trial}/${v.plant}`}
                className="rounded-lg bg-muted/40 p-2.5 flex flex-col sm:flex-row gap-3">
              <div className="grid grid-cols-4 gap-1 sm:w-64 shrink-0">
                {photos.length === 0 ? (
                  <div className="col-span-4 text-[10px] text-muted-foreground py-3 text-center border border-dashed border-card-border rounded">
                    No photos
                  </div>
                ) : photos.map((c) => {
                  const url = trialPhotoUrl(base, v.trial, c.photo);
                  return (
                    <a key={c.photo} href={url} target="_blank" rel="noopener noreferrer" title={c.viewpoint}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${v.plant} ${c.viewpoint}`} loading="lazy"
                           className="w-full aspect-square object-cover rounded bg-muted" />
                    </a>
                  );
                })}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{v.plant}</span>
                  <button onClick={() => onOpenTrial(v.trial)}
                          className="text-[10px] font-mono text-primary hover:underline truncate">
                    {v.trial}
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Gemini said: {v.gemini_name || 'no name'}, {v.gemini_health || 'no health rating'}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  {TRUTH_FIELDS.map((f) => {
                    const val = (v[f.key] ?? '').trim();
                    const needed = need.indexOf(f.label) !== -1;
                    return (
                      <div key={f.key} className="min-w-0 truncate">
                        <dt className="inline text-muted-foreground">{f.label}: </dt>
                        <dd className={`inline ${needed ? 'text-warning font-medium' : 'text-foreground'}`}>
                          {val ? (val === 'True' ? 'yes' : val === 'False' ? 'no' : val) : needed ? 'needed' : 'n/a'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
