'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

const STORAGE_KEY = 'ecobot_eval_method_open';

const RULES: Array<[string, string]> = [
  ['The truth comes from you, not the robot.',
    "Its own sensors are what is being tested; the wheel counters, for one, report about half of a real turn. Measure with a tape measure or protractor, and for plants say what each one really is and how healthy it is."],
  ['Repeat everything.',
    'One run could be lucky. With about 10 runs you can report an average (the typical result) and a spread (how much it varies). A small spread means the robot is consistent.'],
  ['Keep the failures.',
    'A failed run is still evidence. The robot records why each plant failed, and that shows what needs fixing.'],
];

const TERMS: Array<[string, string]> = [
  ['Success rate', 'How many times it worked out of how many tries: reached 9 of 10 plants is 90%.'],
  ['Error', 'The gap between what it should have done and what it really did: stopped 8 cm from the target.'],
  ['Average ± spread', 'The typical result, and how much it varies between runs (the standard deviation).'],
  ['Precision', 'Of the things the robot called plants, how many really were. Low precision means it chases chairs and bins.'],
  ['Recall', 'Of the real plants in the room, how many it found. Low recall means it misses plants.'],
  ['Accuracy', "How often Gemini's plant name and health match what you wrote in the ground truth."],
  ['Sharpness', 'A number for how clear a photo is. Use it to compare photos (higher is clearer); it is not a pass mark.'],
];

const TIPS = [
  'Change one thing at a time, such as distance or lighting, so you know what caused a difference.',
  'Write down the conditions: floor type, lighting, battery level and the date.',
  "Don't help the robot during a patrol. If you have to step in, note it: it counts as a failure.",
  'Use real plants in different places, not the same spot every time.',
];

/** The evaluation method in brief, so the numbers below can be read right. */
export const MethodPanel: React.FC = () => {
  const [open, setOpen] = useState(true);

  // Remember whether it was folded away; it is reading for the first visit.
  useEffect(() => {
    try { if (localStorage.getItem(STORAGE_KEY) === '0') setOpen(false); } catch { /* no storage */ }
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(STORAGE_KEY, o ? '0' : '1'); } catch { /* no storage */ }
      return !o;
    });
  };

  return (
    <section id="method" className="bg-card border border-card-border rounded-xl shadow-sm scroll-mt-4">
      <button onClick={toggle} aria-expanded={open}
              className="w-full flex items-center gap-2 p-4 text-left">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground flex-1">How the evaluation works</h3>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-[11px] text-muted-foreground leading-snug">
            One question, answered with numbers: how well does EcoBot do its job, and where does it go wrong?
            Part tests check each part alone, so a failure points at the part that caused it. Full patrols check
            the whole robot doing the real job. Ground truth then shows whether the plant reports were right,
            and the export gathers everything into tables and summary numbers.
          </p>

          <div className="grid gap-2 md:grid-cols-3">
            {RULES.map(([title, body], i) => (
              <div key={title} className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs font-semibold text-foreground">{i + 1}. {title}</div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-1">{body}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                The numbers
              </h4>
              <dl className="space-y-1.5">
                {TERMS.map(([term, def]) => (
                  <div key={term} className="text-[11px] leading-snug">
                    <dt className="inline font-semibold text-foreground">{term}: </dt>
                    <dd className="inline text-muted-foreground">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                For a fair evaluation
              </h4>
              <ul className="space-y-1.5 list-disc pl-4">
                {TIPS.map((t) => <li key={t} className="text-[11px] text-muted-foreground leading-snug">{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
