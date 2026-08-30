/**
 * Placement solver for the AR plant overlays.
 *
 * Panels used to be pinned to the right of every bounding box, so two plants
 * side by side meant two stacked panels. Here each panel picks the side, the
 * vertical offset and the size variant that cost the least overlap against the
 * panels already placed, the detection boxes, the surrounding dashboard UI, and
 * the edges of the viewport. Panels are always fully on-screen.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Size variants, largest first. Smaller ones drop chart sections. */
export type HudVariant = 'full' | 'medium' | 'compact';

export interface HudPlacement {
  /** Bracket box in pixels (already extended downwards to cover the pot). */
  box: Rect;
  /** Where the info panel should sit, in pixels. Never leaves the viewport. */
  panel: Rect;
  side: 'left' | 'right';
  variant: HudVariant;
  /** Point on the box where the connector line starts. */
  anchor: { x: number; y: number };
}

/** Rendered panel heights — kept in sync with PlantDetailsHUD's sections. */
export const HUD_VARIANT_HEIGHTS: { full: number; medium: number; compact: number } = {
  full: 510,
  medium: 330,
  compact: 184,
};

export const HUD_PANEL_MAX_WIDTH = 264;
export const HUD_PANEL_MIN_WIDTH = 186;

const VARIANTS: HudVariant[] = ['full', 'medium', 'compact'];
/** Prefer a bigger panel, but not at the price of real overlap. */
const VARIANT_PENALTY: { full: number; medium: number; compact: number } = {
  full: 0,
  medium: 16000,
  compact: 42000,
};

const GAP = 30;
const EDGE = 8;
/** Vertical offsets tried relative to the top of the box, best-first. */
const OFFSETS = [-40, -6, -110, 40, -180, 100, 170, -250];

