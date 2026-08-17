'use client';

import { useState, useEffect } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmStatus } from '@/types/ros';

export function useArmStatus() {
  const { subscribe, isConnected } = useRos();
  const [armStatus, setArmStatus] = useState<ArmStatus | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe(ROS_CONFIG.TOPICS.ARM_STATUS, 'std_msgs/msg/String', (msg: any) => {
      try {
        const parsed = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg;
        setArmStatus(parsed);
      } catch (e) {
        setArmStatus(null);
      }
    });

    return () => unsub();
  }, [isConnected, subscribe]);

  return armStatus;
}