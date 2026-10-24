'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ListChecks, Radio, Sprout } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { CHECKLIST, SECTIONS, stepProgress, type EvalData } from '@/lib/evaluation';
import type { TrialStatus } from '@/hooks/useTrialStatus';

const STATE_WORDS: Record<string, string> = {
  IDLE: 'Idle', SURVEY: 'Looking for plants', PICK: 'Choosing a plant', REACQUIRE: 'Finding the plant again',
  DRIVE: 'Driving', HANDOVER: 'Handing over to the camera', APPROACH: 'Approaching the plant',
  SCAN: 'Photographing', REPORT: 'Asking Gemini', TURN_AWAY: 'Turning away', DONE: 'Finished',
};

function mmss(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const LiveTrial: React.FC<{ status: TrialStatus | null; stale: boolean; connected: boolean }> = ({
  status, stale, connected,
}) => {
  if (!connected) {
    return <p className="text-[11px] text-muted-foreground">Not connected to the robot, so live progress is not shown.</p>;
  }
  if (!status || stale) {
    return <p className="text-[11px] text-muted-foreground">No word from the trial recorder in the last few seconds.</p>;
  }
  if (!status.recording) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Recorder is on but not recording. {status.trials_saved} trials saved.
      </p>
    );
  }
  const cells: Array<[string, string]> = [
    ['Time', mmss(status.elapsed_s)],
    ['Doing', STATE_WORDS[status.state] ?? status.state],
    ['Current plant', status.current_plant || '—'],
    ['Plants scanned', String(status.plants_scanned)],
    ['Not reached', String(status.plants_not_reached)],
    ['Driven', `${Number(status.distance_driven_m).toFixed(1)} m`],
    ['Swerves for obstacles', String(status.avoidance_interventions)],
    ['Photos / reports', `${status.photos} / ${status.reports}`],
  ];
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <Radio className="w-3.5 h-3.5 text-danger animate-pulse" />
        Recording {status.trial}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
        {cells.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <div className="text-[10px] text-muted-foreground">{k}</div>
            <div className="text-xs font-mono text-foreground truncate">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Checklist: React.FC<{
  data: EvalData;
  live: { status: TrialStatus | null; stale: boolean; isConnected: boolean };
}> = ({ data, live }) => {
  const steps = CHECKLIST.map((s) => ({ step: s, ...stepProgress(s, data) }));
  const finished = steps.filter((s) => s.done >= s.step.target).length;

  return (
    <section id="checklist" className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-4 scroll-mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
        <span className="text-[11px] text-muted-foreground">
          {finished} of {steps.length} steps done
        </span>
        <div className="flex-1 min-w-[80px] h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-success" style={{ width: `${(100 * finished) / steps.length}%` }} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Each component test adds one row on the robot when it finishes; this list re-reads them every 20 seconds.
        Runs the robot marked as not valid are not counted.
      </p>

      {SECTIONS.map((sec) => (
        <div key={sec.id} className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h4>
          <ol className="space-y-2">
            {steps.filter((s) => s.step.section === sec.id).map(({ step, done, rejected }) => {
              const complete = done >= step.target;
              return (
                <li key={step.id}
                    className={`rounded-lg border p-3 space-y-2 ${complete ? 'border-success/30 bg-success/5' : 'border-card-border bg-muted/40'}`}>
                  <div className="flex items-start gap-2.5">
                    {complete
                      ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" aria-label="Done" />
                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-label="Not done" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{step.title}</span>
                        <span className={`text-xs font-mono ${complete ? 'text-success' : 'text-foreground'}`}>
                          {done} / {step.target} {step.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.what}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${complete ? 'bg-success' : 'bg-primary'}`}
                             style={{ width: `${Math.min(100, (100 * done) / step.target)}%` }} />
                      </div>
                      {rejected > 0 && (
                        <p className="text-[10px] text-warning mt-1">
                          {rejected} more {rejected === 1 ? 'run was' : 'runs were'} marked not valid and not counted.
                        </p>
                      )}
                    </div>
                  </div>

                  {step.command ? (
                    <div className="flex items-center gap-2 pl-6">
                      <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap rounded-md bg-background border border-card-border px-2 py-1 font-mono text-[11px] text-foreground">
                        {step.command}
                      </code>
                      <CopyButton text={step.command} />
                    </div>
                  ) : (
                    <div className="pl-6 space-y-2">
                      <Link href="/mission"
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                        <Sprout className="w-3.5 h-3.5" />
                        Start a plant run from the Plant Run page
                      </Link>
                      <LiveTrial status={live.status} stale={live.stale} connected={live.isConnected} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
};