const overlapArea = (a: Rect, b: Rect): number => {
  const x = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const y = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (x <= 0 || y <= 0) return 0;
  return x * y;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function panelWidthFor(viewWidth: number): number {
  return Math.round(clamp(viewWidth * 0.21, HUD_PANEL_MIN_WIDTH, HUD_PANEL_MAX_WIDTH));
}

export interface LayoutOptions {
  /** Dashboard chrome the panels should try not to cover, in container pixels. */
  obstacles?: Rect[];
}

/**
 * @param boxes normalized [ymin, xmin, ymax, xmax] boxes (0-1000), in the order
 *              they should be drawn. Result is index-aligned with the input.
 */
export function layoutPlantHuds(
  boxes: number[][],
  viewWidth: number,
  viewHeight: number,
  options?: LayoutOptions
): HudPlacement[] {
  const obstacles = (options && options.obstacles) || [];
  const panelWidth = Math.min(panelWidthFor(viewWidth), Math.max(120, viewWidth - 2 * EDGE));
  const maxPanelHeight = Math.max(120, viewHeight - 2 * EDGE);

  const boxRects: Rect[] = boxes.map((box) => {
    const top = clamp((box[0] / 1000) * viewHeight, 0, viewHeight);
    const left = clamp((box[1] / 1000) * viewWidth, 0, viewWidth);
    const rawBottom = clamp((box[2] / 1000) * viewHeight, 0, viewHeight);
    const right = clamp((box[3] / 1000) * viewWidth, 0, viewWidth);
    // Extend downwards by 50% so the brackets frame the pot as well.
    const bottom = Math.min(viewHeight, rawBottom + Math.max(0, rawBottom - top) * 0.5);
    return {
      top,
      left,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  });

  // Place the largest (nearest) plants first — they get the roomiest slots.
  const order = boxRects
    .map((rect, index) => ({ index, area: rect.width * rect.height }))
    .sort((a, b) => b.area - a.area)
    .map((entry) => entry.index);

  const placements: HudPlacement[] = new Array(boxRects.length);
  const placedPanels: Rect[] = [];

  for (let o = 0; o < order.length; o++) {
    const index = order[o];
    const box = boxRects[index];
    const boxCenter = box.left + box.width / 2;

    const roomRight = viewWidth - (box.left + box.width) - GAP - EDGE;
    const roomLeft = box.left - GAP - EDGE;
    const rightFits = roomRight >= panelWidth;
    const leftFits = roomLeft >= panelWidth;

    let preferred: 'left' | 'right';
    if (rightFits && leftFits) {
      preferred = boxCenter <= viewWidth / 2 ? 'right' : 'left';
    } else if (rightFits) {
      preferred = 'right';
    } else if (leftFits) {
      preferred = 'left';
    } else {
      preferred = roomRight >= roomLeft ? 'right' : 'left';
    }

    // Columns the panel may occupy: beside the box on either side, flush with
    // either frame edge, and the middle — so crowded frames can tile panels
    // across instead of stacking them on top of each other.
    const maxLeft = Math.max(EDGE, viewWidth - panelWidth - EDGE);
    const columns: Array<{ left: number; penalty: number }> = [];
    const addColumn = (rawLeft: number, base: number, columnSide: 'left' | 'right') => {
      const left = clamp(rawLeft, EDGE, maxLeft);
      // How far we had to drag the panel back on-screen.
      const penalty = base + (columnSide === preferred ? 0 : 9000) + Math.abs(rawLeft - left) * 150;
      const rounded = Math.round(left);
      for (let i = 0; i < columns.length; i++) {
        if (Math.abs(Math.round(columns[i].left) - rounded) < 12) {
          if (penalty < columns[i].penalty) columns[i] = { left, penalty };
          return;
        }
      }
      columns.push({ left, penalty });
    };

    addColumn(box.left + box.width + GAP, 0, 'right');
    addColumn(box.left - GAP - panelWidth, 0, 'left');
    addColumn(maxLeft, 1500, 'right');
    addColumn(EDGE, 1500, 'left');
    addColumn((viewWidth - panelWidth) / 2, 7000, boxCenter <= viewWidth / 2 ? 'right' : 'left');

    type Candidate = { rect: Rect; side: 'left' | 'right'; variant: HudVariant; cost: number };
    // Ranked buckets: a slot that collides with nothing wins over any amount of
    // cost tuning, and a panel-on-panel collision is worse than covering chrome.
    let best: Candidate | null = null;
    let bestNoPanel: Candidate | null = null;
    let bestNoUi: Candidate | null = null;
    let bestClear: Candidate | null = null;

    for (let v = 0; v < VARIANTS.length; v++) {
      const variant = VARIANTS[v];
      const naturalHeight = HUD_VARIANT_HEIGHTS[variant];
      // Skip a variant that cannot fit the viewport unless it is our last resort.
      if (naturalHeight > maxPanelHeight && variant !== 'compact') continue;
      const panelHeight = Math.min(naturalHeight, maxPanelHeight);

      for (let c = 0; c < columns.length; c++) {
        const column = columns[c];
        const left = column.left;
        // The connector leaves whichever edge of the box faces the panel.
        const side: 'left' | 'right' = left + panelWidth / 2 >= boxCenter ? 'right' : 'left';

        for (let f = 0; f < OFFSETS.length; f++) {
          const top = clamp(box.top + OFFSETS[f], EDGE, Math.max(EDGE, viewHeight - panelHeight - EDGE));
          const rect: Rect = { left, top, width: panelWidth, height: panelHeight };

          let cost = column.penalty + f * 2600 + VARIANT_PENALTY[variant];
          for (let b = 0; b < boxRects.length; b++) {
            // Covering another plant's brackets is worse than covering its own.
            cost += overlapArea(rect, boxRects[b]) * (b === index ? 1 : 1.6);
          }

          let panelOverlap = 0;
          for (let p = 0; p < placedPanels.length; p++) panelOverlap += overlapArea(rect, placedPanels[p]);
          cost += panelOverlap * 4;

          let uiOverlap = 0;
          for (let u = 0; u < obstacles.length; u++) uiOverlap += overlapArea(rect, obstacles[u]);
          cost += uiOverlap * 4.5;

          const candidate: Candidate = { rect, side, variant, cost };
          if (!best || cost < best.cost) best = candidate;
          if (panelOverlap === 0 && (!bestNoPanel || cost < bestNoPanel.cost)) bestNoPanel = candidate;
          if (uiOverlap === 0 && (!bestNoUi || cost < bestNoUi.cost)) bestNoUi = candidate;
          if (panelOverlap === 0 && uiOverlap === 0 && (!bestClear || cost < bestClear.cost)) {
            bestClear = candidate;
          }
        }
      }
    }

    // Collision-free first, then avoid stacking panels, then avoid the chrome.
    best = bestClear || bestNoPanel || bestNoUi || best;

    const fallbackHeight = Math.min(HUD_VARIANT_HEIGHTS.compact, maxPanelHeight);
    const panel = best ? best.rect : { left: EDGE, top: EDGE, width: panelWidth, height: fallbackHeight };
    const side = best ? best.side : 'right';
    const variant = best ? best.variant : 'compact';

    // Anchor on the box edge facing the panel, level with the panel header.
    const anchorX = side === 'right' ? box.left + box.width : box.left;
    const anchorY = clamp(panel.top + 22, box.top, box.top + box.height);

    placements[index] = { box, panel, side, variant, anchor: { x: anchorX, y: anchorY } };
    placedPanels.push(panel);
  }

  return placements;
}
