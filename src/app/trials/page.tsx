'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Checklist } from '@/components/evaluation/Checklist';
import { Results } from '@/components/evaluation/Results';
import { TrialList } from '@/components/evaluation/TrialList';
import { TrialDetail } from '@/components/evaluation/TrialDetail';
import { ExportPanel } from '@/components/evaluation/ExportPanel';
import { GroundTruthPanel } from '@/components/evaluation/GroundTruthPanel';
import { useTrials } from '@/hooks/useTrials';
import { useTrialExport } from '@/hooks/useTrialExport';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { trialsBlockedByMixedContent } from '@/lib/trials-api';
import type { EvalData } from '@/lib/evaluation';

const JUMP = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'results', label: 'Results' },
  { id: 'trials', label: 'Trials' },
  { id: 'export', label: 'Export' },
  { id: 'ground-truth', label: 'Ground truth' },
];

export default function EvaluationPage() {
  const t = useTrials();
  const ex = useTrialExport(t.base);
  const live = useTrialStatus();
  const [openTrial, setOpenTrial] = useState<string | null>(null);

  const data: EvalData = useMemo(() => ({
    components: t.components,
    visits: t.visits,
    captures: t.captures,
    trialCount: t.trials.length,
  }), [t.components, t.visits, t.captures, t.trials.length]);

  const blocked = trialsBlockedByMixedContent();

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-foreground">Evaluation</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Work through every test, then report how each part of the robot did across all its runs.
          </p>
        </div>
        <button onClick={() => void t.refresh()} disabled={!t.base}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${t.loading ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
        {JUMP.map((j) => (
          <a key={j.id} href={`#${j.id}`}
             className="shrink-0 px-2.5 py-1 rounded-full border border-card-border bg-card text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40">
            {j.label}
          </a>
        ))}
      </nav>

      {!t.base ? (
        <Notice>
          No robot address is set{t.robotHost === 'mock' ? ' (mock mode has no trials server)' : ''}.
          Open this page with <code className="font-mono">?robot=&lt;robot address&gt;</code>, or
          with <code className="font-mono">?robot=localhost</code> while <code className="font-mono">scripts/mock_trials_server.py</code> is running.
        </Notice>
      ) : blocked ? (
        <Notice>
          This page is served over HTTPS, so the browser will not let it read the robot&apos;s trials server
          at <span className="font-mono">{t.base}</span>. Open the dashboard over plain http on the robot&apos;s network.
        </Notice>
      ) : t.error ? (
        <Notice>
          Could not read the trials server at <span className="font-mono">{t.base}</span> ({t.error}).
          {t.loadedAt ? ' Showing what was read last time.' : ' Check the robot is on and the trials server is running.'}
        </Notice>
      ) : null}

      {t.loading && !t.loadedAt ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading trials from the robot…
        </p>
      ) : (
        <>
          <Checklist data={data} live={live} />
          <Results data={data} results={ex.results} exportId={ex.latest?.export ?? null} />
          <TrialList trials={t.trials} onOpen={setOpenTrial} />
          <ExportPanel base={t.base} history={ex.history} running={ex.running} error={ex.error}
                       onRun={() => void ex.run()} onClear={ex.clearHistory} />
          <GroundTruthPanel base={t.base} visits={t.visits} latestExport={ex.latest?.export ?? null}
                            onOpenTrial={setOpenTrial} />
        </>
      )}

      {openTrial && t.base && (
        <TrialDetail base={t.base} trial={openTrial} onClose={() => setOpenTrial(null)} />
      )}
    </div>
  );
}

const Notice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-[11px] text-foreground leading-snug">
    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
    <div>{children}</div>
  </div>
);
