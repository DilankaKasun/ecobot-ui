'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useOdometry } from '@/hooks/useOdometry';
import { useDetections } from '@/hooks/useDetections';
import { MapPin, RotateCcw, ZoomIn, ZoomOut, Target } from 'lucide-react';

export const Map2DCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { odom } = useOdometry();
  const { detections } = useDetections();
  const [trace, setTrace] = useState<{ x: number; y: number }[]>([]);
  const [scale, setScale] = useState<number>(30); // pixels per meter

  // Append new trace point when robot moves
  useEffect(() => {
    setTrace((prev) => {
      const last = prev[prev.length - 1];
      if (!last || Math.hypot(last.x - odom.x, last.y - odom.y) > 0.05) {
        const next = [...prev, { x: odom.x, y: odom.y }];
        return next.slice(-200); // keep last 200 points
      }
      return prev;
    });
  }, [odom.x, odom.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1;
    const gridSize = scale; // 1 meter grid
    for (let x = cx % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = cy % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Origin cross
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    // Draw trace
    if (trace.length > 1) {
      ctx.strokeStyle = '#00E5C0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      trace.forEach((pt, i) => {
        const px = cx + pt.x * scale;
        const py = cy - pt.y * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Draw Robot Body
    const rx = cx + odom.x * scale;
    const ry = cy - odom.y * scale;
    const yawRad = (odom.yaw * Math.PI) / 180;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-yawRad);

    // Robot chassis circle
    ctx.fillStyle = '#00E5C0';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Heading arrow
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw Detected Objects in 2D
    detections.forEach((det) => {
      const dist = det.distance ?? det.center_z;
      if (typeof dist !== 'number' || dist <= 0) return;
      const lateral = typeof det.center_x === 'number' ? -det.center_x : 0;

      // Project target in world frame
      const objX = odom.x + dist * Math.cos(yawRad) - lateral * Math.sin(yawRad);
      const objY = odom.y + dist * Math.sin(yawRad) + lateral * Math.cos(yawRad);

      const ox = cx + objX * scale;
      const oy = cy - objY * scale;

      // Glow circle
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.beginPath();
      ctx.arc(ox, oy, 10, 0, Math.PI * 2);
      ctx.fill();

      // Object point
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#F3F4F6';
      ctx.textAlign = 'center';
      ctx.fillText(`${det.class_name} (${dist.toFixed(1)}m)`, ox, oy - 7);
    });
  }, [odom, trace, scale, detections]);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-gray-200">
          <MapPin className="w-4 h-4 text-primary" />
          <span>2D Map & AMCL Localization</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.min(80, s + 10))}
            className="p-1 rounded bg-card-border text-gray-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(10, s - 10))}
            className="p-1 rounded bg-card-border text-gray-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTrace([])}
            className="p-1 rounded bg-card-border text-gray-400 hover:text-white"
            title="Clear Trace"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full flex items-center justify-center bg-background rounded-lg border border-card-border overflow-hidden">
        <canvas ref={canvasRef} width={400} height={240} className="w-full h-auto block" />
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 font-mono">
        <span>Scale: {(1 / (scale / 100)).toFixed(0)} cm/grid</span>
        {detections.length > 0 && <span className="text-pink-400 font-semibold flex items-center gap-1"><Target className="w-3 h-3" /> {detections.length} objects</span>}
        <span>Points: {trace.length}</span>
      </div>
    </div>
  );
};
