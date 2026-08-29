'use client';

import React from 'react';
import { JointSliders } from '@/components/arm/JointSliders';
import { CartesianControl } from '@/components/arm/CartesianControl';
import { ArmStatusCard } from '@/components/arm/ArmStatusCard';
import { ArmVisualizer3D } from '@/components/arm/ArmVisualizer3D';
import { CameraFeed } from '@/components/video/CameraFeed';
import { ROS_CONFIG } from '@/lib/ros-config';

export default function ArmStudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Robotic Manipulator Studio</h2>
        <p className="text-xs text-gray-400 mt-1">
          4-DOF forward and inverse kinematics control with a live pose view and end-effector wrist camera.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Direct Joint & IK Control */}
        <div className="space-y-6">
          <JointSliders />
          <CartesianControl />
          <ArmStatusCard />
        </div>

        {/* Right Column: Live 3D Pose & Wrist Camera */}
        <div className="space-y-6">
          <ArmVisualizer3D />
          <CameraFeed
            title="Wrist Camera Live Stream (End-Effector)"
            port={ROS_CONFIG.ARM_CAMERA_PORT}
            endpoint="arm_camera.mjpg"
            rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
          />
        </div>
      </div>
    </div>
  );
}
