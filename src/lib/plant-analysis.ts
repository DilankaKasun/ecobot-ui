/**
 * Shared shape for a single AI-identified plant coming back from `/api/segment`.
 *
 * Ground rule: nothing here is invented. A figure is either something Gemini
 * actually returned, or it is null and renders as a dash. There are no seeded
 * stand-ins, no simulated sensor percentages and no fabricated history — the
 * robot has no soil probe or light meter, so the overlay never pretends to.
 */

export type IdConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | '';

/** What can honestly be said from looking at the plant. Words, not percentages. */
export interface PlantCondition {
  /** Short verdict on visible state, e.g. "LOWER-LEAF YELLOWING". */
  status: string;
  /** Specific things visible in frame. */
  observations: string[];
}

/**
 * Species-level reference figures for a mature specimen — established botanical
 * knowledge, not measurements of the individual in frame. Every numeric field is
 * nullable: when Gemini isn't confident it omits the figure and we show a dash.
 */
export interface PlantProfile {
  lifespanDays: number | null;
  heightCm: number | null;
  /** Canopy / foliage diameter. */
  spreadCm: number | null;
  /** Stem or trunk girth (circumference). */
  girthCm: number | null;
  seedMinMm: number | null;
  seedMaxMm: number | null;
  growthRateCmPerYear: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  waterMlPerWeek: number | null;
  /** Where in Sri Lanka the species is usually grown or found. */
  sriLankaZones: string;
  nativeRange: string;
}

export interface PlantDetection {
  id: string;
  label: string;
  scientificName: string;
  family: string;
  confidence: IdConfidence;
  box_2d: number[];
  mask?: number[][];
  condition: PlantCondition;
  profile: PlantProfile;
  /** 2-3 sentence botanical readout for the sidebar. */
  description: string;
  careTips: string[];
}

/** Finite numbers only; anything else (null, "unknown", NaN) becomes null. */
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return isFinite(num) ? num : null;
};

/** For measurements, where a zero or negative reading means "not provided". */
const toPositive = (value: unknown): number | null => {
  const num = toNumber(value);
  return num !== null && num > 0 ? num : null;
};

const toText = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

const toStringArray = (value: unknown, limit: number): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (let i = 0; i < value.length && out.length < limit; i++) {
    const entry = value[i];
    if (typeof entry === 'string' && entry.trim()) out.push(entry.trim());
  }
  return out;
};

const toConfidence = (value: unknown): IdConfidence => {
  const text = toText(value).toUpperCase();
  return text === 'HIGH' || text === 'MEDIUM' || text === 'LOW' ? text : '';
};

const isValidBox = (box: unknown): box is number[] =>
  Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === 'number' && isFinite(n));

const normalizeProfile = (raw: any): PlantProfile => {
  const p = raw || {};
  let seedMin = toPositive(p.seed_size_min_mm);
  let seedMax = toPositive(p.seed_size_max_mm);
  if (seedMin !== null && seedMax !== null && seedMin > seedMax) {
    const swap = seedMin;
    seedMin = seedMax;
    seedMax = swap;
  }

  let tempMin = toNumber(p.optimal_temp_min_c);
  let tempMax = toNumber(p.optimal_temp_max_c);
  if (tempMin !== null && tempMax !== null && tempMin > tempMax) {
    const swap = tempMin;
    tempMin = tempMax;
    tempMax = swap;
  }

  return {
    lifespanDays: toPositive(p.lifespan_days),
    heightCm: toPositive(p.average_height_cm),
    spreadCm: toPositive(p.average_spread_cm),
    girthCm: toPositive(p.average_girth_cm),
    seedMinMm: seedMin,
    seedMaxMm: seedMax,
    growthRateCmPerYear: toPositive(p.growth_rate_cm_per_year),
    tempMinC: tempMin,
    tempMaxC: tempMax,
    waterMlPerWeek: toPositive(p.water_need_ml_per_week),
    sriLankaZones: toText(p.sri_lanka_zones),
    nativeRange: toText(p.native_range),
  };
};

