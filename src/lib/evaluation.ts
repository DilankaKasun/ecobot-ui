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

/** The parts of the robot, in the order the evaluation walks through them. */
export type SectionId = 'startup' | 'wheels' | 'sensors' | 'arm' | 'navigation' | 'mission' | 'whole';

export const SECTIONS: Array<{ id: SectionId; title: string }> = [
  { id: 'startup', title: 'Start-up' },
  { id: 'wheels', title: 'Wheels' },
  { id: 'sensors', title: 'Sensors' },
  { id: 'arm', title: 'Arm' },
  { id: 'navigation', title: 'Navigation' },
  { id: 'mission', title: 'Mission' },
  { id: 'whole', title: 'Whole robot' },
];

export interface ChecklistStep {
  id: string;
  title: string;
  /** The question the test answers, in plain words. */
  what: string;
  target: number;
  /** What one run is called: "runs", "distances", ... */
  unit: string;
  /** Run on the robot; absent for plant patrols, which start from /mission. */
  command?: string;
  /** What has to be measured by hand for the run to mean anything. */
  measure?: string;
  section: SectionId;
}

const test = (name: string) => `ros2 run ecobot_mission component_test ${name}`;

export const CHECKLIST: ChecklistStep[] = [
  { id: 'hardware', section: 'startup', title: 'Hardware check', target: 1, unit: 'run',
    command: test('hardware'), what: 'Is everything connected and working before we start?' },
  { id: 'turn', section: 'wheels', title: 'Turn on the spot', target: 5, unit: 'runs',
    command: test('turn'), what: 'When told to turn 90°, how far does it really turn?',
    measure: 'Measure the real angle with a protractor or floor marks.' },
  { id: 'line', section: 'wheels', title: 'Drive straight', target: 5, unit: 'runs',
    command: test('line'), what: 'When told to go 2 m, how far does it go, and does it drift sideways?',
    measure: 'Tape-measure how far it went and how far it drifted sideways.' },
  { id: 'square', section: 'wheels', title: 'Square', target: 5, unit: 'runs',
    command: test('square'), what: 'After four sides and four turns, does it end where it started?',
    measure: 'Mark the start on the floor and tape-measure the gap at the end.' },
  { id: 'obstacle', section: 'sensors', title: 'Obstacle stop', target: 10, unit: 'runs',
    command: test('obstacle'), what: 'Does it stop before hitting something, and how far short?',
    measure: 'Tape-measure the gap between the robot and the obstacle.' },
  { id: 'tof', section: 'sensors', title: 'Distance sensors', target: 10, unit: 'readings',
    command: test('tof'), what: 'Do the close-range sensors read the right distance?',
    measure: 'Tape-measure the real distance to the target for each reading.' },
  { id: 'yolo', section: 'sensors', title: 'Plant detector', target: 1, unit: 'image set',
    command: test('yolo'), what: 'Does the camera find plants and not mistake other things for plants?' },
  { id: 'arm', section: 'arm', title: 'Arm scan', target: 10, unit: 'scans',
    command: test('arm'), what: 'Does the scan finish, how long does it take, and are the photos sharp with the plant in frame?' },
  { id: 'goto', section: 'navigation', title: 'Nav2 to a point', target: 10, unit: 'runs',
    command: test('goto'), what: 'Does the map driver reach a marked spot, and how close?',
    measure: 'Tape-measure from the robot to the marked spot.' },
  { id: 'map', section: 'navigation', title: 'SLAM map accuracy', target: 5, unit: 'distances',
    command: test('map'), what: 'Does a distance on the map match the same distance in the room?',
    measure: 'Tape-measure the distance in the room.' },
  { id: 'llm', section: 'mission', title: 'Gemini repeatability', target: 5, unit: 'plants',
    command: test('llm'), what: 'Asked about the same photos 5 times, does Gemini give the same answer?' },
  { id: 'trials', section: 'whole', title: 'Plant patrol', target: 10, unit: 'patrols',
    what: 'Does the whole job work from start to finish?',
    measure: "Don't help the robot. If you have to step in, note it: that plant counts as a failure." },
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
  /** What its count is of, when that differs from the card's. */
  noun?: [string, string];
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
  /** "A good result looks like", from the evaluation method. */
  good: string;
  /**
   * Whether the result meets `good`, given the displayed headline values in
   * metric order. Only for targets that are a number; the rest are judged
   * by whoever writes the report.
   */
  meets?: (means: Array<number | null>) => boolean | null;
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
      name: `Patrol ${i + 1}`,
      value: by[t].reduce((a, b) => a + b, 0) / by[t].length,
    }));
  };
}

