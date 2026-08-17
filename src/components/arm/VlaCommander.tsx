'use client';

import React, { useState } from 'react';
import { useArmControl } from '@/hooks/useArmControl';
import { Sparkles, ArrowRight } from 'lucide-react';

export const VlaCommander: React.FC = () => {
  const { sendVlaPrompt } = useArmControl();
  const [prompt, setPrompt] = useState('');

  const PRESETS = [
    'reach forward and inspect',
    'tilt camera down 30 degrees',
    'sweep left and right',
    'tuck arm for driving',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    sendVlaPrompt(prompt);
    setPrompt('');
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-white text-base">VLA Natural Language Commander</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. reach forward to inspect plant leaf..."
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-sans"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md"
        >
          <span>Run</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-gray-500 font-medium">Presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendVlaPrompt(p)}
            className="px-2.5 py-1 bg-card-border/60 hover:bg-card-border text-gray-300 rounded-md text-[11px] transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};
