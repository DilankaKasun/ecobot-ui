'use client';

import { useEffect, useState } from 'react';
import {
  fetchCsv, fetchJson, trialFileUrl, type PlantReportJson, type Row, type TrialSummary,
} from '@/lib/trials-api';

/** One trial's own files, read when its detail is opened. */
export function useTrialDetail(base: string, trial: string | null) {
  const [summary, setSummary] = useState<TrialSummary | null>(null);
  const [visits, setVisits] = useState<Row[]>([]);
  const [captures, setCaptures] = useState<Row[]>([]);
  const [reports, setReports] = useState<PlantReportJson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!base || !trial) return;
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchJson<TrialSummary>(trialFileUrl(base, trial, 'summary.json'), ctl.signal),
      fetchCsv(trialFileUrl(base, trial, 'visits.csv'), ctl.signal),
      fetchCsv(trialFileUrl(base, trial, 'captures.csv'), ctl.signal),
      // An interrupted trial may have no reports file; that is no reports.
      fetchJson<PlantReportJson[]>(trialFileUrl(base, trial, 'reports.json'), ctl.signal)
        .catch(() => [] as PlantReportJson[]),
    ])
      .then(([s, v, c, r]) => {
        setSummary(s);
        setVisits(v);
        setCaptures(c);
        setReports(Array.isArray(r) ? r : []);
      })
      .catch((e) => { if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [base, trial]);

  return { summary, visits, captures, reports, loading, error };
}
