import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_SEGMENT_MODEL || 'gemini-robotics-er-1.6-preview';

const DEFAULT_PROMPT =
  'Give the segmentation masks for the prominent, distinct physical objects in this image ' +
  '(people, vehicles, furniture, tools, equipment, plants, animals, packages, obstacles). ' +
  'Output ONLY a valid JSON array. Each entry MUST contain all three keys: "box_2d" as ' +
  '[ymin, xmin, ymax, xmax], "mask" as the contour polygon [[y, x], ...], and "label" as a ' +
  'short descriptive string. All coordinates normalized to 0-1000. Do not add comments or ' +
  'trailing text.';

export interface SegObject {
  label: string;
  /** [x0, y0, x1, y1] normalized 0..1 */
  box: [number, number, number, number];
  /** polygon outline as [[x, y], ...] normalized 0..1, or null when unavailable */
  polygon: [number, number][] | null;
  /** data:image/png;base64 mask (drawn inside box) when the model returns a raster mask */
  pngMask: string | null;
}

/** Pull a list of objects out of a (possibly malformed) model text response. */
function extractJsonArray(text: string): any[] | null {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  const slice = start !== -1 && end > start ? t.slice(start, end + 1) : t;

  // 1) strict
  try {
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  // 2) lenient: strip trailing commas + collapse duplicate closing braces
  try {
    const fixed = slice
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/}\s*}\s*(?=,|\s*\])/g, '}');
    const parsed = JSON.parse(fixed);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  // 3) salvage: parse each top-level {...} block independently
  const out: any[] = [];
  const re = /\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice)) !== null) {
    try {
      out.push(JSON.parse(m[0].replace(/,\s*}/g, '}')));
    } catch {
      /* skip */
    }
  }
  return out.length ? out : null;
}

/**
 * Normalize the many mask shapes the Gemini family returns:
 *  - [[y, x], [y, x], ...]                    (robotics-er-1.6)
 *  - [y, x, y, x, ...]                        (flat)
 *  - [[y,x,y,x,...], [y,x,...]]               (robotics-er-2, chunked)
 *  - "y,x,y,x,..."                            (string)
 *  - "data:image/png;base64,...."             (gemini-3.x flash)
 *  - "<start_of_mask><seg_NN>..."             (2.5-flash VQ tokens -> unusable)
 */
function normalizeMask(mask: any): { polygon: [number, number][] | null; pngMask: string | null } {
  if (mask == null) return { polygon: null, pngMask: null };

  if (typeof mask === 'string') {
    const s = mask.trim();
    if (s.startsWith('data:image')) return { polygon: null, pngMask: s };
    if (s.includes('<seg_') || s.includes('start_of_mask')) return { polygon: null, pngMask: null };
    const nums = s.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n));
    return { polygon: pairsToPolygon(nums), pngMask: null };
  }

  if (Array.isArray(mask)) {
    // Array of [y, x] pairs
    if (mask.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'))) {
      return { polygon: (mask as number[][]).map(([y, x]) => clampPair(x, y)), pngMask: null };
    }
    // Array of chunks -> flatten
    if (mask.every((p) => Array.isArray(p))) {
      const flat: number[] = ([] as number[]).concat(...mask.map((c: any[]) => c.map(Number)));
      return { polygon: pairsToPolygon(flat), pngMask: null };
    }
    // Flat number array [y, x, y, x, ...]
    if (mask.every((n) => typeof n === 'number')) {
      return { polygon: pairsToPolygon(mask as number[]), pngMask: null };
    }
  }

  return { polygon: null, pngMask: null };
}

function pairsToPolygon(nums: number[]): [number, number][] | null {
  if (!nums || nums.length < 6) return null;
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    // model emits y,x order (matches box_2d ymin,xmin)
    out.push(clampPair(nums[i + 1], nums[i]));
  }
  return out.length >= 3 ? out : null;
}

function clampPair(x: number, y: number): [number, number] {
  return [Math.min(1, Math.max(0, x / 1000)), Math.min(1, Math.max(0, y / 1000))];
}

function normalizeBox(box: any): [number, number, number, number] | null {
  if (!Array.isArray(box) || box.length < 4) return null;
  const [ymin, xmin, ymax, xmax] = box.map(Number);
  if (![ymin, xmin, ymax, xmax].every(Number.isFinite)) return null;
  const x0 = Math.min(xmin, xmax) / 1000;
  const y0 = Math.min(ymin, ymax) / 1000;
  const x1 = Math.max(xmin, xmax) / 1000;
  const y1 = Math.max(ymin, ymax) / 1000;
  return [
    Math.min(1, Math.max(0, x0)),
    Math.min(1, Math.max(0, y0)),
    Math.min(1, Math.max(0, x1)),
    Math.min(1, Math.max(0, y1)),
  ];
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { image, prompt, model, mimeType } = body || {};
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Missing "image" (base64 or data URL).' }, { status: 400 });
  }

  const base64 = image.includes(',') ? image.slice(image.indexOf(',') + 1) : image;
  const mime =
    mimeType ||
    (image.startsWith('data:') ? image.slice(5, image.indexOf(';')) : 'image/jpeg');
  const useModel = (typeof model === 'string' && model.trim()) || DEFAULT_MODEL;
  const userPrompt = (typeof prompt === 'string' && prompt.trim()) || DEFAULT_PROMPT;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mime, data: base64 } },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };

  let gRes: Response;
  try {
    gRes = await fetch(`${GEMINI_ENDPOINT}/${useModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      // give slow models room, but don't hang forever
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Gemini request failed: ${e?.message || e}`, latencyMs: Date.now() - started },
      { status: 502 },
    );
  }

  const gJson: any = await gRes.json().catch(() => ({}));
  if (!gRes.ok || gJson.error) {
    return NextResponse.json(
      {
        error: gJson?.error?.message || `Gemini HTTP ${gRes.status}`,
        latencyMs: Date.now() - started,
      },
      { status: gRes.status === 429 ? 429 : 502 },
    );
  }

  const text: string =
    gJson?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? '';
  const rawList = extractJsonArray(text) || [];

  const objects: SegObject[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const box = normalizeBox(item.box_2d ?? item.box ?? item.bbox);
    if (!box) continue;
    const { polygon, pngMask } = normalizeMask(item.mask ?? item.segmentation);
    objects.push({
      label: String(item.label ?? item.name ?? 'object').slice(0, 60),
      box,
      polygon,
      pngMask,
    });
  }

  return NextResponse.json({
    objects,
    model: useModel,
    latencyMs: Date.now() - started,
    tokens: gJson?.usageMetadata?.totalTokenCount ?? null,
    ...(objects.length === 0 && text ? { note: 'Model returned no parseable objects', raw: text.slice(0, 500) } : {}),
  });
}
