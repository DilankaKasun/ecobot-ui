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

    const unsub = subscribe(ROS_CONFIG.TOPICS.ARM_STATUS, 'std_msgs/msg/String', (msg: any) => {
      const raw = typeof msg?.data === 'string' ? msg.data.trim() : '';
      if (!raw) return;

      // arm_manual_node publishes a bare word here — "enabled", "disabled" or
      // "error" — not JSON. Parsing it as JSON throws and would blank the card
      // on every message, so only treat it as JSON when it actually looks like
      // an object (a richer publisher may send one).
      if (raw.startsWith('{')) {
        try {
          setArmStatus(JSON.parse(raw));
          return;
        } catch {
          // fall through and keep the raw word as the state
        }
      }

      setArmStatus({ state: raw } as ArmStatus);
    });

    return () => unsub();
  }, [isConnected, subscribe]);

  return armStatus;
}
