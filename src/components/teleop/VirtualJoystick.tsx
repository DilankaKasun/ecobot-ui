'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTeleop } from '@/hooks/useTeleop';
import { Compass } from 'lucide-react';

export const VirtualJoystick: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { sendTwist } = useTeleop();
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [maxLinear, setMaxLinear] = useState<number>(0.3); // m/s
  const [maxAngular, setMaxAngular] = useState<number>(0.8); // rad/s

  const CENTER = 100;
  const RADIUS = 80;
  const HANDLE_RADIUS = 24;

  const draw = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 200, 200);

      // Outer ring
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1F2937';
      ctx.stroke();

      // Inner crosshairs
      ctx.beginPath();
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.moveTo(CENTER, CENTER - RADIUS);
      ctx.lineTo(CENTER, CENTER + RADIUS);
      ctx.moveTo(CENTER - RADIUS, CENTER);
      ctx.lineTo(CENTER + RADIUS, CENTER);
      ctx.stroke();

      // Active Knob
      ctx.beginPath();
      ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, HANDLE_RADIUS);
      gradient.addColorStop(0, '#60A5FA');
      gradient.addColorStop(1, '#2563EB');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#93C5FD';
      ctx.stroke();
    },
    []
  );

  useEffect(() => {
    draw(pos.x, pos.y);
  }, [pos, draw]);

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDragging) return;
    const rect = canvas.getBoundingClientRect();
    let dx = clientX - rect.left - CENTER;
    let dy = clientY - rect.top - CENTER;

    const distance = Math.hypot(dx, dy);
    if (distance > RADIUS) {
      dx = (dx / distance) * RADIUS;
      dy = (dy / distance) * RADIUS;
    }

    const currentX = CENTER + dx;
    const currentY = CENTER + dy;
    setPos({ x: currentX, y: currentY });

    // Calculate twist (Up = positive linear x, Left = positive angular z)
    const normX = dx / RADIUS; // -1 (left) to +1 (right)
    const normY = -dy / RADIUS; // -1 (down) to +1 (up)

    const linearX = normY * maxLinear;
    const angularZ = -normX * maxAngular;

    sendTwist(linearX, angularZ);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setPos({ x: CENTER, y: CENTER });
    sendTwist(0, 0);
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-3 text-xs text-gray-400">
        <div className="flex items-center gap-1.5 font-semibold text-gray-200">
          <Compass className="w-4 h-4 text-blue-400" />
          <span>Virtual Joystick</span>
        </div>
        <span className="font-mono text-[11px]">
          Max: {maxLinear.toFixed(1)}m/s | {maxAngular.toFixed(1)}r/s
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        onMouseDown={() => setIsDragging(true)}
        onMouseMove={(e) => isDragging && handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={() => setIsDragging(true)}
        onTouchMove={(e) => {
          if (isDragging && e.touches[0]) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handlePointerUp}
        className="cursor-crosshair touch-none select-none rounded-full"
      />

      <div className="w-full grid grid-cols-2 gap-3 mt-4 text-xs text-gray-400">
        <div>
          <label className="block mb-1">Max Speed (m/s)</label>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={maxLinear}
            onChange={(e) => setMaxLinear(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <div>
          <label className="block mb-1">Max Turn (rad/s)</label>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.1"
            value={maxAngular}
            onChange={(e) => setMaxAngular(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
