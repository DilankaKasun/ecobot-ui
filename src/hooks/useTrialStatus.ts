'use client';

import { useEffect, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/** The trial recorder's live status, published once a second. */
export interface TrialStatus {
  recording: boolean;
  trials_saved: number;
  trial: string | null;
  elapsed_s: number;
  state: string;
  current_plant: string | null;
  plants_scanned: number;
  plants_not_reached: number;
  distance_driven_m: number;
  avoidance_interventions: number;
  photos: number;
  reports: number;
  frames: number;
  /** Wall-clock ms when this arrived; older than a few seconds is stale. */
  at: number;
}

export function useTrialStatus() {
  const { subscribe, isConnected } = useRobotLink();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isConnected) return;
    return subscribe(ROS_CONFIG.TOPICS.TRIAL_STATUS, 'std_msgs/msg/String', (msg: any) => {
      try {
        const d = JSON.parse(msg?.data ?? '');
        setStatus({ ...d, recording: !!d.recording, at: Date.now() });
      } catch { /* malformed status */ }
    });
  }, [isConnected, subscribe]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stale = !status || now - status.at > 5000;
  return { status, stale, isConnected };
}
