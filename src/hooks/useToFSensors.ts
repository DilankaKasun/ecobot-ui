'use client';

import { useState, useEffect } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ToFRanges } from '@/types/ros';

export function useToFSensors() {
  const { subscribe, isConnected } = useRos();
  const [tof, setTof] = useState<ToFRanges>({
    left: 0,
    right: 0,
    sensor1: 0,
    sensor2: 0,
    status: 'OK',
  });

  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe(
      ROS_CONFIG.TOPICS.TOF_RANGES,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          const leftVal = data.left ?? data.sensor1 ?? data.s1 ?? (Array.isArray(data.ranges_mm) ? data.ranges_mm[0] : 0) ?? 0;
          const rightVal = data.right ?? data.sensor2 ?? data.s2 ?? (Array.isArray(data.ranges_mm) ? data.ranges_mm[1] : 0) ?? 0;
          const leftNum = typeof leftVal === 'number' && leftVal > 0 ? leftVal : 0;
          const rightNum = typeof rightVal === 'number' && rightVal > 0 ? rightVal : 0;

          setTof({
            left: leftNum,
            right: rightNum,
            sensor1: leftNum,
            sensor2: rightNum,
            status: data.status || (leftNum > 0 || rightNum > 0 ? 'OK' : 'NO_DATA'),
          });
        } catch (e) {
          // ignore
        }
      }
    );

    return () => unsub();
  }, [isConnected, subscribe]);

  return tof;
}