const col = (component: string, key: string, filter?: (r: Row) => boolean) =>
  (d: EvalData) => stat(validRows(d.components[component])
    .filter((r) => (filter ? filter(r) : true)).map((r) => num(r, key)));

const flag = (component: string, key: string) =>
  (d: EvalData) => rate(validRows(d.components[component]).map((r) => isTrue(r[key])));

/** Scored once on a whole set; the latest row is the answer. */
const latest = (component: string, key: string) => (d: EvalData): ResultStat | null => {
  const rows = d.components[component] ?? [];
  const v = rows.length ? num(rows[rows.length - 1], key) : null;
  return v === null ? null : { mean: v, std: null, n: 1 };
};

const same = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

const reached = (d: EvalData) => d.visits.filter((v) => isTrue(v.reached));
/** A plant counts as done when it was reached and Gemini reported on it. */
export const reported = (v: Row) => isTrue(v.reached) && (v.gemini_health ?? '') !== '';

/** The four answers the ground-truth sheet asks for on each visited plant. */
export const TRUTH_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'is_plant', label: 'Really a plant' },
  { key: 'true_name', label: 'Real name' },
  { key: 'true_health', label: 'Real health' },
  { key: 'photos_clear', label: 'Photos clear enough' },
];

export function truthMissing(v: Row): string[] {
  // Once someone says it was not a plant, the name and health do not apply.
  const notPlant = (v.is_plant ?? '').trim().toLowerCase() === 'false';
  return TRUTH_FIELDS
    .filter((f) => !(notPlant && (f.key === 'true_name' || f.key === 'true_health')))
    .filter((f) => (v[f.key] ?? '').trim() === '')
    .map((f) => f.label);
}

/** Visits Gemini can be marked against: a real plant with the answer filled in. */
const judged = (d: EvalData, key: string) =>
  d.visits.filter(reported).filter((v) => isTrue(v.is_plant) && (v[key] ?? '') !== '');

const lessThan = (limit: number) => (x: number | null) => (x === null ? null : x <= limit);
const everyTime = (x: number | null) => (x === null ? null : x >= 99.95);

