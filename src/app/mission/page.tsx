'use client';

import React from 'react';
import { MissionManager } from '@/components/mission/MissionManager';
import { DualCameraView } from '@/components/video/DualCameraView';

export default function MissionPage() {
  return (
    <div className="space-y-6">
      <MissionManager />
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Live Vision Monitoring</h3>
        <DualCameraView />
      </div>
    </div>
  );
}
