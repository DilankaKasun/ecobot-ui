'use client';

import React from 'react';
import { RunConsole } from '@/components/mission/RunConsole';
import { ScanPanel } from '@/components/mission/ScanPanel';
import { NodeActivityPanel } from '@/components/mission/NodeActivityPanel';
import { CameraFeed } from '@/components/video/CameraFeed';
import { ROS_CONFIG } from '@/lib/ros-config';

export default function MissionPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Plant Run</h2>

      {/* The run's own state machine, who has the wheels, and every number
          worth watching while it drives. This is the page. */}
      <RunConsole />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* What the robot is steering by: the forward camera and its
              detection boxes. */}
          <CameraFeed
            title="Forward camera (what the driver sees)"
            port={ROS_CONFIG.OBSTACLE_STREAM_PORT}
            endpoint="obstacle.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED}
            livekitTrackName="detection"
          />
          <CameraFeed
            title="Wrist camera (what the scan photographs)"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
            livekitTrackName="arm"
          />
        </div>
        <ScanPanel />
      </div>

      <NodeActivityPanel />
    </div>
  );
}
