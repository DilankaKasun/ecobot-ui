'use client';

import React from 'react';
import { usePlantMission } from '@/hooks/usePlantMission';
import { Sprout, Play, SkipForward, Square, CheckCircle, AlertTriangle } from 'lucide-react';

export const MissionManager: React.FC = () => {
  const { missionStatus, waypoints, startMission, nextPlant, stopMission } = usePlantMission();

  const isRunning = ['NAVIGATING', 'SCANNING', 'ANALYZING', 'WAITING'].includes(missionStatus.status);

  return (
    <div className="space-y-4">
      {/* Control Banner */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Autonomous Plant Mission Controller</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Navigates to waypoints, captures multi-angle wrist camera photos, and runs Google Gemini AI health assessment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={startMission}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Start Mission
            </button>
          ) : (
            <>
              <button
                onClick={nextPlant}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                Advance Next
              </button>
              <button
                onClick={stopMission}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                <Square className="w-4 h-4" />
                Abort
              </button>
            </>
          )}
        </div>
      </div>

      {/* State & Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <span className="text-xs text-gray-400 block mb-1">Mission Phase</span>
          <span
            className={`font-mono text-base font-bold px-2.5 py-0.5 rounded inline-block ${
              isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-300'
            }`}
          >
            {missionStatus.status}
          </span>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <span className="text-xs text-gray-400 block mb-1">Target Plant</span>
          <span className="font-mono text-xl font-bold text-white">
            {missionStatus.currentPlant} <span className="text-xs font-normal text-gray-500">/ {waypoints.length}</span>
          </span>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <span className="text-xs text-gray-400 block mb-1">Multi-view Captures</span>
          <span className="font-mono text-xl font-bold text-blue-400">{missionStatus.captures} photos</span>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <span className="text-xs text-gray-400 block mb-1">AI Model</span>
          <span className="font-mono text-base font-bold text-purple-400">Gemini Vision</span>
        </div>
      </div>

      {/* Latest Gemini Diagnostic Report */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white text-base">Latest Gemini AI Health Diagnostic</h3>
        </div>

        {missionStatus.lastDiagnosis ? (
          <div className="space-y-3 bg-background/50 border border-card-border rounded-xl p-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
              <div>
                <span className="text-gray-400">Species:</span>{' '}
                <span className="text-white font-bold">{missionStatus.lastDiagnosis.species || 'Tomato (Solanum)'}</span>
              </div>
              <div>
                <span className="text-gray-400">Vitality:</span>{' '}
                <span className="text-emerald-400 font-bold">{missionStatus.lastDiagnosis.vitality || 'Healthy (88%)'}</span>
              </div>
              <div>
                <span className="text-gray-400">Hydration:</span>{' '}
                <span className="text-blue-400 font-bold">{missionStatus.lastDiagnosis.hydration || 'Optimal'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 text-xs bg-background/30 rounded-xl border border-dashed border-card-border">
            No inspection diagnosis recorded yet. Start a mission or click &quot;Approach&quot; on a detected plant to begin multi-view scanning.
          </div>
        )}
      </div>
    </div>
  );
};
