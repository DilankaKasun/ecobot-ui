'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Leaf, ArrowLeft, AlertTriangle, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { getReport, PlantReport } from '@/hooks/usePlantReports';

const HEALTH_TONE: Record<string, string> = {
  healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
  stressed: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
  diseased: 'text-rose-400 bg-rose-500/10 border-rose-500/40',
  dead: 'text-rose-500 bg-rose-500/15 border-rose-500/50',
  unknown: 'text-muted-foreground bg-gray-500/10 border-gray-500/30',
};

/** Turns snake_case keys into readable labels. */
function label(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const Section: React.FC<{
  title: string; data?: Record<string, string>; children?: React.ReactNode;
}> = ({ title, data, children }) => {
  const rows = data ? Object.entries(data).filter(([, v]) => v) : [];
  if (!rows.length && !children) return null;
  return (
    <section className="bg-card border border-card-border rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {rows.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {label(k)}
              </dt>
              <dd className="text-sm text-foreground leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
};

const Bullets: React.FC<{
  title: string; items?: string[]; icon: React.ElementType; tone: string;
}> = ({ title, items, icon: Icon, tone }) => {
  if (!items?.length) return null;
  return (
    <section className="bg-card border border-card-border rounded-xl p-5 space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={`w-4 h-4 ${tone}`} />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground leading-snug">
            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${tone.replace('text-', 'bg-')}`} />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<PlantReport | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // HARDCODED DATA FOR SCREENSHOTS
    setReport({
      id: "hardcoded-1",
      at: new Date('2026-08-31T16:02:17').getTime(), // 8/31/2026, 4:02:17 PM
      health: 'stressed',
      confidence: 0.8,
      notes: "The plant shows significant interveinal chlorosis on several leaves, indicating a possible nutrient deficiency, such as magnesium or iron.",
      identification: {
        common_name: 'Pepper',
        scientific_name: 'Capsicum annuum',
        family: 'Solanaceae',
        confidence_rating: 'medium'
      },
      visible_condition: {
        overall_health: 'stressed',
        leaf_colour_and_condition: 'Many leaves exhibit interveinal chlorosis, where the veins remain green but the tissue between them turns yellow.',
        stem_and_foliage_structure: 'The plant is tied to a support stake. Stems appear green and intact.'
      },
      symptoms: [
        'interveinal chlorosis on leaves',
        'yellowing between leaf veins'
      ],
      treatments: [
        'Check soil pH to ensure nutrients are available.',
        'Apply a fertilizer containing micronutrients, specifically magnesium or iron, depending on soil test results.'
      ],
      species_data: {
        life_span: 'Perennial, often grown as an annual',
        average_height: '0.5 - 1.5 meters',
        growth_rate: 'Fast',
        optimal_temperature: '21-29°C',
        water_need: 'Moderate to high, requires well-drained soil'
      },
      habitat: {
        climate_or_zones: 'Tropical to subtropical, USDA zones 9-11',
        indoor_potted_context: 'Can be grown in pots indoors or outdoors with sufficient light and warmth.'
      },
      photos: []
    } as any);
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Opening the report…</div>;
  }

  if (!report) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm text-muted-foreground">
          That report is not in this browser.
        </p>
        <p className="text-xs text-muted-foreground max-w-prose">
          Reports are kept in the browser that watched the run, not on the
          robot — so they will not appear on another machine, in a private
          window, or after site data is cleared.
        </p>
        <Link href="/mission" className="inline-flex items-center gap-1.5 text-xs text-primary">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to the run
        </Link>
      </div>
    );
  }

  const tone = HEALTH_TONE[report.health] ?? HEALTH_TONE.unknown;
  const ident = report.identification ?? {};
  const name = ident.common_name || ident.scientific_name || 'Plant';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <Link href="/mission" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the run
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Leaf className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
            <p className="text-xs text-muted-foreground">
              Scanned {new Date(report.at).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold uppercase ${tone}`}>
          {report.health}
          {report.confidence > 0 && ` · ${(report.confidence * 100).toFixed(0)}%`}
        </span>
      </header>

      {report.notes && (
        <p className="text-sm text-foreground bg-card border border-card-border rounded-xl p-5 leading-relaxed">
          {report.notes}
        </p>
      )}

      {urls.length > 0 && (
        <section className="bg-card border border-card-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Photographs ({urls.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {urls.map((u, i) => (
              <figure key={u} className="space-y-1">
                {/* Blob URLs from the robot; next/image cannot optimise these. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={report.photos[i]?.label ?? `view ${i + 1}`}
                     className="w-full aspect-[4/3] object-cover rounded-lg border border-card-border" />
                <figcaption className="text-[10px] text-muted-foreground font-mono truncate">
                  {report.photos[i]?.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <Section title="Identification & Classification" data={report.identification} />
      <Section title="Visible Condition" data={report.visible_condition} />

      <Bullets title="Symptoms seen" items={report.symptoms ?? report.issues}
               icon={AlertTriangle} tone="text-amber-400" />
      <Bullets title="Possible treatments" items={report.treatments}
               icon={Stethoscope} tone="text-sky-400" />

      <Section title="Species Data" data={report.species_data} />
      <Section title="Mature Size & Life Cycle" data={report.mature_size} />
      <Section title="Location & Habitat Notes" data={report.habitat} />

      <p className="text-[11px] text-gray-600 leading-snug max-w-prose">
        Only what the assessment was reasonably sure of is shown. Sections
        and fields it could not support are left out rather than filled in,
        so a gap here means the question was not answered — not that the
        answer was nothing.
      </p>
    </div>
  );
}
