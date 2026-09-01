'use client';

import React from 'react';
import { useDetections } from '@/hooks/useDetections';
import { Target, Scan, Navigation, AlertCircle } from 'lucide-react';
import { DetectedObject } from '@/types/ros';

export const DetectionTable: React.FC = () => {
  const { detections, gotoStatus, selectGotoTarget, stopGoto } = useDetections();

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Target className="w-4 h-4 text-blue-400" />
            <span>YOLOv8 Objects Detected</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold text-xs">
            {detections.length}
          </span>
        </div>

        {/* Goto Status Banner */}
        {gotoStatus.status !== 'IDLE' && (
          <div className="mb-3 p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="text-xs text-blue-300 font-medium">
                Visual Servoing: <span className="font-bold text-white">{gotoStatus.status}</span>
              </span>
            </div>
            <button
              onClick={stopGoto}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded font-semibold transition-colors"
            >
              Cancel Goto
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-card-border">
                <th className="pb-2 font-medium">Class</th>
                <th className="pb-2 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Distance</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {detections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No objects detected in field of view
                  </td>
                </tr>
              ) : (
                detections.map((det, idx) => (
                  <tr key={idx} className="hover:bg-card-border/30 transition-colors">
                    <td className="py-2 font-semibold text-foreground capitalize flex items-center gap-1.5">
                      <Scan className="w-3.5 h-3.5 text-blue-400" />
                      {det.class_name}
                    </td>
                    <td className="py-2 font-mono text-muted-foreground">
                      {(det.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 font-mono text-emerald-400">
                      {det.distance ? `${det.distance.toFixed(2)} m` : '--'}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => selectGotoTarget(det)}
                        className="inline-flex items-center gap-1 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white px-2 py-0.5 rounded text-[11px] font-medium transition-all"
                      >
                        <Navigation className="w-3 h-3" />
                        Approach
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-card-border flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Clicking &apos;Approach&apos; will automatically steer & park robot 40cm away.</span>
      </div>
    </div>
  );
};