/** Turns the raw `/api/segment` items into detections, dropping malformed ones. */
export function normalizePlantDetections(raw: any[]): PlantDetection[] {
  if (!Array.isArray(raw)) return [];

  const out: PlantDetection[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || !isValidBox(item.box_2d)) continue;

    const label = toText(item.label) || 'Unknown Plant';
    const condition = item.condition || {};

    out.push({
      id: `${label}-${i}-${item.box_2d.join('_')}`,
      label,
      scientificName: toText(item.scientific_name),
      family: toText(item.family),
      confidence: toConfidence(item.id_confidence),
      box_2d: item.box_2d,
      mask: Array.isArray(item.mask) ? item.mask : undefined,
      condition: {
        status: toText(condition.status).toUpperCase(),
        observations: toStringArray(condition.observations, 3),
      },
      profile: normalizeProfile(item.profile),
      description: toText(item.description),
      careTips: toStringArray(item.care_tips, 3),
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const DASH = '—';

export const formatLength = (cm: number | null): string => {
  if (cm === null) return DASH;
  if (cm >= 100) return (cm / 100).toFixed(cm >= 1000 ? 0 : 1) + ' m';
  if (cm >= 10) return Math.round(cm) + ' cm';
  return Math.round(cm * 10) / 10 + ' cm';
};

export const formatDays = (days: number | null): string =>
  days === null ? DASH : Math.round(days).toLocaleString() + ' d';

/** Secondary, human-scale reading of a span in days. */
export const formatDaysAsSpan = (days: number | null): string => {
  if (days === null) return '';
  if (days >= 365) {
    const years = days / 365;
    return '≈ ' + (years >= 10 ? Math.round(years) : Math.round(years * 10) / 10) + ' yr';
  }
  if (days >= 60) return '≈ ' + Math.round(days / 30) + ' mo';
  return '';
};

export const formatRangeMm = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return DASH;
  if (min !== null && max !== null) {
    const lo = Math.round(min * 10) / 10;
    const hi = Math.round(max * 10) / 10;
    return lo === hi ? lo + ' mm' : lo + '–' + hi + ' mm';
  }
  return Math.round(((min ?? max) as number) * 10) / 10 + ' mm';
};

export const formatRate = (cmPerYear: number | null): string =>
  cmPerYear === null ? DASH : Math.round(cmPerYear) + ' cm/yr';

export const formatTempRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return DASH;
  if (min !== null && max !== null) return Math.round(min) + '–' + Math.round(max) + '°C';
  return Math.round((min ?? max) as number) + '°C';
};

export const formatWater = (mlPerWeek: number | null): string => {
  if (mlPerWeek === null) return DASH;
  if (mlPerWeek >= 1000) return Math.round(mlPerWeek / 100) / 10 + ' L/wk';
  return Math.round(mlPerWeek) + ' ml/wk';
};

/* ------------------------------------------------------------------ */
/* Chart inputs — each one is a direct plot of returned figures         */
/* ------------------------------------------------------------------ */

export interface SizeBar {
  label: string;
  /** Centimetres, as returned. */
  value: number;
  text: string;
  /** Share of the largest dimension, for the bar length. */
  pct: number;
}

/**
 * Mature height / spread / girth on one shared centimetre scale. Dimensions the
 * model didn't provide are simply left out of the chart.
 */
export function sizeProfile(profile: PlantProfile): SizeBar[] {
  const entries: Array<{ label: string; value: number | null }> = [
    { label: 'Height', value: profile.heightCm },
    { label: 'Diameter', value: profile.spreadCm },
    { label: 'Girth', value: profile.girthCm },
  ];

  const present = entries.filter((e): e is { label: string; value: number } => e.value !== null);
  if (!present.length) return [];

  const max = Math.max.apply(
    Math,
    present.map((e) => e.value)
  );

  return present.map((e) => ({
    label: e.label,
    value: e.value,
    text: formatLength(e.value),
    pct: max > 0 ? Math.max(2, (e.value / max) * 100) : 0,
  }));
}

/**
 * Years to reach mature height at the stated growth rate. Straight division of
 * two returned figures — no growth model assumed.
 */
export function daysToMaturity(profile: PlantProfile): number | null {
  if (profile.heightCm === null || profile.growthRateCmPerYear === null) return null;
  return (profile.heightCm / profile.growthRateCmPerYear) * 365;
}

export interface LifeCycle {
  spanDays: number;
  maturityDays: number | null;
  /** Maturity as a percentage along the lifespan axis. */
  maturityPct: number | null;
}

/** Lifespan axis with the time-to-maturity marker, when both figures exist. */
export function lifeCycle(profile: PlantProfile): LifeCycle | null {
  if (profile.lifespanDays === null) return null;
  const maturity = daysToMaturity(profile);
  const spanDays = maturity !== null ? Math.max(profile.lifespanDays, maturity) : profile.lifespanDays;
  return {
    spanDays,
    maturityDays: maturity,
    maturityPct: maturity !== null && spanDays > 0 ? Math.min(100, (maturity / spanDays) * 100) : null,
  };
}

export interface ScaleBand {
  /** Axis bounds actually drawn. */
  min: number;
  max: number;
  /** Band position along the axis, 0-100. */
  startPct: number;
  widthPct: number;
  text: string;
}

/** Optimal temperature band drawn against a fixed 0-45 °C axis. */
export function temperatureBand(profile: PlantProfile): ScaleBand | null {
  const { tempMinC, tempMaxC } = profile;
  if (tempMinC === null && tempMaxC === null) return null;

  const AXIS_MIN = 0;
  const AXIS_MAX = 45;
  const lo = Math.max(AXIS_MIN, Math.min(AXIS_MAX, tempMinC ?? (tempMaxC as number)));
  const hi = Math.max(AXIS_MIN, Math.min(AXIS_MAX, tempMaxC ?? (tempMinC as number)));
  const span = AXIS_MAX - AXIS_MIN;

  return {
    min: AXIS_MIN,
    max: AXIS_MAX,
    startPct: ((lo - AXIS_MIN) / span) * 100,
    widthPct: Math.max(2, ((hi - lo) / span) * 100),
    text: formatTempRange(tempMinC, tempMaxC),
  };
}

/** Seed size range drawn against an axis sized to the species. */
export function seedBand(profile: PlantProfile): ScaleBand | null {
  const { seedMinMm, seedMaxMm } = profile;
  if (seedMinMm === null && seedMaxMm === null) return null;

  const lo = seedMinMm ?? (seedMaxMm as number);
  const hi = seedMaxMm ?? (seedMinMm as number);
  // Round the axis up to something readable: 5, 10, 25, 50 or 100 mm.
  const STEPS = [5, 10, 25, 50, 100];
  let axisMax = STEPS[STEPS.length - 1];
  for (let i = 0; i < STEPS.length; i++) {
    if (hi <= STEPS[i]) {
      axisMax = STEPS[i];
      break;
    }
  }
  if (hi > STEPS[STEPS.length - 1]) axisMax = Math.ceil(hi / 50) * 50;

  return {
    min: 0,
    max: axisMax,
    startPct: (lo / axisMax) * 100,
    widthPct: Math.max(2, ((hi - lo) / axisMax) * 100),
    text: formatRangeMm(seedMinMm, seedMaxMm),
  };
}
