'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmJoints, ArmPoseGoal } from '@/types/ros';
import { forwardKinematics, ARM_HOME } from '@/lib/kinematics';

/**
 * How long after a local command to ignore incoming joint feedback.
 *
 * arm_manual_node ramps to a target over a trapezoidal profile and publishes
 * where it is on every tick, so feedback arriving mid-ramp is a stale position
 * behind the slider. Applying it would snap the slider backwards and fight the
 * user's drag. Feedback is authoritative again once the ramp has settled.
 */
const ECHO_SUPPRESS_MS = 800;

export function useArmControl() {
  const { publish, subscribe, isConnected } = useRobotLink();

  const [joints, setJoints] = useState<ArmJoints>({ ...ARM_HOME });
  const [currentPose, setCurrentPose] = useState<{ x: number; y: number; z: number }>(() =>
    forwardKinematics(ARM_HOME.base, ARM_HOME.shoulder, ARM_HOME.elbow, ARM_HOME.wrist)
  );
  // True once the robot has told us where it actually is, so the UI can show
  // real state instead of an assumed home pose it may never be in.
  const [isSynced, setIsSynced] = useState(false);

  const lastCommandAt = useRef<number>(0);
  // Mirrors `joints` so setJointAngle can build the next command from the
  // latest values without taking them through a stale render closure.
  const jointsRef = useRef<ArmJoints>(joints);
  jointsRef.current = joints;

  // Track the live arm. /arm/joint_angles carries [base, shoulder, elbow,
  // wrist] in the same order the node accepts commands in.
  useEffect(() => {
    if (!isConnected) {
      setIsSynced(false);
      return;
    }

    const unsub = subscribe(
      ROS_CONFIG.TOPICS.ARM_JOINT_ANGLES,
      'std_msgs/msg/Float64MultiArray',
      (msg: any) => {
        const data = msg?.data;
        if (!Array.isArray(data) || data.length < 4) return;
        if (!data.every((v) => typeof v === 'number' && isFinite(v))) return;

        setIsSynced(true);
        if (Date.now() - lastCommandAt.current < ECHO_SUPPRESS_MS) return;

        const [base, shoulder, elbow, wrist] = data.map((v) => Math.round(v));
        setJoints({ base, shoulder, elbow, wrist });
        setCurrentPose(forwardKinematics(base, shoulder, elbow, wrist));
      }
    );

    return () => unsub();
  }, [isConnected, subscribe]);

  const publishJoints = useCallback(
    (next: ArmJoints) => {
      lastCommandAt.current = Date.now();
      setJoints(next);
      setCurrentPose(forwardKinematics(next.base, next.shoulder, next.elbow, next.wrist));

      if (isConnected) {
        publish(ROS_CONFIG.TOPICS.ARM_JOINTS_CMD, 'std_msgs/msg/Float64MultiArray', {
          data: [next.base, next.shoulder, next.elbow, next.wrist],
        });
      }
    },
    [isConnected, publish]
  );

  const setJointAngle = useCallback(
    (jointName: keyof ArmJoints, angle: number) => {
      publishJoints({ ...jointsRef.current, [jointName]: angle });
    },
    [publishJoints]
  );

  const sendPoseGoal = useCallback(
    (goal: ArmPoseGoal) => {
      if (!isConnected) return;
      lastCommandAt.current = Date.now();
      publish(ROS_CONFIG.TOPICS.ARM_POSE_GOAL, 'std_msgs/msg/Float64MultiArray', {
        data: [goal.x, goal.y, goal.z],
      });
    },
    [isConnected, publish]
  );

  const sendVlaPrompt = useCallback(
    (prompt: string) => {
      if (!isConnected || !prompt.trim()) return;
      publish(ROS_CONFIG.TOPICS.VLA_PROMPT, 'std_msgs/msg/String', {
        data: prompt.trim(),
      });
    },
    [isConnected, publish]
  );

  const homeArm = useCallback(() => {
    publishJoints({ ...ARM_HOME });
  }, [publishJoints]);

  return {
    joints,
    currentPose,
    isSynced,
    setJointAngle,
    sendPoseGoal,
    sendVlaPrompt,
    homeArm,
  };
}
