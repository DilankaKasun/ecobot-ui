'use client';

import { useState, useEffect } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { OdometryData } from '@/types/ros';

export function useOdometry() {
  const { subscribe, isConnected } = useRos();
  const [odom, setOdom] = useState<OdometryData>({
    x: 0,
    y: 0,
    yaw: 0,
    linearVelocity: 0,
    angularVelocity: 0,
  });
  const [runMode, setRunMode] = useState<number>(0);

  useEffect(() => {
    if (!isConnected) return;

    const unsubOdom = subscribe(
      ROS_CONFIG.TOPICS.ODOM,
      'nav_msgs/msg/Odometry',
      (msg: any) => {
        const p = msg.pose?.pose?.position || { x: 0, y: 0 };
        const o = msg.pose?.pose?.orientation || { w: 1, z: 0 };
        const v = msg.twist?.twist?.linear?.x || 0;
        const w = msg.twist?.twist?.angular?.z || 0;

        // Yaw from quaternion
        const yawRad = Math.atan2(2.0 * (o.w * o.z), 1.0 - 2.0 * (o.z * o.z));
        const yawDeg = (yawRad * 180) / Math.PI;

        setOdom({
          x: Number(p.x.toFixed(2)),
          y: Number(p.y.toFixed(2)),
          yaw: Number(yawDeg.toFixed(1)),
          linearVelocity: Number(v.toFixed(2)),
          angularVelocity: Number(w.toFixed(2)),
        });
      }
    );

    const unsubMode = subscribe(
      ROS_CONFIG.TOPICS.RUN_MODE,
      'std_msgs/msg/UInt8',
      (msg: any) => {
        setRunMode(msg.data || 0);
      }
    );

    return () => {
      unsubOdom();
      unsubMode();
    };
  }, [isConnected, subscribe]);

  return { odom, runMode };
}
