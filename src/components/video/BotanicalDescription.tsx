import React, { useState, useEffect } from 'react';
import { Database, ScanSearch, MapPin, Globe2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import {
  PlantDetection,
  IdConfidence,
  formatDays,
  formatDaysAsSpan,
  formatLength,
  formatRangeMm,
  formatRate,
  formatTempRange,
  formatWater,
  DASH,
} from '@/lib/plant-analysis';

interface BotanicalDescriptionProps {
  plant: PlantDetection;
  /** Staggers the typewriter when several specimens are logged at once. */
  index?: number;
}

const confidenceTone = (confidence: IdConfidence) => {
  if (confidence === 'HIGH') return { text: 'text-emerald-400', Icon: ShieldCheck };
  if (confidence === 'MEDIUM') return { text: 'text-amber-400', Icon: ShieldAlert };
  return { text: 'text-rose-400', Icon: ShieldQuestion };
};

const Figure: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="min-w-0">
    <div className="text-green-400/40 text-[8px] tracking-[0.12em] uppercase font-normal truncate">{label}</div>
    <div className="flex items-baseline gap-1 min-w-0">
      <span className={'text-[11px] truncate ' + (value === DASH ? 'text-green-400/30' : 'text-green-300')}>
        {value}
      </span>
      {sub ? <span className="text-green-400/40 text-[8px] font-normal shrink-0">{sub}</span> : null}
    </div>
  </div>
);

export const BotanicalDescription: React.FC<BotanicalDescriptionProps> = ({ plant, index = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullText = plant.description;
  const tone = confidenceTone(plant.confidence);
  const ConfidenceIcon = tone.Icon;

  useEffect(() => {
    setDisplayText('');
    setIsTyping(true);
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;

    // Randomize typing speed slightly for realism
    const typeNext = () => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        setIsTyping(false);
      } else {
        timeout = setTimeout(typeNext, Math.random() * 20 + 20); // 20-40ms per char
      }
    };

    timeout = setTimeout(typeNext, 200 + index * 250); // Initial delay, staggered per specimen

    return () => clearTimeout(timeout);
  }, [fullText, index]);

  return (
    <div className="font-mono text-green-400 text-sm font-bold leading-relaxed flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 mb-1 border-b border-green-400/30 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <ScanSearch className="w-5 h-5 text-green-400 animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-green-400 font-black tracking-widest uppercase truncate" title={plant.label}>
              {plant.label}
            </span>
            {plant.scientificName || plant.family ? (
              <span className="text-green-400/50 text-[10px] font-normal truncate">
                <span className="italic">{plant.scientificName}</span>
                {plant.scientificName && plant.family ? ' · ' : ''}
                {plant.family}
              </span>
            ) : null}
          </div>
        </div>
        {plant.confidence ? (
          <span
            className={'flex items-center gap-1 text-[9px] shrink-0 tracking-widest ' + tone.text}
            title={'Identification confidence: ' + plant.confidence}
          >
            <ConfidenceIcon className="w-3 h-3" />
            {plant.confidence}
          </span>
        ) : null}
      </div>

      {/* What is actually visible in frame */}
      {plant.condition.status ? (
        <div className="flex flex-col gap-1">
          <span className="text-green-400/40 text-[8px] tracking-[0.12em] uppercase font-normal">
            Visible condition
          </span>
          <span className="text-amber-300 text-[11px] tracking-wide">{plant.condition.status}</span>
          {plant.condition.observations.length > 0 && (
            <ul className="flex flex-col gap-0.5 mt-0.5">
              {plant.condition.observations.map((note, i) => (
                <li key={i} className="flex gap-1.5 text-green-400/70 text-[10px] font-normal leading-snug">
                  <span className="text-green-400/40">›</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p className="flex-1 tracking-wide">
        {displayText}
        {isTyping && <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse align-middle"></span>}
      </p>

      {/* Reference figures for the identified species; a dash means "not known" */}
      <div className="border-t border-green-400/20 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Figure
          label="Life span"
          value={formatDays(plant.profile.lifespanDays)}
          sub={formatDaysAsSpan(plant.profile.lifespanDays)}
        />
        <Figure label="Avg height" value={formatLength(plant.profile.heightCm)} />
        <Figure label="Avg diameter" value={formatLength(plant.profile.spreadCm)} />
        <Figure label="Avg girth" value={formatLength(plant.profile.girthCm)} />
        <Figure label="Seed size" value={formatRangeMm(plant.profile.seedMinMm, plant.profile.seedMaxMm)} />
        <Figure label="Growth rate" value={formatRate(plant.profile.growthRateCmPerYear)} />
        <Figure label="Optimal temp" value={formatTempRange(plant.profile.tempMinC, plant.profile.tempMaxC)} />
        <Figure label="Water need" value={formatWater(plant.profile.waterMlPerWeek)} />
      </div>

      {plant.profile.sriLankaZones ? (
        <div className="flex items-start gap-1.5 text-[10px] font-normal text-green-300/80" title="Usual area in Sri Lanka">
          <MapPin className="w-3 h-3 mt-px shrink-0 text-green-400/60" />
          <span className="leading-snug">{plant.profile.sriLankaZones}</span>
        </div>
      ) : null}

      {plant.profile.nativeRange ? (
        <div className="flex items-start gap-1.5 text-[10px] font-normal text-green-400/60" title="Native range">
          <Globe2 className="w-3 h-3 mt-px shrink-0" />
          <span className="leading-snug">{plant.profile.nativeRange}</span>
        </div>
      ) : null}

      {!isTyping && plant.careTips.length > 0 && (
        <ul className="flex flex-col gap-1 text-green-400/80 text-[10px] font-normal">
          {plant.careTips.map((tip, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-green-400/50">&gt;</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {!isTyping && (
        <div className="flex items-center gap-2 text-green-400/70 border-t border-green-400/20 pt-2 mt-auto">
          <Database className="w-3 h-3" />
          <span className="text-[9px]">ECOLOGICAL DB LINKED</span>
        </div>
      )}
    </div>
  );
};
