'use client';

import { useState, useEffect } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmStatus } from '@/types/ros';

export function useArmStatus() {
  const { subscribe, isConnected } = useRos();
  const [armStatus, setArmStatus] = useState<ArmStatus | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setArmStatus(null);
      return;
    }

    // Subscribe to /arm/status (handles plain strings like "enabled", "disabled", "ready" as well as JSON)
    const unsubStatus = subscribe(ROS_CONFIG.TOPICS.ARM_STATUS, 'std_msgs/msg/String', (msg: any) => {
      try {
        let parsed: Partial<ArmStatus> = {};
        if (typeof msg.data === 'string') {
          const raw = msg.data.trim();
          if (raw.startsWith('{') || raw.startsWith('[')) {
            parsed = JSON.parse(raw);
          } else {
            parsed = { state: raw, status: raw };
          }
        } else if (typeof msg === 'object' && msg !== null) {
          parsed = msg;
        }

        setArmStatus((prev) => ({
          ...(prev || {}),
          ...parsed,
          timestamp: Date.now(),
        }));
      } catch {
        const stateStr = typeof msg?.data === 'string' ? msg.data : 'unknown';
        setArmStatus((prev) => ({
          ...(prev || {}),
          state: stateStr,
          status: stateStr,
          timestamp: Date.now(),
        }));
      }
    });

    // Subscribe to /arm/joint_angles for live joint state
    const unsubJoints = subscribe(
      ROS_CONFIG.TOPICS.ARM_JOINTS_STATE,
      'std_msgs/msg/Float64MultiArray',
      (msg: any) => {
        if (Array.isArray(msg?.data) && msg.data.length >= 4) {
          const [base, shoulder, elbow, wrist] = msg.data.map((v: any) => Number(v));
          setArmStatus((prev) => ({
            ...(prev || {}),
            joints: [base, shoulder, elbow, wrist],
            timestamp: Date.now(),
          }));
        }
      }
    );

    // Subscribe to /arm/pose for live Cartesian end-effector coordinates
    const unsubPose = subscribe(
      ROS_CONFIG.TOPICS.ARM_POSE,
      'std_msgs/msg/Float64MultiArray',
      (msg: any) => {
        if (Array.isArray(msg?.data) && msg.data.length >= 3) {
          setArmStatus((prev) => ({
            ...(prev || {}),
            end_effector: {
              x: Number(Number(msg.data[0]).toFixed(3)),
              y: Number(Number(msg.data[1]).toFixed(3)),
              z: Number(Number(msg.data[2]).toFixed(3)),
            },
            timestamp: Date.now(),
          }));
        }
      }
    );

    return () => {
      unsubStatus();
      unsubJoints();
      unsubPose();
    };
  }, [isConnected, subscribe]);

  return armStatus;
}