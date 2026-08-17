'use client';

import React from 'react';
import { TelemetryCards } from '@/components/sensors/TelemetryCards';
import { DualCameraView } from '@/components/video/DualCameraView';
import { VirtualJoystick } from '@/components/teleop/VirtualJoystick';
import { KeyboardTeleop } from '@/components/teleop/KeyboardTeleop';
import { EmergencyStop } from '@/components/teleop/EmergencyStop';
import { TofRadar } from '@/components/sensors/TofRadar';
import { DetectionTable } from '@/components/sensors/DetectionTable';
import { Map2DCanvas } from '@/components/map/Map2DCanvas';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 1. Real-time Telemetry Bar */}
      <TelemetryCards />

      {/* 2. Dual Camera Feeds (RealSense + Wrist) */}
      <DualCameraView />

      {/* 3. Controls & Perception Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driving Teleoperation Column */}
        <div className="space-y-4">
          <VirtualJoystick />
          <KeyboardTeleop />
          <EmergencyStop />
        </div>

        {/* Proximity & 2D Map Column */}
        <div className="space-y-4">
          <TofRadar />
          <Map2DCanvas />
        </div>

        {/* Object Perception & Servoing Column */}
        <div className="space-y-4">
          <DetectionTable />
        </div>
      </div>
    </div>
  );
}
