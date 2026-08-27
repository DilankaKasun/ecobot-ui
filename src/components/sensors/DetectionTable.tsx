'use client';

import React from 'react';
import { useDetections } from '@/hooks/useDetections';
import { Target, Scan, Navigation, AlertCircle } from 'lucide-react';
import { DetectedObject } from '@/types/ros';

export const DetectionTable: React.FC = () => {
  const { detections, gotoStatus, selectGotoTarget, stopGoto } = useDetections();

  const depthOf = (det: DetectedObject): number | null => {
    const d = det.distance ?? det.depth;
    return typeof d === 'number' && isFinite(d) && d > 0 ? d : null;
  };

  const positionOf = (det: DetectedObject): string | null => {
    if (Array.isArray(det.box_3d) && det.box_3d.length >= 3) {
      const [x, y, z] = det.box_3d;
      if ([x, y, z].every((v) => typeof v === 'number' && isFinite(v))) {
        return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
      }
    }
    if (
      [det.center_x, det.center_y, det.center_z].every(
        (v) => typeof v === 'number' && isFinite(v as number)
      )
    ) {
      return `(${(det.center_x as number).toFixed(2)}, ${(det.center_y as number).toFixed(
        2
      )}, ${(det.center_z as number).toFixed(2)})`;
    }
    return null;
  };

  const dimsOf = (det: DetectedObject): string | null => {
    const dims = Array.isArray(det.box_3d) && det.box_3d.length >= 6 ? det.box_3d.slice(3, 6) : det.dimensions;
    if (Array.isArray(dims) && dims.length >= 3 && dims.every((v) => typeof v === 'number' && isFinite(v))) {
      return `${(dims[0] as number).toFixed(2)}×${(dims[1] as number).toFixed(2)}×${(dims[2] as number).toFixed(2)}`;
    }
    return null;
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-gray-200">
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
              <tr className="text-gray-400 border-b border-card-border">
                <th className="pb-2 font-medium">Class / 3D Pos</th>
                <th className="pb-2 font-medium">Conf</th>
                <th className="pb-2 font-medium">Depth</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {detections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No objects detected in field of view
                  </td>
                </tr>
              ) : (
                detections.map((det, idx) => {
                  const depthVal = depthOf(det);
                  const posStr = positionOf(det);
                  const dimsStr = dimsOf(det);

                  return (
                    <tr key={idx} className="hover:bg-card-border/30 transition-colors">
                      <td className="py-2 text-gray-200 capitalize">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Scan className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{det.class_name}</span>
                        </div>
                        {posStr && (
                          <div className="text-[10px] font-mono text-gray-400 pl-5">
                            XYZ: {posStr} {dimsStr ? `| ${dimsStr}m` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2 font-mono text-gray-300">
                        {(det.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 font-mono text-emerald-400">
                        {depthVal !== null ? `${depthVal.toFixed(2)} m` : '--'}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-card-border flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
        <span>Clicking &apos;Approach&apos; will automatically steer & park robot 40cm away.</span>
      </div>
    </div>
  );
};
