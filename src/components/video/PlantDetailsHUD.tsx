import React from 'react';
import { Sun, Droplets, Hexagon } from 'lucide-react';

interface PlantDetailsHUDProps {
  box_2d: number[]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  label: string;
  canvasWidth: number;
  canvasHeight: number;
}

export const PlantDetailsHUD: React.FC<PlantDetailsHUDProps> = ({ box_2d, label, canvasWidth, canvasHeight }) => {
  const [ymin, xmin, ymax, xmax] = box_2d;

  // Calculate pixel coordinates
  const top = (ymin / 1000) * canvasHeight;
  const left = (xmin / 1000) * canvasWidth;
  let bottom = (ymax / 1000) * canvasHeight;
  const right = (xmax / 1000) * canvasWidth;

  // Artificially extend the bottom of the bounding box by 50% to cover the vase/pot
  const originalHeight = bottom - top;
  bottom = Math.min(canvasHeight, bottom + (originalHeight * 0.5));

  const width = right - left;
  const height = bottom - top;

  // We now only segment plants based on the API prompt, so we can always show the plant HUD.
  // Simulated metrics for plants
  const metrics = {
    sun: 85 + Math.floor(Math.random() * 10),
    water: 75 + Math.floor(Math.random() * 15),
    npk: 92 + Math.floor(Math.random() * 5),
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Target Box with Corner Brackets */}
      <div
        className="absolute transition-all duration-500 ease-out z-10 animate-fade-in-down"
        style={{ top, left, width, height }}
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

      {/* Connecting Line from Top Right of Box to HUD */}
      <svg className="absolute inset-0 w-full h-full z-0 overflow-visible" style={{ pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(45,212,191,0.8)" />
            <stop offset="100%" stopColor="rgba(217,70,239,0.8)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${right} ${top} L ${right + 40} ${top - 30} L ${right + 260} ${top - 30}`}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.3"
          className="drop-shadow-[0_0_8px_rgba(217,70,239,1)] animate-draw-line"
        />
        <circle cx={right} cy={top} r="4" fill="#d946ef" className="animate-pulse shadow-[0_0_10px_#d946ef]" />
      </svg>

      {/* HUD Panel */}
      <div
        className="absolute flex flex-col gap-3 p-4 bg-teal-950/60 backdrop-blur-xl border-2 border-teal-400/60 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(45,212,191,0.2)] z-20 transition-all duration-500 ease-out animate-fade-in-down-delayed pointer-events-auto"
        style={{ top: top - 50, left: right + 40, width: '240px' }}
      >
        {/* Label header */}
        <div className="flex items-center justify-between border-b-2 border-teal-400/60 pb-2">
          <span className="text-white font-mono text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
          <span className="text-fuchsia-400 font-mono text-[8px] animate-pulse shadow-[0_0_5px_rgba(217,70,239,0.5)]">ANALYSIS ACTIVE</span>
        </div>

        {/* Progress Bars */}
        <div className="flex flex-col gap-2">
          {/* Sun */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer origin-left">
            <div className="w-full h-0.5 bg-amber-400/20 relative">
              <div className="absolute top-0 left-0 h-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" style={{ width: `${metrics.sun}%` }}></div>
              <div className="absolute -top-1 w-2 h-2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-amber-400" style={{ left: `${metrics.sun}%`, transform: 'translateX(-50%)' }}></div>
            </div>
            <span className="text-amber-400 font-mono text-[9px] w-8 text-right">{metrics.sun}%</span>
          </div>
          {/* Water */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer origin-left">
            <div className="w-full h-0.5 bg-cyan-400/20 relative">
              <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ width: `${metrics.water}%` }}></div>
              <div className="absolute -top-1 w-2 h-2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-cyan-400" style={{ left: `${metrics.water}%`, transform: 'translateX(-50%)' }}></div>
            </div>
            <span className="text-cyan-400 font-mono text-[9px] w-8 text-right">{metrics.water}%</span>
          </div>
          {/* NPK */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer origin-left">
            <div className="w-full h-0.5 bg-emerald-400/20 relative">
              <div className="absolute top-0 left-0 h-full bg-emerald-400 shadow-[0_0_8px_#34d399]" style={{ width: `${metrics.npk}%` }}></div>
              <div className="absolute -top-1 w-2 h-2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-emerald-400" style={{ left: `${metrics.npk}%`, transform: 'translateX(-50%)' }}></div>
            </div>
            <span className="text-emerald-400 font-mono text-[9px] w-8 text-right">{metrics.npk}%</span>
          </div>
        </div>

        {/* Metric Icons */}
        <div className="flex justify-between gap-2 mt-1">
          <div className="flex flex-col items-center justify-center border border-amber-400/30 rounded bg-amber-400/5 w-1/3 p-1.5 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)] hover:scale-110 transition-transform cursor-pointer hover:bg-amber-400/10">
            <Sun className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[8px] font-mono text-amber-400/80">{metrics.sun}%</span>
          </div>
          <div className="flex flex-col items-center justify-center border border-cyan-400/30 rounded bg-cyan-400/5 w-1/3 p-1.5 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)] hover:scale-110 transition-transform cursor-pointer hover:bg-cyan-400/10">
            <Droplets className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[8px] font-mono text-cyan-400/80">{metrics.water}%</span>
          </div>
          <div className="flex flex-col items-center justify-center border border-emerald-400/30 rounded bg-emerald-400/5 w-1/3 p-1.5 shadow-[inset_0_0_10px_rgba(52,211,153,0.1)] hover:scale-110 transition-transform cursor-pointer hover:bg-emerald-400/10">
            <div className="w-4 h-4 flex items-center justify-center mb-1">
              <Hexagon className="w-full h-full text-emerald-400" />
              <span className="absolute text-[5px] font-mono text-emerald-400 font-bold">NPK</span>
            </div>
            <span className="text-[8px] font-mono text-emerald-400/80">{metrics.npk}%</span>
          </div>
        </div>

        {/* Line Chart Graphic */}
        <div className="border border-white/20 rounded p-1.5 bg-black/20 h-12 relative mt-1 overflow-hidden flex items-end hover:scale-105 transition-transform cursor-pointer hover:bg-black/30">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            <div className="w-full border-t border-white/10"></div>
            <div className="w-full border-t border-white/10"></div>
            <div className="w-full border-t border-white/10"></div>
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="absolute inset-0 flex justify-between">
            <div className="h-full border-l border-white/10"></div>
            <div className="h-full border-l border-white/10"></div>
            <div className="h-full border-l border-white/10"></div>
            <div className="h-full border-l border-white/10"></div>
            <div className="h-full border-l border-white/10"></div>
          </div>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path d="M 0 35 L 20 30 L 40 20 L 50 10 L 60 15 L 75 12 L 90 2 L 100 0" fill="none" stroke="#d946ef" strokeWidth="1.5" className="drop-shadow-[0_0_5px_#d946ef]" />
            <circle cx="50" cy="10" r="2" fill="#d946ef" className="animate-pulse shadow-[0_0_5px_#d946ef]" />
          </svg>
        </div>

        {/* Bar Chart & Radial Ring */}
        <div className="border border-white/20 rounded p-1.5 bg-black/20 h-12 flex justify-between items-end gap-1 mt-1 hover:scale-105 transition-transform cursor-pointer hover:bg-black/30">
          {/* Bar chart */}
          <div className="flex gap-1 h-full items-end flex-1 pl-1">
            <div className="w-3 bg-white/80 rounded-sm" style={{ height: '40%' }}></div>
            <div className="w-3 bg-white/80 rounded-sm" style={{ height: '70%' }}></div>
            <div className="w-3 bg-white shadow-[0_0_8px_#fff] rounded-sm" style={{ height: '100%' }}></div>
            <div className="w-3 bg-white/80 rounded-sm" style={{ height: '60%' }}></div>
            <div className="w-3 bg-white/80 rounded-sm" style={{ height: '30%' }}></div>
            <div className="w-3 bg-white/80 rounded-sm" style={{ height: '80%' }}></div>
          </div>

          {/* Radial Progress */}
          <div className="relative w-8 h-8 mr-1 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              <circle cx="16" cy="16" r="14" fill="none" stroke="white" strokeWidth="2" strokeDasharray="87.9" strokeDashoffset="17.5" className="shadow-[0_0_5px_#fff] transition-all duration-1000" />
            </svg>
            <span className="absolute font-mono text-[7px] text-white">80%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