export const CARDS: CardDef[] = [
  {
    id: 'hardware', title: 'Hardware check', section: 'startup', noun: ['check', 'checks'],
    good: 'All passed, no failures.',
    metrics: [
      { label: 'Checks passed (latest run)', unit: '%', decimals: 0, group: 'hardware', key: 'passed_pct',
        compute: (d) => {
          const rows = validRows(d.components.hardware);
          const r = rows[rows.length - 1];
          const total = r ? num(r, 'checks') : null;
          const ok = r ? num(r, 'passed') : null;
          return total && ok !== null ? { mean: (100 * ok) / total, std: null, n: total } : null;
        } },
    ],
    meets: ([pct]) => everyTime(pct),
    note: (d) => {
      const rows = validRows(d.components.hardware);
      const r = rows[rows.length - 1];
      if (!r) return null;
      return r.failures ? `Failed: ${r.failures.split(';').join(', ')}.` : 'Nothing failed.';
    },
  },
  {
    id: 'turn', title: 'Turn on the spot', section: 'wheels',
    good: 'Close to 90°.',
    metrics: [
      { label: 'Turn error', unit: '°', decimals: 1, group: 'turn', key: 'error_deg',
        compute: col('turn', 'error_deg') },
      { label: 'Correction number (yaw scale)', unit: '', decimals: 3, group: 'turn', key: 'yaw_scale',
        // How much to multiply the commanded angle by to get the angle asked for.
        compute: (d) => stat(validRows(d.components.turn).map((r) => {
          const cmd = num(r, 'commanded_deg');
          const real = num(r, 'turned_deg');
          return cmd && real ? Math.abs(cmd / real) : null;
        })) },
    ],
    meets: ([err]) => lessThan(5)(err),
    chart: { title: 'Turn error per run', unit: '°', kind: 'run', points: perRun('turn', 'error_deg') },
    note: () => 'Turn error counts as close at 5° or less. A correction number above 1 means it turns short.',
  },
  {
    id: 'line', title: 'Drive straight', section: 'wheels',
    good: 'Within a few cm; little drift.',
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
    id: 'square', title: 'Square', section: 'wheels',
    good: 'A small gap from the start mark.',
    metrics: [
      { label: 'Gap from the start mark', unit: 'cm', decimals: 1, group: 'square', key: 'closure_error_cm',
        compute: col('square', 'closure_error_cm') },
    ],
    chart: { title: 'Gap from the start mark per run', unit: 'cm', kind: 'run',
      points: perRun('square', 'closure_error_cm') },
  },
  {
    id: 'obstacle', title: 'Obstacle stop', section: 'sensors',
    good: 'Stops every time, at a safe distance.',
    metrics: [
      { label: 'Stopped in time', unit: '%', decimals: 0, group: 'obstacle', key: 'stop_pct',
        compute: flag('obstacle', 'stopped') },
      { label: 'Stopping distance', unit: 'cm', decimals: 1, group: 'obstacle', key: 'stop_distance_m',
        scale: 100, compute: col('obstacle', 'stop_distance_m', (r) => isTrue(r.stopped)) },
    ],
    meets: ([pct]) => everyTime(pct),
    chart: { title: 'Stopping distance per run', unit: 'cm', kind: 'run',
      points: (d) => perRun('obstacle', 'stop_distance_m', (r) => isTrue(r.stopped))(d)
        .map((p) => ({ name: p.name, value: p.value * 100 })) },
  },
  {
    id: 'tof', title: 'Distance sensors', section: 'sensors', noun: ['reading', 'readings'],
    good: 'Readings close to the tape measure.',
    metrics: [
      { label: 'Reading error', unit: 'cm', decimals: 1, group: 'tof', key: 'error_cm',
        compute: col('tof', 'error_cm') },
    ],
    chart: { title: 'Error per reading', unit: 'cm', kind: 'run',
      points: (d) => validRows(d.components.tof)
        .map((r) => ({ name: `${r.sensor} ${r.true_distance_m} m`, value: num(r, 'error_cm') }))
        .filter((p): p is { name: string; value: number } => p.value !== null) },
  },
  {
    id: 'yolo', title: 'Plant detector', section: 'sensors', noun: ['image set', 'image sets'],
    good: 'High precision and recall.',
    metrics: [
      { label: 'Precision', unit: '%', decimals: 1, group: 'yolo', key: 'precision', scale: 100,
        compute: latest('yolo', 'precision') },
      { label: 'Recall', unit: '%', decimals: 1, group: 'yolo', key: 'recall', scale: 100,
        compute: latest('yolo', 'recall') },
      { label: 'F1 score (both together)', unit: '%', decimals: 1, group: 'yolo', key: 'f1', scale: 100,
        compute: latest('yolo', 'f1') },
    ],
    note: (d) => {
      const rows = d.components.yolo ?? [];
      const r = rows[rows.length - 1];
      if (!r) return null;
      return `${r.images} images: ${r.true_positives} plants found, ${r.false_positives} other things taken for plants, ${r.false_negatives} plants missed.`;
    },
  },
  {
    id: 'arm', title: 'Arm scan', section: 'arm', noun: ['scan', 'scans'],
    good: 'Finishes every time; most photos show the plant.',
    metrics: [
      { label: 'Scans finished', unit: '%', decimals: 0, group: 'arm', key: 'finished_pct',
        compute: flag('arm', 'finished') },
      { label: 'Time per scan', unit: 's', decimals: 1, group: 'arm', key: 'duration_s',
        compute: col('arm', 'duration_s', (r) => isTrue(r.finished)) },
      { label: 'Photos showing the plant', unit: '%', decimals: 0, group: 'arm', key: 'in_frame_pct',
        compute: (d) => stat(validRows(d.components.arm).map((r) => {
          const n = num(r, 'photos');
          const k = num(r, 'photos_with_plant');
          return n && k !== null ? (100 * k) / n : null;
        })) },
      { label: 'Sharpness of patrol photos', unit: '', decimals: 0, group: 'camera', key: 'sharpness',
        noun: ['photo', 'photos'], compute: (d) => stat(d.captures.map((c) => num(c, 'sharpness'))) },
    ],
    meets: ([finished, , inFrame]) =>
      finished === null || inFrame === null ? null : finished >= 99.95 && inFrame > 50,
    chart: { title: 'Time per finished scan', unit: 's', kind: 'run',
      points: perRun('arm', 'duration_s', (r) => isTrue(r.finished)) },
    note: (d) => {
      const fails = validRows(d.components.arm).filter((r) => !isTrue(r.finished));
      const why = fails.map((r) => r.reason).filter(Boolean);
      return `Sharpness compares photos with each other (higher is clearer); it is not a pass mark.${
        why.length ? ` Unfinished scans: ${why.join('; ')}.` : ''}`;
    },
  },
  {
    id: 'goto', title: 'Nav2 to a point', section: 'navigation',
    good: 'Arrives every time, within about 25 cm.',
    metrics: [
      { label: 'Arrived', unit: '%', decimals: 0, group: 'goto', key: 'success_pct',
        compute: flag('goto', 'reached') },
      { label: 'Distance from the spot (when it arrived)', unit: 'cm', decimals: 1, group: 'goto',
        key: 'position_error_cm', compute: col('goto', 'position_error_cm', (r) => isTrue(r.reached)) },
    ],
    meets: ([pct, err]) => (pct === null || err === null ? null : pct >= 99.95 && err <= 25),
    chart: { title: 'Distance from the spot per run that arrived', unit: 'cm', kind: 'run',
      points: perRun('goto', 'position_error_cm', (r) => isTrue(r.reached)) },
  },
  {
    id: 'map', title: 'SLAM map accuracy', section: 'navigation', noun: ['distance', 'distances'],
    good: 'Map distances close to the tape measure.',
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
    id: 'llm', title: 'Gemini repeatability', section: 'mission', noun: ['plant', 'plants'],
    good: 'The same health rating each time.',
    metrics: [
      { label: 'Same answer when asked again', unit: '%', decimals: 0, group: 'llm', key: 'agreement_pct',
        compute: col('llm', 'agreement_pct') },
    ],
    meets: ([pct]) => everyTime(pct),
    chart: { title: 'Agreement per plant', unit: '%', kind: 'run',
      points: (d) => validRows(d.components.llm)
        .map((r) => ({ name: r.plant || 'plant', value: num(r, 'agreement_pct') }))
        .filter((p): p is { name: string; value: number } => p.value !== null) },
  },
  {
    id: 'diagnosis', title: 'Gemini accuracy', section: 'mission', noun: ['checked plant', 'checked plants'],
    good: "Gemini's name and health match your ground truth.",
    metrics: [
      { label: 'Health correct', unit: '%', decimals: 0, group: 'diagnosis', key: 'health_pct',
        compute: (d) => rate(judged(d, 'true_health').map((v) => same(v.gemini_health, v.true_health))) },
      { label: 'Plant name correct', unit: '%', decimals: 0, group: 'diagnosis', key: 'name_pct',
        compute: (d) => rate(judged(d, 'true_name').map((v) => same(v.gemini_name, v.true_name))) },
      { label: 'Visits that were really plants', unit: '%', decimals: 0, group: 'diagnosis', key: 'is_plant_pct',
        compute: (d) => rate(d.visits.filter(reported).filter((v) => (v.is_plant ?? '') !== '').map((v) => isTrue(v.is_plant))) },
    ],
    note: (d) => {
      const missing = d.visits.filter(reported).filter((v) => truthMissing(v).length > 0).length;
      return missing > 0 ? `${missing} scanned plants still need ground truth; see below.` : null;
    },
  },
  {
    id: 'patrol', title: 'Plant patrol', section: 'whole', noun: ['plant', 'plants'],
    good: 'Most plants scanned and reported correctly.',
    metrics: [
      { label: 'Plants scanned and reported', unit: '%', decimals: 0, group: 'patrol', key: 'reported_pct',
        compute: (d) => rate(d.visits.map(reported)) },
      { label: 'Plants reached', unit: '%', decimals: 0, group: 'parking', key: 'reach_pct',
        compute: (d) => rate(d.visits.map((v) => isTrue(v.reached))) },
    ],
    meets: ([pct]) => (pct === null ? null : pct > 50),
    note: (d) => {
      // Failures are evidence: say what went wrong, most common first.
      const counts: Record<string, number> = {};
      d.visits.filter((v) => !reported(v)).forEach((v) => {
        const why = (v.failure_reason || 'no reason recorded').trim();
        counts[why] = (counts[why] ?? 0) + 1;
      });
      const list = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      return list.length ? `Why plants failed: ${list.map((k) => `${k} (${counts[k]})`).join(', ')}.` : 'No plant failed.';
    },
  },
  {
    id: 'parking', title: 'Parking at a plant', section: 'whole', noun: ['plant visit', 'plant visits'],
    good: 'Parks close to the plant, quickly.',
    metrics: [
      { label: 'Parking error', unit: 'cm', decimals: 1, group: 'parking', key: 'parking_error_cm',
        compute: (d) => stat(reached(d).map((v) => num(v, 'parking_error_cm'))) },
      { label: 'Time to reach a plant', unit: 's', decimals: 1, group: 'parking', key: 'time_to_reach_s',
        compute: (d) => stat(reached(d).map((v) => num(v, 'time_to_reach_s'))) },
    ],
    chart: { title: 'Average parking error per patrol', unit: 'cm', kind: 'trial',
      points: perTrial('parking_error_cm') },
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
