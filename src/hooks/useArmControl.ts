'use client';

import { useState, useCallback } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmJoints, ArmPoseGoal } from '@/types/ros';
import { forwardKinematics } from '@/lib/kinematics';

export function useArmControl() {
  const { publish, isConnected } = useRos();

  const [joints, setJoints] = useState<ArmJoints>({
    base: 95,
    shoulder: 60,
    elbow: 169,
    wrist: 5,
  });

  const [currentPose, setCurrentPose] = useState<{ x: number; y: number; z: number }>(() =>
    forwardKinematics(95, 60, 169, 5)
  );

  const setJointAngle = useCallback(
    (jointName: keyof ArmJoints, angle: number) => {
      const nextJoints = { ...joints, [jointName]: angle };
      setJoints(nextJoints);

      // Compute forward kinematics
      const fk = forwardKinematics(
        nextJoints.base,
        nextJoints.shoulder,
        nextJoints.elbow,
        nextJoints.wrist
      );
      setCurrentPose(fk);

      if (isConnected) {
        publish(ROS_CONFIG.TOPICS.ARM_JOINTS_CMD, 'std_msgs/msg/Float64MultiArray', {
          data: [nextJoints.base, nextJoints.shoulder, nextJoints.elbow, nextJoints.wrist],
        });
      }
    },
    [joints, isConnected, publish]
  );

  const sendPoseGoal = useCallback(
    (goal: ArmPoseGoal) => {
      if (!isConnected) return;
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
    const homeState: ArmJoints = { base: 95, shoulder: 60, elbow: 169, wrist: 5 };
    setJoints(homeState);
    setCurrentPose(forwardKinematics(95, 60, 169, 5));
    if (isConnected) {
      publish(ROS_CONFIG.TOPICS.ARM_JOINTS_CMD, 'std_msgs/msg/Float64MultiArray', {
        data: [95, 60, 169, 5],
      });
    }
  }, [isConnected, publish]);

  return {
    joints,
    currentPose,
    setJointAngle,
    sendPoseGoal,
    sendVlaPrompt,
    homeArm,
  };
}
