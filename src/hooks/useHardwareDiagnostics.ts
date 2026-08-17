'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { HardwareStatus, ServiceResult } from '@/types/ros';

export function useHardwareDiagnostics() {
  const { subscribe, callService, isConnected } = useRos();
  const [hardware, setHardware] = useState<HardwareStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe(
      ROS_CONFIG.TOPICS.HARDWARE_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const parsed = JSON.parse(msg.data);
          setHardware(parsed);
        } catch (e) {
          // ignore parsing error
        }
      }
    );

    return () => unsub();
  }, [isConnected, subscribe]);

  const runHardwareCheck = useCallback(async () => {
    if (!isConnected) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const result: ServiceResult = await callService(
        ROS_CONFIG.SERVICES.HARDWARE_CHECK,
        'std_srvs/srv/Trigger',
        {}
      );
      setCheckResult({
        ok: !!result.success,
        message: result.success
          ? 'All hardware checks passed'
          : result.message || 'Hardware check reported a warning/failure',
      });
    } catch (e: any) {
      setCheckResult({
        ok: false,
        message: `Service error: ${e?.message || 'unknown error'}`,
      });
    } finally {
      setChecking(false);
    }
  }, [isConnected, callService]);

  return { hardware, checking, checkResult, runHardwareCheck };
}