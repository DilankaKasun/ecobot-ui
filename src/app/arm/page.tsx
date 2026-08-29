'use client';

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { JointSliders } from '@/components/arm/JointSliders';
import { CartesianControl } from '@/components/arm/CartesianControl';
import { ArmStatusCard } from '@/components/arm/ArmStatusCard';
import { ArmVisualizer3D } from '@/components/arm/ArmVisualizer3D';
import { CameraFeed } from '@/components/video/CameraFeed';
import { FloatingPanel } from '@/components/layout/FloatingPanel';
import { ROS_CONFIG } from '@/lib/ros-config';

export default function ArmStudioPage() {
  const [showCamera, setShowCamera] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Robotic Manipulator Studio</h2>
          <p className="text-xs text-gray-400 mt-1">
            4-DOF forward and inverse kinematics control with a live pose view and end-effector wrist camera.
          </p>
        </div>
        {!showCamera && (
          <button
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-card-border text-xs font-semibold text-gray-300 hover:text-white hover:border-primary/40 transition-colors shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            Show wrist camera
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Direct Joint & IK Control */}
        <div className="space-y-6">
          <JointSliders />
          <CartesianControl />
          <ArmStatusCard />
        </div>

        {/* Right Column: Live 3D Pose */}
        <div className="space-y-6">
          <ArmVisualizer3D />
        </div>
      </div>

      {/* The wrist view floats so it can sit beside whichever control is in
          use, rather than being pinned below the fold. */}
      {showCamera && (
        <FloatingPanel
          title="Wrist Camera (End-Effector)"
          storageKey="ecobot.panel.wristCamera"
          defaultWidth={340}
          onClose={() => setShowCamera(false)}
        >
          <CameraFeed
            title="Wrist Camera"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
            livekitTrackName="arm"
          />
        </FloatingPanel>
      )}
    </div>
  );
}
