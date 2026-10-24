'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson, type ExportCost, type ExportResponse, type ExportResults } from '@/lib/trials-api';

/**
 * Builds the export zip on the robot and keeps a history of what each one
 * cost, for reporting export efficiency.
 *
 * The robot has no endpoint that lists past exports, so the history is
 * kept in this browser (per robot), along with the latest export's results
 * so the result cards survive a reload. Another machine starts empty.
 */

const STORAGE_KEY = 'ecobot_export_history';
const MAX_HISTORY = 50;

export interface ExportRecord {
  export: string;
  zip: string;
  at: number;
  cost: ExportCost;
  /** Only kept for the newest record; older ones drop it to save space. */
  results?: ExportResults;
}

function readAll(): Record<string, ExportRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ExportRecord[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* full or blocked */ }
}

export function useTrialExport(base: string) {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setHistory(base ? readAll()[base] ?? [] : []); }, [base]);

  const run = useCallback(async () => {
    if (!base || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetchJson<ExportResponse>(`${base}/export`);
      const all = readAll();
      const older = (all[base] ?? []).map(({ results: _drop, ...rest }) => rest);
      const next: ExportRecord[] = [
        { export: res.export, zip: res.zip, at: Date.now(), cost: res.cost, results: res.results },
        ...older,
      ].slice(0, MAX_HISTORY);
      all[base] = next;
      writeAll(all);
      setHistory(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [base, running]);

  const clearHistory = useCallback(() => {
    const all = readAll();
    delete all[base];
    writeAll(all);
    setHistory([]);
  }, [base]);

  const latest = history[0] ?? null;
  return { history, latest, results: latest?.results ?? null, running, error, run, clearHistory };
}
