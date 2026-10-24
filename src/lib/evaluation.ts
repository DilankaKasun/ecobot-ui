import type { ExportResults, ResultStat, Row } from './trials-api';

/**
 * What the evaluation measures and how, in one place.
 *
 * The checklist steps, the result cards and the CSV column each number is
 * read from all live here. Headline numbers come from the latest /export's
 * `results` when it has them; otherwise they are worked out in the browser
 * from the raw rows, using the same column names the robot writes.
 */

/** A visit or capture row, tagged with the trial it came from. */
export type TrialRow = Row & { trial: string };

export interface EvalData {
  components: Record<string, Row[]>;
  visits: TrialRow[];
  captures: TrialRow[];
  trialCount: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

export function num(row: Row, key: string): number | null {
  const v = row[key];
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isTrue(v: string | undefined): boolean {
  return (v ?? '').trim().toLowerCase() === 'true';
}

/** Driving rows the robot marked valid="False" do not count. */
export function validRows(rows: Row[] | undefined): Row[] {
  return (rows ?? []).filter((r) => (r.valid ?? 'True').trim().toLowerCase() !== 'false');
}

export function stat(values: Array<number | null>): ResultStat | null {
  const xs = values.filter((v): v is number => v !== null);
  if (xs.length === 0) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const std = xs.length > 1
    ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (xs.length - 1))
    : 0;
  return { mean, std, n: xs.length };
}

/** A yes/no rate as a percentage; there is no spread to give. */
export function rate(flags: boolean[]): ResultStat | null {
  if (flags.length === 0) return null;
  return { mean: (100 * flags.filter(Boolean).length) / flags.length, std: null, n: flags.length };
}

// ── checklist ──────────────────────────────────────────────────────────────

export interface ChecklistStep {
  id: string;
  title: string;
  /** One line on what the step is for, in plain words. */
  what: string;
  target: number;
  /** What one run is called: "runs", "distances", ... */
  unit: string;
  /** Run on the robot; absent for plant runs, which start from /mission. */
  command?: string;
  section: SectionId;
}

export type SectionId = 'driving' | 'plants' | 'diagnosis';

export const SECTIONS: Array<{ id: SectionId; title: string }> = [
  { id: 'driving', title: 'Driving and mapping' },
  { id: 'plants', title: 'Finding plants' },
  { id: 'diagnosis', title: 'Diagnosis' },
];

const test = (name: string) => `ros2 run ecobot_mission component_test ${name}`;

export const CHECKLIST: ChecklistStep[] = [
  { id: 'line', section: 'driving', title: 'Driving straight', target: 5, unit: 'runs',
    command: test('line'), what: 'How far off the robot ends up after a straight drive.' },
  { id: 'turn', section: 'driving', title: 'Turning corners', target: 5, unit: 'runs',
    command: test('turn'), what: 'How close an on-the-spot turn gets to the angle asked for.' },
  { id: 'square', section: 'driving', title: 'Driving a square', target: 5, unit: 'runs',
    command: test('square'), what: 'How far from the start the robot is after four sides and four corners.' },
  { id: 'goto', section: 'driving', title: 'Reaching a target with Nav2', target: 10, unit: 'runs',
    command: test('goto'), what: 'Whether Nav2 gets to a goal on the map, and how close.' },
  { id: 'obstacle', section: 'driving', title: 'Avoiding obstacles', target: 10, unit: 'runs',
    command: test('obstacle'), what: 'Whether the RealSense camera stops the robot before an obstacle, and how far away.' },
  { id: 'map', section: 'driving', title: 'SLAM map accuracy', target: 5, unit: 'distances',
    command: test('map'), what: 'A tape-measured distance compared with the same distance on the map.' },
  { id: 'yolo', section: 'plants', title: 'Plant detection (YOLOv8)', target: 1, unit: 'set',
    command: test('yolo'), what: 'Detections on a labelled set of images: precision, recall and F1.' },
  { id: 'llm', section: 'diagnosis', title: 'Gemini consistency', target: 5, unit: 'plants',
    command: test('llm'), what: 'The same plant asked about repeatedly: how often Gemini gives the same answer.' },
  { id: 'trials', section: 'plants', title: 'Full plant runs', target: 10, unit: 'runs',
    what: 'Complete missions recorded as trials: parking, photos and diagnosis for every plant.' },
];

/** How many runs count towards a step, and how many were thrown out. */
export function stepProgress(step: ChecklistStep, data: EvalData): { done: number; rejected: number } {
  if (step.id === 'trials') return { done: data.trialCount, rejected: 0 };
  const all = data.components[step.id] ?? [];
  const ok = validRows(all).length;
  return { done: ok, rejected: all.length - ok };
}

// ── result cards ───────────────────────────────────────────────────────────

export interface MetricDef {
  label: string;
  unit: string;
  decimals: number;
  /** Where /export puts it: results[group][key]. */
  group: string;
  key: string;
  /** Multiply both the export value and the row value by this for display. */
  scale?: number;
  compute: (d: EvalData) => ResultStat | null;
}

export interface ChartDef {
  title: string;
  unit: string;
  /** "run" bars per test row; "trial" a line across plant runs. */
  kind: 'run' | 'trial';
  points: (d: EvalData) => Array<{ name: string; value: number }>;
}

export interface CardDef {
  id: string;
  title: string;
  section: SectionId;
  /** The first metric is the headline; the rest are shown smaller. */
  metrics: MetricDef[];
  chart?: ChartDef;
  /** What one counted item is called; "runs" unless it says otherwise. */
  noun?: [string, string];
  /** Extra plain-words line, e.g. counts behind a rate. */
  note?: (d: EvalData) => string | null;
}

function perRun(component: string, key: string, filter?: (r: Row) => boolean) {
  return (d: EvalData) =>
    validRows(d.components[component])
      .filter((r) => (filter ? filter(r) : true))
      .map((r, i) => ({ name: `Run ${i + 1}`, value: num(r, key) }))
      .filter((p): p is { name: string; value: number } => p.value !== null);
}

function perTrial(key: string) {
  return (d: EvalData) => {
    const order: string[] = [];
    const by: Record<string, number[]> = {};
    d.visits.forEach((v) => {
      if (!isTrue(v.reached)) return;
      const x = num(v, key);
      if (x === null) return;
      if (!by[v.trial]) { by[v.trial] = []; order.push(v.trial); }
      by[v.trial].push(x);
    });
    // Trials arrive newest first; a chart across trials reads left to right.
    return order.reverse().map((t, i) => ({
      name: `Trial ${i + 1}`,
      value: by[t].reduce((a, b) => a + b, 0) / by[t].length,
    }));
  };
}

const col = (component: string, key: string, filter?: (r: Row) => boolean) =>
  (d: EvalData) => stat(validRows(d.components[component])
    .filter((r) => (filter ? filter(r) : true)).map((r) => num(r, key)));

/** YOLO is scored on one labelled set; the latest row is the answer. */
const yoloLatest = (key: string) => (d: EvalData): ResultStat | null => {
  const rows = d.components.yolo ?? [];
  const v = rows.length ? num(rows[rows.length - 1], key) : null;
  return v === null ? null : { mean: v, std: null, n: 1 };
};

const reached = (d: EvalData) => d.visits.filter((v) => isTrue(v.reached));
const labelled = (d: EvalData) => reached(d).filter((v) => (v.true_health ?? '') !== '');

export const CARDS: CardDef[] = [
  {
    id: 'line', title: 'Driving straight', section: 'driving',
    metrics: [
      { label: 'Distance error', unit: 'cm', decimals: 1, group: 'line', key: 'distance_error_cm',
        compute: col('line', 'distance_error_cm') },
      { label: 'Sideways drift', unit: 'cm', decimals: 1, group: 'line', key: 'lateral_drift_cm',
        compute: col('line', 'lateral_drift_cm') },
    ],
    chart: { title: 'Distance error per run', unit: 'cm', kind: 'run',
      points: perRun('line', 'distance_error_cm') },
  },
  {
    id: 'turn', title: 'Turning corners', section: 'driving',
    metrics: [
      { label: 'Turn error', unit: '°', decimals: 1, group: 'turn', key: 'error_deg',
        compute: col('turn', 'error_deg') },
    ],
    chart: { title: 'Turn error per run', unit: '°', kind: 'run', points: perRun('turn', 'error_deg') },
  },
  {
    id: 'square', title: 'Driving a square', section: 'driving',
    metrics: [
      { label: 'Gap back to the start', unit: 'cm', decimals: 1, group: 'square', key: 'closure_error_cm',
        compute: col('square', 'closure_error_cm') },
    ],
    chart: { title: 'Gap back to the start per run', unit: 'cm', kind: 'run',
      points: perRun('square', 'closure_error_cm') },
  },
  {
    id: 'goto', title: 'Reaching a target with Nav2', section: 'driving',
    metrics: [
      { label: 'Success rate', unit: '%', decimals: 0, group: 'goto', key: 'success_pct',
        compute: (d) => rate(validRows(d.components.goto).map((r) => isTrue(r.reached))) },
      { label: 'Distance from goal (when reached)', unit: 'cm', decimals: 1, group: 'goto',
        key: 'position_error_cm', compute: col('goto', 'position_error_cm', (r) => isTrue(r.reached)) },
    ],
    chart: { title: 'Distance from goal per successful run', unit: 'cm', kind: 'run',
      points: perRun('goto', 'position_error_cm', (r) => isTrue(r.reached)) },
  },
  {
    id: 'obstacle', title: 'Avoiding obstacles', section: 'driving',
    metrics: [
      { label: 'Stopped in time', unit: '%', decimals: 0, group: 'obstacle', key: 'stop_pct',
        compute: (d) => rate(validRows(d.components.obstacle).map((r) => isTrue(r.stopped))) },
      { label: 'Stopping distance', unit: 'cm', decimals: 1, group: 'obstacle', key: 'stop_distance_m',
        scale: 100, compute: col('obstacle', 'stop_distance_m', (r) => isTrue(r.stopped)) },
    ],
    chart: { title: 'Stopping distance per run', unit: 'cm', kind: 'run',
      points: (d) => perRun('obstacle', 'stop_distance_m', (r) => isTrue(r.stopped))(d)
        .map((p) => ({ name: p.name, value: p.value * 100 })) },
  },
  {
    id: 'map', title: 'SLAM map accuracy', section: 'driving', noun: ['distance', 'distances'],
    metrics: [
      { label: 'Map distance error', unit: '%', decimals: 1, group: 'map', key: 'error_pct',
        compute: col('map', 'error_pct') },
    ],
    chart: { title: 'Error per measured distance', unit: '%', kind: 'run',
      points: (d) => validRows(d.components.map)
        .map((r) => ({ name: `${r.true_distance_m} m`, value: num(r, 'error_pct') }))
        .filter((p): p is { name: string; value: number } => p.value !== null) },
  },
  {
    id: 'yolo', title: 'Plant detection (YOLOv8)', section: 'plants', noun: ['image set', 'image sets'],
    metrics: [
      { label: 'F1 score', unit: '%', decimals: 1, group: 'yolo', key: 'f1', scale: 100,
        compute: yoloLatest('f1') },
      { label: 'Precision', unit: '%', decimals: 1, group: 'yolo', key: 'precision', scale: 100,
        compute: yoloLatest('precision') },
      { label: 'Recall', unit: '%', decimals: 1, group: 'yolo', key: 'recall', scale: 100,
        compute: yoloLatest('recall') },
    ],
    note: (d) => {
      const rows = d.components.yolo ?? [];
      const r = rows[rows.length - 1];
      if (!r) return null;
      return `${r.images} images: ${r.true_positives} found correctly, ${r.false_positives} false alarms, ${r.false_negatives} missed.`;
    },
  },
  {
    id: 'parking', title: 'Parking at a plant', section: 'plants', noun: ['plant visit', 'plant visits'],
    metrics: [
      { label: 'Parking error', unit: 'cm', decimals: 1, group: 'parking', key: 'parking_error_cm',
        compute: (d) => stat(reached(d).map((v) => num(v, 'parking_error_cm'))) },
      { label: 'Time to reach a plant', unit: 's', decimals: 1, group: 'parking', key: 'time_to_reach_s',
        compute: (d) => stat(reached(d).map((v) => num(v, 'time_to_reach_s'))) },
      { label: 'Plants reached', unit: '%', decimals: 0, group: 'parking', key: 'reach_pct',
        compute: (d) => rate(d.visits.map((v) => isTrue(v.reached))) },
    ],
    chart: { title: 'Average parking error per trial', unit: 'cm', kind: 'trial',
      points: perTrial('parking_error_cm') },
  },
  {
    id: 'camera', title: 'Arm photo clarity', section: 'diagnosis', noun: ['photo', 'photos'],
    metrics: [
      { label: 'Sharp photos', unit: '%', decimals: 0, group: 'camera', key: 'sharp_pct',
        compute: (d) => rate(d.captures.map((c) => isTrue(c.sharp))) },
      { label: 'Sharpness score', unit: '', decimals: 0, group: 'camera', key: 'sharpness',
        compute: (d) => stat(d.captures.map((c) => num(c, 'sharpness'))) },
    ],
    note: () => 'Sharpness score is the variance of the image Laplacian: higher is sharper.',
  },
  {
    id: 'llm', title: 'Gemini consistency', section: 'diagnosis', noun: ['plant', 'plants'],
    metrics: [
      { label: 'Same answer when asked again', unit: '%', decimals: 0, group: 'llm', key: 'agreement_pct',
        compute: col('llm', 'agreement_pct') },
    ],
    chart: { title: 'Agreement per plant', unit: '%', kind: 'run',
      points: (d) => validRows(d.components.llm)
        .map((r) => ({ name: r.plant || 'plant', value: num(r, 'agreement_pct') }))
        .filter((p): p is { name: string; value: number } => p.value !== null) },
  },
  {
    id: 'diagnosis', title: 'Diagnosis accuracy', section: 'diagnosis', noun: ['checked visit', 'checked visits'],
    metrics: [
      { label: 'Gemini diagnosis correct', unit: '%', decimals: 0, group: 'diagnosis', key: 'accuracy_pct',
        compute: (d) => rate(labelled(d).map((v) => v.gemini_health === v.true_health)) },
    ],
    note: (d) => {
      const missing = reached(d).length - labelled(d).length;
      return missing > 0 ? `${missing} visits still need a true answer — see Ground truth below.` : null;
    },
  },
];

export interface MetricValue {
  stat: ResultStat | null;
  /** Whether the number came from the robot's /export or from the rows here. */
  source: 'export' | 'rows';
  /** Runs recorded since the export was built, so it no longer covers them. */
  newerRuns: number;
}

function isStat(v: unknown): v is ResultStat {
  return !!v && typeof v === 'object' && typeof (v as ResultStat).mean === 'number';
}

export function metricValue(m: MetricDef, data: EvalData, results: ExportResults | null): MetricValue {
  const scale = m.scale ?? 1;
  const fromExport = results?.[m.group]?.[m.key];
  const local = m.compute(data);
  const raw = isStat(fromExport) ? fromExport : local;
  const source: MetricValue['source'] = isStat(fromExport) ? 'export' : 'rows';
  const newerRuns = isStat(fromExport) && local ? Math.max(0, local.n - fromExport.n) : 0;
  if (!raw) return { stat: null, source, newerRuns };
  return {
    source,
    newerRuns,
    stat: { mean: raw.mean * scale, std: raw.std === null ? null : raw.std * scale, n: raw.n },
  };
}

export function formatStat(s: ResultStat | null, unit: string, decimals: number): string {
  if (!s) return '—';
  const sep = unit === '%' || unit === '°' || unit === '' ? '' : ' ';
  const mean = s.mean.toFixed(decimals);
  if (s.std === null || s.n < 2) return `${mean}${sep}${unit}`;
  return `${mean} ± ${s.std.toFixed(decimals)}${sep}${unit}`;
}
