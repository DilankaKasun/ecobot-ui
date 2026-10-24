'use client';

import React, { useState } from 'react';
import { BarChart3, CheckCircle2, CircleDashed, Table2, XCircle } from 'lucide-react';
import { RunChart } from './RunChart';
import {
  CARDS, SECTIONS, formatStat, metricValue, type CardDef, type EvalData,
} from '@/lib/evaluation';
import type { ExportResults } from '@/lib/trials-api';

const ResultCard: React.FC<{
  card: CardDef;
  data: EvalData;
  results: ExportResults | null;
}> = ({ card, data, results }) => {
  const [asTable, setAsTable] = useState(false);
  const [one, many] = card.noun ?? ['run', 'runs'];
  const count = (n: number, noun?: [string, string]) =>
    `${n} ${n === 1 ? (noun ?? [one])[0] : (noun ?? [one, many])[1]}`;
  const values = card.metrics.map((m) => ({ m, v: metricValue(m, data, results) }));
  const [head, ...rest] = values;
  const points = card.chart?.points(data) ?? [];
  const note = card.note?.(data);
  const newer = Math.max(...values.map(({ v }) => v.newerRuns));
  const verdict = card.meets ? card.meets(values.map(({ v }) => v.stat?.mean ?? null)) : null;
  // The chart's own mean, in the chart's unit, for the dashed reference line.
  const chartMean = points.length > 1
    ? points.reduce((a, p) => a + p.value, 0) / points.length
    : undefined;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
          head.v.source === 'export'
            ? 'border-primary/30 text-primary'
            : 'border-card-border text-muted-foreground'}`}
              title={head.v.source === 'export'
                ? 'Taken from the results of the latest export'
                : 'Worked out in this browser from the recorded rows'}>
          {head.v.source === 'export' ? 'From export' : 'From rows'}
        </span>
      </div>

      <div>
        <div className="text-[11px] text-muted-foreground">{head.m.label}</div>
        <div className="text-2xl font-semibold font-mono text-foreground leading-tight">
          {formatStat(head.v.stat, head.m.unit, head.m.decimals)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {head.v.stat ? count(head.v.stat.n) : 'Nothing recorded yet'}
          {head.v.stat && head.v.stat.std !== null && head.v.stat.n > 1 && ' · average ± spread'}
        </div>
      </div>

      {/* The bar the method sets, and — where it is a number — whether this
          result clears it. Icon and words, never colour alone. */}
      <div className="flex items-start gap-1.5 text-[11px] leading-snug">
        {verdict === true ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-px" />
          : verdict === false ? <XCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-px" />
          : <CircleDashed className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-px" />}
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">
            {verdict === true ? 'Meets the goal. ' : verdict === false ? 'Short of the goal. ' : 'Goal: '}
          </span>
          {card.good}
        </span>
      </div>

      {rest.length > 0 && (
        <dl className="grid grid-cols-1 xs:grid-cols-2 gap-2">
          {rest.map(({ m, v }) => (
            <div key={m.key} className="rounded-lg bg-muted/50 px-2.5 py-1.5 min-w-0">
              <dt className="text-[10px] text-muted-foreground">{m.label}</dt>
              <dd className="text-sm font-mono text-foreground">{formatStat(v.stat, m.unit, m.decimals)}</dd>
              <dd className="text-[10px] text-muted-foreground">{v.stat ? count(v.stat.n, m.noun) : 'Nothing recorded yet'}</dd>
            </div>
          ))}
        </dl>
      )}

      {note && <p className="text-[11px] text-muted-foreground leading-snug">{note}</p>}
      {newer > 0 && (
        <p className="text-[11px] text-warning leading-snug">
          {count(newer)} recorded since the last export. Build a new export to include {newer === 1 ? 'it' : 'them'}.
        </p>
      )}

      {card.chart && (
        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{card.chart.title} ({card.chart.unit})</span>
            <button onClick={() => setAsTable((t) => !t)}
                    title={asTable ? 'Show as a chart' : 'Show as a table'}
                    className="p-1 rounded text-muted-foreground hover:text-foreground">
              {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            </button>
          </div>
          {asTable ? (
            <div className="max-h-32 overflow-y-auto">
              <table className="w-full text-[11px]">
                <tbody>
                  {points.map((p) => (
                    <tr key={p.name} className="border-b border-card-border last:border-0">
                      <td className="py-0.5 text-muted-foreground">{p.name}</td>
                      <td className="py-0.5 text-right font-mono text-foreground">
                        {p.value.toFixed(2)} {card.chart!.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <RunChart points={points} unit={card.chart.unit} kind={card.chart.kind} mean={chartMean} />
          )}
        </div>
      )}
    </div>
  );
};

export const Results: React.FC<{
  data: EvalData;
  results: ExportResults | null;
  exportId: string | null;
}> = ({ data, results, exportId }) => (
  <section id="results" className="space-y-4 scroll-mt-4">
    <div>
      <h3 className="text-sm font-semibold text-foreground">Results</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {exportId
          ? <>Headline numbers come from export <span className="font-mono">{exportId}</span> where it has them; the rest are worked out here from the recorded rows. Charts always use the rows.</>
          : 'No export built from this browser yet, so every number is worked out here from the recorded rows.'}
      </p>
    </div>
    {SECTIONS.map((sec) => (
      <div key={sec.id} className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {CARDS.filter((c) => c.section === sec.id).map((c) => (
            <ResultCard key={c.id} card={c} data={data} results={results} />
          ))}
        </div>
      </div>
    ))}
  </section>
);
