'use client';

import React from 'react';
import { CameraFeed } from './CameraFeed';
import { ROS_CONFIG } from '@/lib/ros-config';

export const DualCameraView: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CameraFeed
        title="RealSense D415 (Main Navigation & Depth)"
        port={ROS_CONFIG.REALSENSE_STREAM_PORT}
        endpoint="stream.mjpg"
        rosTopic={ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED}
        streamOptions={[
          {
            label: 'RGB Color',
            port: ROS_CONFIG.REALSENSE_STREAM_PORT,
            endpoint: 'stream.mjpg',
            rosTopic: ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED,
          },
          {
            label: 'Obstacle Overlay',
            port: ROS_CONFIG.OBSTACLE_STREAM_PORT,
            endpoint: 'stream.mjpg',
            rosTopic: ROS_CONFIG.TOPICS.CAMERA_OBSTACLE_COMPRESSED,
          },
          {
            label: 'Ground Depth',
            port: ROS_CONFIG.GROUND_STREAM_PORT,
            endpoint: 'stream.mjpg',
            rosTopic: ROS_CONFIG.TOPICS.CAMERA_COLOR_COMPRESSED,
          },
        ]}
      />
      <CameraFeed
        title="Manipulator Wrist Camera (Close-up Inspection)"
        port={ROS_CONFIG.ARM_CAMERA_PORT}
        endpoint="arm_camera.mjpg"
        rosTopic={ROS_CONFIG.TOPICS.CAMERA_ARM_COMPRESSED}
      />
    </div>
  );
};
