'use client';

import React from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

/**
 * One series, one hue. The brand teal (#00E5C0) is too light to read as a
 * mark on the light theme, so charts use a deeper step of it that holds
 * contrast on both the light and dark card surfaces.
 */
const MARK = '#0F9F8A';
const AXIS = '#94a3b8';
const GRID = 'rgba(148, 163, 184, 0.18)';

export interface Point { name: string; value: number }

const ChartTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string; unit: string }> = ({
  active, payload, label, unit,
}) => {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0].value);
  return (
    <div className="bg-card border border-card-border rounded-md px-2 py-1 shadow-sm text-[11px]">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono text-foreground">{v.toFixed(2)} {unit}</div>
    </div>
  );
};

export const RunChart: React.FC<{
  points: Point[];
  unit: string;
  kind: 'run' | 'trial';
  /** Dashed line at the mean, so each run reads against the average. */
  mean?: number;
}> = ({ points, unit, kind, mean }) => {
  if (points.length === 0) {
    return <p className="text-[11px] text-muted-foreground py-6 text-center">No runs to chart yet.</p>;
  }
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 10 }} tickLine={false}
             axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={8} />
      <YAxis tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
      <Tooltip content={<ChartTooltip unit={unit} />}
               cursor={{ fill: 'rgba(148, 163, 184, 0.12)', stroke: GRID }} />
      {mean !== undefined && (
        <ReferenceLine y={mean} stroke={AXIS} strokeDasharray="3 3" />
      )}
    </>
  );
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'trial' ? (
          <LineChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            {axes}
            <Line type="monotone" dataKey="value" stroke={MARK} strokeWidth={2}
                  dot={{ r: 4, fill: MARK, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        ) : (
          <BarChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap={4}>
            {axes}
            <Bar dataKey="value" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
