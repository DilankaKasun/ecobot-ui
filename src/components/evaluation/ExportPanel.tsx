'use client';

import React, { useState } from 'react';
import { Archive, Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { RunChart } from './RunChart';
import { exportFileUrl } from '@/lib/trials-api';
import type { ExportRecord } from '@/hooks/useTrialExport';

const perTrial = (r: ExportRecord) =>
  r.cost.trials > 0 ? r.cost.seconds_including_zip / r.cost.trials : null;

export const ExportPanel: React.FC<{
  base: string;
  history: ExportRecord[];
  running: boolean;
  error: string | null;
  onRun: () => void;
  onClear: () => void;
}> = ({ base, history, running, error, onRun, onClear }) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const latest = history[0];
  const tiles: Array<[string, string]> = latest ? [
    ['Trials', String(latest.cost.trials)],
    ['Files', String(latest.cost.files)],
    ['Data collected', `${latest.cost.megabytes.toFixed(2)} MB`],
    ['Zip size', `${latest.cost.zip_megabytes.toFixed(2)} MB`],
    ['Time to collect', `${latest.cost.seconds.toFixed(2)} s`],
    ['Time including zip', `${latest.cost.seconds_including_zip.toFixed(2)} s`],
    ['Time per trial', perTrial(latest) === null ? '—' : `${perTrial(latest)!.toFixed(3)} s`],
    ['Speed', latest.cost.seconds_including_zip > 0
      ? `${(latest.cost.megabytes / latest.cost.seconds_including_zip).toFixed(1)} MB/s` : '—'],
  ] : [];
  // Oldest on the left, as with every other chart here.
  const points = history.slice().reverse().map((r, i) => ({
    name: `#${i + 1}`, value: r.cost.seconds_including_zip,
  }));

  return (
    <section id="export" className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3 scroll-mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Archive className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Export</h3>
        <button onClick={onRun} disabled={running || !base}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {running ? 'Building export…' : 'Build export'}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Builds one zip on the robot with every trial, component test and photo, and works out the results above.
      </p>
      {error && <p className="text-[11px] text-danger">Export failed: {error}</p>}

      {latest && (
        <>
          <div className="text-[11px] text-muted-foreground">
            Latest: <span className="font-mono text-foreground">{latest.export}</span>, {new Date(latest.at).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tiles.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                <div className="text-[10px] text-muted-foreground">{k}</div>
                <div className="text-sm font-mono text-foreground">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { file: latest.zip, label: 'Download zip', icon: Archive },
              { file: 'results.json', label: 'results.json', icon: FileJson },
              { file: 'ground_truth.csv', label: 'ground_truth.csv', icon: FileSpreadsheet },
            ].map(({ file, label, icon: Icon }) => (
              <a key={file} href={exportFileUrl(base, latest.export, file)} download
                 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-card-border text-[11px] font-semibold text-foreground hover:border-primary/40">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
              </a>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Export cost history</h4>
          {history.length > 1 && (
            <>
              <span className="text-[11px] text-muted-foreground">Time including zip, per export (s)</span>
              <RunChart points={points} unit="s" kind="trial" />
            </>
          )}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[520px] text-[11px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-card-border">
                  <th className="py-1.5 pr-2 font-medium">When</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Trials</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Files</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Data</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Zip</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Time incl. zip</th>
                  <th className="py-1.5 font-medium text-right">Per trial</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.export} className="border-b border-card-border last:border-0 font-mono">
                    <td className="py-1.5 pr-2 font-sans text-foreground">{new Date(r.at).toLocaleString()}</td>
                    <td className="py-1.5 pr-2 text-right">{r.cost.trials}</td>
                    <td className="py-1.5 pr-2 text-right">{r.cost.files}</td>
                    <td className="py-1.5 pr-2 text-right">{r.cost.megabytes.toFixed(2)} MB</td>
                    <td className="py-1.5 pr-2 text-right">{r.cost.zip_megabytes.toFixed(2)} MB</td>
                    <td className="py-1.5 pr-2 text-right">{r.cost.seconds_including_zip.toFixed(2)} s</td>
                    <td className="py-1.5 text-right">{perTrial(r) === null ? '—' : `${perTrial(r)!.toFixed(3)} s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] text-muted-foreground flex-1 min-w-[200px]">
              The robot does not keep a list of past exports, so this history is kept in this browser only.
            </p>
            {confirmClear ? (
              <>
                <button onClick={() => { onClear(); setConfirmClear(false); }}
                        className="px-2 py-1 rounded bg-danger/90 hover:bg-danger text-background text-[10px] font-semibold">
                  Clear history
                </button>
                <button onClick={() => setConfirmClear(false)}
                        className="px-2 py-1 rounded border border-card-border text-foreground text-[10px]">
                  Keep
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmClear(true)}
                      className="text-[10px] text-muted-foreground hover:text-danger">
                Clear history
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
