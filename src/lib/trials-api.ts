import { ROS_CONFIG } from './ros-config';

/**
 * The robot's read-only trials server (ROS_CONFIG.TRIALS_HTTP_PORT).
 *
 * Plain HTTP on the robot, so like the MJPEG streams it is unreachable from
 * a page served over HTTPS (the browser blocks it as mixed content). Everything the robot writes as CSV comes
 * back here as rows of strings; parsing into numbers happens in
 * src/lib/evaluation.ts.
 */

export type Row = Record<string, string>;

export interface TrialSummary {
  trial: string;
  started?: string;
  duration_s?: number;
  plants_scanned?: number;
  plants_not_reached?: number;
  distance_driven_m?: number;
  avoidance_interventions?: number;
  photos?: number;
  reports?: number;
  frames?: number;
  [key: string]: unknown;
}

export interface ExportCost {
  trials: number;
  files: number;
  megabytes: number;
  seconds: number;
  seconds_including_zip: number;
  zip_megabytes: number;
}

/** One metric as /export works it out: mean, spread and how many runs. */
export interface ResultStat {
  mean: number;
  std: number | null;
  n: number;
}

export type ExportResults = Record<string, Record<string, ResultStat | null>>;

export interface ExportResponse {
  export: string;
  zip: string;
  cost: ExportCost;
  results: ExportResults;
}

export interface PlantReportJson {
  plant?: string;
  health?: string;
  confidence?: number;
  notes?: string;
  issues?: string[];
  photos?: string[];
  [key: string]: unknown;
}

/** Base URL of the trials server, or '' when there is no robot to ask. */
export function trialsBaseUrl(robotHost: string): string {
  let host = (robotHost || '').trim();
  if (!host || host === 'mock') return '';
  host = host.replace(/^(https?|wss?):\/\//i, '').replace(/\/.*$/, '');
  return `http://${host.split(':')[0]}:${ROS_CONFIG.TRIALS_HTTP_PORT}`;
}

/**
 * True when the browser will refuse to read the trials server from this
 * page: an HTTPS page fetching plain http. Loopback is exempt — browsers
 * treat http://localhost as trustworthy, so a robot (or mock) on this
 * machine is still reachable.
 */
export function trialsBlockedByMixedContent(robotHost: string): boolean {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') return false;
  const name = (robotHost || '').trim().replace(/^(https?|wss?):\/\//i, '').split(/[:/]/)[0].toLowerCase();
  return !(name === 'localhost' || name.endsWith('.localhost') || name === '127.0.0.1' || name === '[::1]');
}

export function trialFileUrl(base: string, trial: string, file: string): string {
  return `${base}/trials/${encodeURIComponent(trial)}/${file}`;
}

export function trialPhotoUrl(base: string, trial: string, photo: string): string {
  return `${base}/trials/${encodeURIComponent(trial)}/photos/${encodeURIComponent(photo)}`;
}

export function exportFileUrl(base: string, exportId: string, file: string): string {
  return `${base}/exports/${encodeURIComponent(exportId)}/${encodeURIComponent(file)}`;
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** A missing CSV is an empty one: an aborted trial may not have written it. */
export async function fetchCsv(url: string, signal?: AbortSignal): Promise<Row[]> {
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return parseCsv(await res.text());
}

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') records.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); records.push(record); }
  if (records.length === 0) return [];
  const header = records[0];
  return records.slice(1).map((rec) => {
    const row: Row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = rec[i] ?? '';
    return row;
  });
}
