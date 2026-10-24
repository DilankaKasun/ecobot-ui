'use client';

import React, { useEffect, useState } from 'react';
import { Camera, FileText, Loader2, Table2, X } from 'lucide-react';
import { useTrialDetail } from '@/hooks/useTrialDetail';
import { isTrue } from '@/lib/evaluation';
import { trialFileUrl, trialPhotoUrl, type Row } from '@/lib/trials-api';

const HEALTH_TONE: Record<string, string> = {
  healthy: 'text-success border-success/40 bg-success/10',
  stressed: 'text-warning border-warning/40 bg-warning/10',
  diseased: 'text-danger border-danger/40 bg-danger/10',
};

const Health: React.FC<{ value?: string }> = ({ value }) =>
  value ? (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${HEALTH_TONE[value] ?? 'border-card-border text-muted-foreground'}`}>
      {value}
    </span>
  ) : <span className="text-muted-foreground">—</span>;

const cell = (row: Row, key: string, unit = '') =>
  row[key] ? `${row[key]}${unit}` : '—';

export const TrialDetail: React.FC<{
  base: string;
  trial: string;
  onClose: () => void;
}> = ({ base, trial, onClose }) => {
  const { summary, visits, captures, reports, loading, error } = useTrialDetail(base, trial);
  const [enlarged, setEnlarged] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (enlarged) setEnlarged(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enlarged, onClose]);

  const facts: Array<[string, string]> = summary ? [
    ['Duration', summary.duration_s !== undefined ? `${Math.round(summary.duration_s)} s` : '—'],
    ['Plants scanned', String(summary.plants_scanned ?? '—')],
    ['Not reached', String(summary.plants_not_reached ?? '—')],
    ['Distance driven', summary.distance_driven_m !== undefined ? `${Number(summary.distance_driven_m).toFixed(1)} m` : '—'],
    ['Swerves for obstacles', String(summary.avoidance_interventions ?? '—')],
    ['Photos', String(summary.photos ?? '—')],
    ['Gemini reports', String(summary.reports ?? '—')],
    ['Camera frames', String(summary.frames ?? '—')],
  ] : [];

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex justify-end" onClick={onClose}>
      <div className="h-full w-full max-w-3xl bg-background border-l border-card-border overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-card-border px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Trial detail</h3>
            <p className="text-[11px] font-mono text-muted-foreground truncate">{trial}</p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading this trial from the robot…
            </p>
          )}
          {error && <p className="text-[11px] text-danger">Could not read this trial: {error}</p>}

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {facts.map(([k, v]) => (
                <div key={k} className="bg-card border border-card-border rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-muted-foreground">{k}</div>
                  <div className="text-sm font-mono text-foreground">{v}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="bg-card border border-card-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Plant visits</h4>
                </div>
                {visits.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No visits recorded.</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 px-3">
                    <table className="w-full min-w-[560px] text-[11px]">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-card-border">
                          <th className="py-1.5 pr-2 font-medium">Plant</th>
                          <th className="py-1.5 pr-2 font-medium">Reached</th>
                          <th className="py-1.5 pr-2 font-medium text-right">Time to reach</th>
                          <th className="py-1.5 pr-2 font-medium text-right">Parking error</th>
                          <th className="py-1.5 pr-2 font-medium text-right">Photos</th>
                          <th className="py-1.5 pr-2 font-medium">Gemini said</th>
                          <th className="py-1.5 font-medium">True answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((v, i) => (
                          <tr key={`${v.plant}-${i}`} className="border-b border-card-border last:border-0">
                            <td className="py-1.5 pr-2 text-foreground">{v.plant}</td>
                            <td className="py-1.5 pr-2">
                              {isTrue(v.reached)
                                ? <span className="text-success">Yes</span>
                                : <span className="text-danger">No</span>}
                              {v.failure_reason && (
                                <div className="text-[10px] text-muted-foreground max-w-[160px]">{v.failure_reason}</div>
                              )}
                            </td>
                            <td className="py-1.5 pr-2 text-right font-mono">{cell(v, 'time_to_reach_s', ' s')}</td>
                            <td className="py-1.5 pr-2 text-right font-mono">{cell(v, 'parking_error_cm', ' cm')}</td>
                            <td className="py-1.5 pr-2 text-right font-mono">{cell(v, 'photos')}</td>
                            <td className="py-1.5 pr-2">
                              {v.gemini_name && <div className="text-foreground">{v.gemini_name}</div>}
                              <Health value={v.gemini_health} />
                            </td>
                            <td className="py-1.5">
                              {(v.is_plant ?? '').toLowerCase() === 'false'
                                ? <span className="text-foreground">Not a plant</span>
                                : v.true_health
                                ? <>{v.true_name && <div className="text-foreground">{v.true_name}</div>}<Health value={v.true_health} /></>
                                : v.gemini_health ? <span className="text-warning">Needed</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-card border border-card-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Arm photos</h4>
                  <span className="text-[11px] text-muted-foreground">{captures.length}</span>
                </div>
                {captures.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No photos in this trial.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {captures.map((c) => {
                      const url = trialPhotoUrl(base, trial, c.photo);
                      return (
                        <button key={c.photo} onClick={() => setEnlarged(url)}
                                className="text-left rounded-lg overflow-hidden border border-card-border bg-muted/40 hover:border-primary/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`${c.plant} ${c.viewpoint}`} loading="lazy"
                               className="w-full aspect-[4/3] object-cover bg-muted" />
                          <div className="px-2 py-1">
                            <div className="text-[10px] text-foreground truncate">{c.plant} · {c.viewpoint}</div>
                            <div className={`text-[10px] ${isTrue(c.sharp) ? 'text-muted-foreground' : 'text-warning'}`}>
                              {isTrue(c.sharp) ? 'Sharp' : 'Blurry'} · score {c.sharpness || '—'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-card border border-card-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">Gemini reports</h4>
                  <span className="text-[11px] text-muted-foreground">{reports.length}</span>
                </div>
                {reports.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No reports in this trial.</p>
                ) : (
                  <ul className="space-y-2">
                    {reports.map((r, i) => (
                      <li key={`${r.plant}-${i}`} className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">{r.plant ?? `Plant ${i + 1}`}</span>
                          <Health value={r.health} />
                          {typeof r.confidence === 'number' && (
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(r.confidence * 100)}% sure
                            </span>
                          )}
                        </div>
                        {r.notes && <p className="text-[11px] text-foreground leading-snug">{r.notes}</p>}
                        {r.issues && r.issues.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">Issues: {r.issues.join(', ')}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <a href={trialFileUrl(base, trial, 'reports.json')} target="_blank" rel="noopener noreferrer"
                   className="inline-block text-[11px] text-primary hover:underline">
                  Open the raw reports file
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {enlarged && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
             onClick={(e) => { e.stopPropagation(); setEnlarged(null); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enlarged} alt="Arm photo" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
};
