'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRos } from './useRos';
import {
  fetchCsv, fetchJson, trialFileUrl, trialsBaseUrl, type Row, type TrialSummary,
} from '@/lib/trials-api';
import type { TrialRow } from '@/lib/evaluation';

/**
 * Everything recorded for the evaluation, read from the robot's trials
 * server: the trial list, every component-test row, and the visits and
 * captures of every trial (the parking, photo and diagnosis numbers are
 * worked out from those).
 *
 * Re-read every 20 s so a component test run on the robot ticks the
 * checklist without a reload. The server is read-only and small, so a
 * whole re-read is cheaper than tracking what changed.
 */

const REFRESH_MS = 20000;

export function useTrials() {
  const { robotHost } = useRos();
  const base = trialsBaseUrl(robotHost);

  const [trials, setTrials] = useState<TrialSummary[]>([]);
  const [components, setComponents] = useState<Record<string, Row[]>>({});
  const [visits, setVisits] = useState<TrialRow[]>([]);
  const [captures, setCaptures] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!base) { setLoading(false); return; }
    inFlight.current?.abort();
    const ctl = new AbortController();
    inFlight.current = ctl;
    try {
      const [t, c] = await Promise.all([
        fetchJson<{ trials: TrialSummary[] }>(`${base}/trials`, ctl.signal),
        fetchJson<{ components: Record<string, Row[]> }>(`${base}/components`, ctl.signal),
      ]);
      const list = Array.isArray(t.trials) ? t.trials : [];
      const perTrial = await Promise.all(list.map(async (s) => {
        const [v, cap] = await Promise.all([
          fetchCsv(trialFileUrl(base, s.trial, 'visits.csv'), ctl.signal),
          fetchCsv(trialFileUrl(base, s.trial, 'captures.csv'), ctl.signal),
        ]);
        return {
          visits: v.map((r) => ({ ...r, trial: s.trial })),
          captures: cap.map((r) => ({ ...r, trial: s.trial })),
        };
      }));
      if (ctl.signal.aborted) return;
      setTrials(list);
      setComponents(c.components ?? {});
      setVisits(perTrial.reduce<TrialRow[]>((a, p) => a.concat(p.visits), []));
      setCaptures(perTrial.reduce<TrialRow[]>((a, p) => a.concat(p.captures), []));
      setError(null);
      setLoadedAt(Date.now());
    } catch (e) {
      if (ctl.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    return () => { clearInterval(id); inFlight.current?.abort(); };
  }, [refresh]);

  return { base, robotHost, trials, components, visits, captures, loading, error, loadedAt, refresh };
}
