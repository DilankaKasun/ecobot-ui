'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { DetectedObject, GotoStatus } from '@/types/ros';

export function useDetections() {
  const { subscribe, publish, isConnected } = useRos();
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [gotoStatus, setGotoStatus] = useState<GotoStatus>({ status: 'IDLE' });

  useEffect(() => {
    if (!isConnected) return;

    const unsubDetections = subscribe(
      ROS_CONFIG.TOPICS.DETECTIONS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (Array.isArray(parsed)) {
            setDetections(parsed);
          } else if (parsed.detections && Array.isArray(parsed.detections)) {
            setDetections(parsed.detections);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    );

    const unsubGoto = subscribe(
      ROS_CONFIG.TOPICS.GOTO_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const parsed = JSON.parse(msg.data);
          setGotoStatus(parsed);
        } catch (e) {
          setGotoStatus({ status: 'IDLE' });
        }
      }
    );

    return () => {
      unsubDetections();
      unsubGoto();
    };
  }, [isConnected, subscribe]);

  const selectGotoTarget = useCallback(
    (target: DetectedObject) => {
      if (!isConnected) return;
      publish(ROS_CONFIG.TOPICS.GOTO_TARGET, 'std_msgs/msg/String', {
        data: JSON.stringify(target),
      });
    },
    [isConnected, publish]
  );

  const stopGoto = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.GOTO_TARGET, 'std_msgs/msg/String', {
      data: JSON.stringify({ command: 'stop' }),
    });
  }, [isConnected, publish]);

  return { detections, gotoStatus, selectGotoTarget, stopGoto };
}
