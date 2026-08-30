import React from 'react';
import { MapPin, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import {
  PlantDetection,
  IdConfidence,
  sizeProfile,
  lifeCycle,
  temperatureBand,
  seedBand,
  formatDays,
  formatDaysAsSpan,
  formatLength,
  formatRangeMm,
  formatRate,
  formatTempRange,
  formatWater,
  DASH,
} from '@/lib/plant-analysis';
import { HudPlacement } from '@/lib/hud-layout';

interface PlantDetailsHUDProps {
  plant: PlantDetection;
  placement: HudPlacement;
  /** Used to keep SVG gradient ids unique when several plants are on screen. */
  index: number;
}

const confidenceTone = (confidence: IdConfidence) => {
  if (confidence === 'HIGH') {
    return { text: 'text-emerald-300', border: 'border-emerald-400/60', Icon: ShieldCheck };
  }
  if (confidence === 'MEDIUM') {
    return { text: 'text-amber-300', border: 'border-amber-400/60', Icon: ShieldAlert };
  }
  return { text: 'text-rose-300', border: 'border-rose-400/60', Icon: ShieldQuestion };
};

/** One reference figure. Missing figures show a dash rather than a guess. */
const StatCell: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="min-w-0" title={label + ': ' + value}>
    <div className="text-white/40 font-mono text-[7px] tracking-[0.12em] uppercase truncate">{label}</div>
    <div className="flex items-baseline gap-1 min-w-0">
      <span
        className={
          'font-mono text-[10px] font-bold truncate ' + (value === DASH ? 'text-white/30' : 'text-teal-200')
        }
      >
        {value}
      </span>
      {sub ? <span className="text-white/35 font-mono text-[7px] shrink-0">{sub}</span> : null}
    </div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center justify-between gap-2 mb-1">
    <span className="text-teal-300/60 font-mono text-[7px] tracking-[0.2em] uppercase truncate">{children}</span>
    {right ? <span className="text-white/35 font-mono text-[7px] shrink-0">{right}</span> : null}
  </div>
);

/** A value range drawn on a labelled axis (temperature band, seed size). */
const BandChart: React.FC<{
  startPct: number;
  widthPct: number;
  minLabel: string;
  maxLabel: string;
  barClass: string;
}> = ({ startPct, widthPct, minLabel, maxLabel, barClass }) => (
  <div>
    <div className="h-1.5 bg-white/10 rounded-full relative overflow-hidden">
      <div
        className={'absolute top-0 h-full rounded-full ' + barClass}
        style={{ left: startPct + '%', width: widthPct + '%' }}
      />
    </div>
    <div className="flex justify-between text-white/30 font-mono text-[6px] mt-0.5">
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
);

