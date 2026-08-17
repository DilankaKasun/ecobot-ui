'use client';

import { useCallback } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';

export function useTeleop() {
  const { publish, isConnected } = useRos();

  const sendTwist = useCallback(
    (linearX: number, angularZ: number) => {
      if (!isConnected) return;
      publish(ROS_CONFIG.TOPICS.CMD_VEL, 'geometry_msgs/msg/Twist', {
        linear: { x: linearX, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: angularZ },
      });
    },
    [isConnected, publish]
  );

  const emergencyStop = useCallback(() => {
    sendTwist(0.0, 0.0);
  }, [sendTwist]);

  return { sendTwist, emergencyStop };
}
