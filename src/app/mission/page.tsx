'use client';

import React from 'react';
import { PlantScanPanel } from '@/components/mission/PlantScanPanel';
import { NodeActivityPanel } from '@/components/mission/NodeActivityPanel';
import { CameraFeed } from '@/components/video/CameraFeed';
import { ROS_CONFIG } from '@/lib/ros-config';

export default function MissionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Plant Scanning Mission</h2>
        <p className="text-xs text-gray-400 mt-1">
          Approach a plant, sweep the wrist camera across it, and have Gemini
          write up what it sees.
        </p>
      </div>

      {/* What each node is doing right now. Full width and above the
          controls: during a run this is the thing you watch. */}
      <NodeActivityPanel />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PlantScanPanel />
        <div className="space-y-6">
          {/* The wrist camera is what the scan actually photographs. */}
          <CameraFeed
            title="Wrist Camera (scanning view)"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
            livekitTrackName="arm"
          />
        </div>
      </div>
    </div>
  );
}