export const PlantDetailsHUD: React.FC<PlantDetailsHUDProps> = ({ plant, placement, index }) => {
  const { box, panel, side, variant, anchor } = placement;
  const { profile, condition } = plant;

  const showProfile = variant !== 'compact';
  const showCharts = variant !== 'compact';
  const showExtras = variant === 'full';

  const tone = confidenceTone(plant.confidence);
  const ConfidenceIcon = tone.Icon;

  // Connector: box edge -> short diagonal -> horizontal run into the panel.
  const targetY = panel.top + 22;
  const endX = side === 'right' ? panel.left : panel.left + panel.width;
  const elbowX = side === 'right' ? anchor.x + 22 : anchor.x - 22;
  const gradientId = 'hudLineGrad-' + index;

  const sizes = sizeProfile(profile);
  const cycle = lifeCycle(profile);
  const tempBand = temperatureBand(profile);
  const seeds = seedBand(profile);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Target Box with Corner Brackets */}
      <div
        className="absolute transition-all duration-500 ease-out z-10 animate-fade-in-down"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
      >
        <div className="absolute inset-0 animate-[bracket-breathe_2.5s_ease-in-out_infinite]">
          {/* Top Left Bracket */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-[5px] border-l-[5px] border-teal-400 rounded-tl-lg shadow-[0_0_15px_rgba(45,212,191,0.8)]"></div>
          {/* Top Right Bracket */}
          <div className="absolute top-0 right-0 w-10 h-10 border-t-[5px] border-r-[5px] border-teal-400 rounded-tr-lg shadow-[0_0_15px_rgba(45,212,191,0.8)]"></div>
          {/* Bottom Left Bracket */}
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[5px] border-l-[5px] border-teal-400 rounded-bl-lg shadow-[0_0_15px_rgba(45,212,191,0.8)]"></div>
          {/* Bottom Right Bracket */}
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[5px] border-r-[5px] border-teal-400 rounded-br-lg shadow-[0_0_15px_rgba(45,212,191,0.8)]"></div>

          {/* Inner subtle glow */}
          <div className="absolute inset-0 bg-teal-400/10 border border-teal-400/30 rounded-xl"></div>

          {/* Center Reticle (High-tech overlay) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-70 pointer-events-none">
            <div className="w-12 h-[1px] bg-teal-400 shadow-[0_0_5px_#2dd4bf]"></div>
            <div className="absolute h-12 w-[1px] bg-teal-400 shadow-[0_0_5px_#2dd4bf]"></div>
            <div className="absolute w-4 h-4 rounded-full border border-teal-400 animate-pulse shadow-[0_0_5px_#2dd4bf]"></div>
          </div>
        </div>
      </div>

      {/* Connector from the box edge to whichever side the panel landed on */}
      <svg className="absolute inset-0 w-full h-full z-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(45,212,191,0.8)" />
            <stop offset="100%" stopColor="rgba(217,70,239,0.8)" />
          </linearGradient>
        </defs>
        <path
          d={'M ' + anchor.x + ' ' + anchor.y + ' L ' + elbowX + ' ' + targetY + ' L ' + endX + ' ' + targetY}
          fill="none"
          stroke={'url(#' + gradientId + ')'}
          strokeWidth="2.3"
          className="drop-shadow-[0_0_8px_rgba(217,70,239,1)] animate-draw-line"
        />
        <circle cx={anchor.x} cy={anchor.y} r="4" fill="#d946ef" className="animate-pulse" />
      </svg>

      {/* HUD Panel — height is reserved by the layout solver, so it never spills */}
      <div
        className="absolute flex flex-col gap-1.5 p-3 bg-teal-950/70 backdrop-blur-xl border-2 border-teal-400/60 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(45,212,191,0.2)] z-20 transition-all duration-500 ease-out animate-fade-in-down-delayed pointer-events-auto overflow-y-auto overflow-x-hidden"
        style={{ top: panel.top, left: panel.left, width: panel.width, maxHeight: panel.height }}
      >
        {/* Identification */}
        <div className="flex flex-col gap-0.5 border-b-2 border-teal-400/60 pb-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-white font-mono text-[10px] font-bold uppercase tracking-[0.15em] truncate"
              title={plant.label}
            >
              {plant.label}
            </span>
            {plant.confidence ? (
              <span
                className={
                  'flex items-center gap-0.5 font-mono text-[8px] shrink-0 px-1 py-0.5 rounded border ' +
                  tone.text +
                  ' ' +
                  tone.border
                }
                title={'Identification confidence: ' + plant.confidence}
              >
                <ConfidenceIcon className="w-2.5 h-2.5" />
                {plant.confidence}
              </span>
            ) : null}
          </div>
          {plant.scientificName || plant.family ? (
            <span className="text-teal-300/70 font-mono text-[8px] truncate">
              <span className="italic">{plant.scientificName}</span>
              {plant.scientificName && plant.family ? ' · ' : ''}
              {plant.family}
            </span>
          ) : null}
        </div>

        {/* Visible condition — words, because nothing here is measured */}
        {condition.status ? (
          <div>
            <SectionLabel>Visible condition</SectionLabel>
            <div className="text-amber-200 font-mono text-[9px] font-bold tracking-wide leading-tight">
              {condition.status}
            </div>
            {showExtras && condition.observations.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {condition.observations.map((note, i) => (
                  <li key={i} className="flex gap-1 text-white/60 font-mono text-[8px] leading-tight">
                    <span className="text-teal-400/50">›</span>
                    <span className="line-clamp-2">{note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Species reference figures */}
        <div className="border-t border-teal-400/25 pt-1.5">
          <SectionLabel>Species data</SectionLabel>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatCell
              label="Life span"
              value={formatDays(profile.lifespanDays)}
              sub={formatDaysAsSpan(profile.lifespanDays)}
            />
            <StatCell label="Avg height" value={formatLength(profile.heightCm)} />
            <StatCell label="Avg diameter" value={formatLength(profile.spreadCm)} />
            <StatCell label="Avg girth" value={formatLength(profile.girthCm)} />
            {showProfile ? (
              <>
                <StatCell label="Seed size" value={formatRangeMm(profile.seedMinMm, profile.seedMaxMm)} />
                <StatCell label="Growth rate" value={formatRate(profile.growthRateCmPerYear)} />
              </>
            ) : null}
            {showExtras ? (
              <>
                <StatCell label="Optimal temp" value={formatTempRange(profile.tempMinC, profile.tempMaxC)} />
                <StatCell label="Water need" value={formatWater(profile.waterMlPerWeek)} />
              </>
            ) : null}
          </div>
        </div>

        {/* Mature size, plotted on one shared centimetre scale */}
        {showCharts && sizes.length > 0 ? (
          <div className="border-t border-teal-400/25 pt-1.5">
            <SectionLabel right={'max ' + sizes[0].text}>Mature size</SectionLabel>
            <div className="flex flex-col gap-1">
              {sizes.map((bar) => (
                <div key={bar.label} className="flex items-center gap-1.5" title={bar.label + ': ' + bar.text}>
                  <span className="text-white/40 font-mono text-[7px] w-11 shrink-0 truncate">{bar.label}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-400/80 rounded-full transition-[width] duration-700"
                      style={{ width: bar.pct + '%' }}
                    />
                  </div>
                  <span className="text-teal-200 font-mono text-[8px] w-11 text-right shrink-0">{bar.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Lifespan axis with the time-to-maturity marker */}
        {showCharts && cycle ? (
          <div className="border-t border-teal-400/25 pt-1.5">
            <SectionLabel right={formatDaysAsSpan(cycle.spanDays)}>Life cycle</SectionLabel>
            <div className="h-1.5 bg-white/10 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-emerald-400/70 rounded-full"
                style={{ width: (cycle.maturityPct !== null ? cycle.maturityPct : 100) + '%' }}
                title={
                  cycle.maturityDays !== null ? 'To maturity: ' + formatDays(cycle.maturityDays) : 'Lifespan'
                }
              />
              {cycle.maturityPct !== null ? (
                <div
                  className="absolute top-0 h-full w-[2px] bg-fuchsia-400"
                  style={{ left: cycle.maturityPct + '%' }}
                />
              ) : null}
            </div>
            <div className="flex justify-between text-white/30 font-mono text-[6px] mt-0.5">
              <span>seed</span>
              {cycle.maturityDays !== null ? (
                <span className="text-fuchsia-300/70">mature {formatDays(cycle.maturityDays)}</span>
              ) : null}
              <span>{formatDays(cycle.spanDays)}</span>
            </div>
          </div>
        ) : null}

        {/* Preferred climate band and seed size, each on its own axis */}
        {showExtras && (tempBand || seeds) ? (
          <div className="border-t border-teal-400/25 pt-1.5 flex flex-col gap-1.5">
            {tempBand ? (
              <div>
                <SectionLabel right={tempBand.text}>Optimal temp</SectionLabel>
                <BandChart
                  startPct={tempBand.startPct}
                  widthPct={tempBand.widthPct}
                  minLabel={tempBand.min + '°C'}
                  maxLabel={tempBand.max + '°C'}
                  barClass="bg-amber-400/80"
                />
              </div>
            ) : null}
            {seeds ? (
              <div>
                <SectionLabel right={seeds.text}>Seed size</SectionLabel>
                <BandChart
                  startPct={seeds.startPct}
                  widthPct={seeds.widthPct}
                  minLabel={seeds.min + ' mm'}
                  maxLabel={seeds.max + ' mm'}
                  barClass="bg-cyan-400/80"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Where it grows in Sri Lanka */}
        {showExtras && profile.sriLankaZones ? (
          <div
            className="flex items-start gap-1 text-[8px] font-mono text-emerald-300/80 border-t border-teal-400/25 pt-1.5"
            title="Usual area in Sri Lanka"
          >
            <MapPin className="w-2.5 h-2.5 mt-px shrink-0" />
            <span className="line-clamp-2 leading-tight">{profile.sriLankaZones}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
