'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/**
 * Outcome of the last /arm/pose_goal, as reported by arm_manual_node.
 *
 * Every rejection used to be log-only, so a goal the solver refused looked
 * identical to one that never arrived. The node now answers on
 * /arm/pose_goal_result and this surfaces it.
 */
export type GoalStatus =
  | 'idle'
  | 'sending'
  | 'ok'
  | 'out_of_reach'
  | 'no_solution'
  | 'joint_limits'
  | 'bad_request'
  | 'error'
  | 'timeout';

export interface GoalResult {
  status: GoalStatus;
  reason?: string;
  target?: number[];
  angles?: number[];
  joints?: string[];
}

/** How long to wait for the node to answer before calling it a timeout. */
const REPLY_TIMEOUT_MS = 4000;

export function useArmGoalResult() {
  const { subscribe, isConnected } = useRobotLink();
  const [result, setResult] = useState<GoalResult>({ status: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    const unsub = subscribe(
      ROS_CONFIG.TOPICS.ARM_POSE_GOAL_RESULT,
      'std_msgs/msg/String',
      (msg: any) => {
        let parsed: GoalResult;
        try {
          parsed = JSON.parse(msg?.data ?? '');
        } catch {
          return;
        }
        if (!parsed?.status) return;
        clearTimer();
        setResult(parsed);
      }
    );
    return () => {
      unsub();
      clearTimer();
    };
  }, [isConnected, subscribe]);

  useEffect(() => clearTimer, []);

  /** Call right before publishing a goal, to show the pending state. */
  const markSending = useCallback(() => {
    clearTimer();
    setResult({ status: 'sending' });
    timer.current = setTimeout(
      () =>
        setResult({
          status: 'timeout',
          reason:
            'no reply from the arm node — check it is running and connected',
        }),
      REPLY_TIMEOUT_MS
    );
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setResult({ status: 'idle' });
  }, []);

  return { result, markSending, reset };
}
