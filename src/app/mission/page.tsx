'use client';

import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { RunConsole } from '@/components/mission/RunConsole';
import { ScanPanel } from '@/components/mission/ScanPanel';
import { ReportList } from '@/components/mission/ReportList';
import { CameraFeed } from '@/components/video/CameraFeed';
import { FloatingPanel } from '@/components/layout/FloatingPanel';
import { ROS_CONFIG } from '@/lib/ros-config';

const PANEL_WIDTH = 360;

export default function MissionPage() {
  const [showForward, setShowForward] = useState(true);
  const [showWrist, setShowWrist] = useState(true);
  // Measured on the client so the two panels open apart instead of stacked;
  // after the first drag each one restores from its own storage key.
  const [defaultPos, setDefaultPos] = useState<{
    forward: { x: number; y: number };
    wrist: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const x = Math.max(8, window.innerWidth - PANEL_WIDTH - 24);
    setDefaultPos({
      forward: { x, y: 88 },
      wrist: { x, y: Math.max(88, window.innerHeight - 340) },
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-white">Plant Run</h2>

        <div className="flex items-center gap-2 shrink-0">
          {!showForward && (
            <button
              onClick={() => setShowForward(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-gray-300 hover:text-white hover:border-primary/40 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Show forward camera
            </button>
          )}
          {!showWrist && (
            <button
              onClick={() => setShowWrist(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-gray-300 hover:text-white hover:border-primary/40 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Show wrist camera
            </button>
          )}
        </div>
      </div>

      {/* The run's own state machine, who has the wheels, and every number
          worth watching while it drives. This is the page. */}
      <RunConsole />

      <ScanPanel />

      {/* Every plant scanned so far, each opening in its own tab. */}
      <ReportList />

      {/* Both feeds float, as on the arm studio, so they can sit beside
          whichever part of the run is being watched. */}
      {defaultPos && showForward && (
        <FloatingPanel
          title="Forward camera (what the driver sees)"
          storageKey="ecobot.panel.missionForwardCamera"
          defaultPos={defaultPos.forward}
          defaultWidth={PANEL_WIDTH}
          onClose={() => setShowForward(false)}
        >
          <CameraFeed
            title="Forward camera"
            port={ROS_CONFIG.OBSTACLE_STREAM_PORT}
            endpoint="obstacle.mjpg"
            livekitTrackName="detection"
          />
        </FloatingPanel>
      )}

      {defaultPos && showWrist && (
        <FloatingPanel
          title="Wrist camera (what the scan photographs)"
          storageKey="ecobot.panel.missionWristCamera"
          defaultPos={defaultPos.wrist}
          defaultWidth={PANEL_WIDTH}
          onClose={() => setShowWrist(false)}
        >
          <CameraFeed
            title="Wrist camera"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            livekitTrackName="arm"
          />
        </FloatingPanel>
      )}
    </div>
  );
}
