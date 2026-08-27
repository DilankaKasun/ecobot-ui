'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmJoints, ArmPoseGoal } from '@/types/ros';
import { ARM_PARAMS, forwardKinematics } from '@/lib/kinematics';

export const ARM_PRESETS: Record<string, { label: string; joints: ArmJoints; description: string }> = {
  HOME: {
    label: 'Home',
    joints: {
      base: ARM_PARAMS.JOINTS[0].home,
      shoulder: ARM_PARAMS.JOINTS[1].home,
      elbow: ARM_PARAMS.JOINTS[2].home,
      wrist: ARM_PARAMS.JOINTS[3].home,
    },
    description: 'Calibrated home / resting position',
  },
  PLANT_SCAN: {
    label: 'Plant Scan',
    joints: { base: 107, shoulder: 85, elbow: 130, wrist: 30 },
    description: 'Optimal inspection angle for plant foliage',
  },
  FORWARD_REACH: {
    label: 'Forward Reach',
    joints: { base: 107, shoulder: 45, elbow: 90, wrist: 45 },
    description: 'Extended forward reach',
  },
  TUCK: {
    label: 'Tuck / Stow',
    joints: { base: 107, shoulder: 125, elbow: 180, wrist: 0 },
    description: 'Folded compact transport pose',
  },
};

const DEFAULT_JOINTS: ArmJoints = {
  base: ARM_PARAMS.JOINTS[0].home,
  shoulder: ARM_PARAMS.JOINTS[1].home,
  elbow: ARM_PARAMS.JOINTS[2].home,
  wrist: ARM_PARAMS.JOINTS[3].home,
};

export function useArmControl() {
  const { publish, subscribe, isConnected } = useRos();

  const [joints, setJoints] = useState<ArmJoints>(DEFAULT_JOINTS);
  const [currentPose, setCurrentPose] = useState<{ x: number; y: number; z: number }>(() =>
    forwardKinematics(
      DEFAULT_JOINTS.base,
      DEFAULT_JOINTS.shoulder,
      DEFAULT_JOINTS.elbow,
      DEFAULT_JOINTS.wrist
    )
  );

  const lastUserInteractionRef = useRef<number>(0);

  // Subscribe to live joint feedback from robot
  useEffect(() => {
    if (!isConnected) return;

    const unsubJoints = subscribe(
      ROS_CONFIG.TOPICS.ARM_JOINTS_STATE,
      'std_msgs/msg/Float64MultiArray',
      (msg: any) => {
        // Prevent feedback from overwriting sliders while user is actively interacting (within 1000ms)
        if (Date.now() - lastUserInteractionRef.current < 1000) {
          return;
        }

        if (Array.isArray(msg?.data) && msg.data.length >= 4) {
          const [base, shoulder, elbow, wrist] = msg.data.map((v: any) => Math.round(Number(v)));
          const nextJoints: ArmJoints = { base, shoulder, elbow, wrist };
          setJoints(nextJoints);
          setCurrentPose(forwardKinematics(base, shoulder, elbow, wrist));
        }
      }
    );

    const unsubPose = subscribe(
      ROS_CONFIG.TOPICS.ARM_POSE,
      'std_msgs/msg/Float64MultiArray',
      (msg: any) => {
        if (Date.now() - lastUserInteractionRef.current < 1000) {
          return;
        }
        if (Array.isArray(msg?.data) && msg.data.length >= 3) {
          setCurrentPose({
            x: Number(Number(msg.data[0]).toFixed(3)),
            y: Number(Number(msg.data[1]).toFixed(3)),
            z: Number(Number(msg.data[2]).toFixed(3)),
          });
        }
      }
    );

    return () => {
      unsubJoints();
      unsubPose();
    };
  }, [isConnected, subscribe]);

  const setJointAngle = useCallback(
    (jointName: keyof ArmJoints, angle: number) => {
      lastUserInteractionRef.current = Date.now();
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

  const setAllJoints = useCallback(
    (newJoints: ArmJoints) => {
      lastUserInteractionRef.current = Date.now();
      setJoints(newJoints);
      const fk = forwardKinematics(
        newJoints.base,
        newJoints.shoulder,
        newJoints.elbow,
        newJoints.wrist
      );
      setCurrentPose(fk);

      if (isConnected) {
        publish(ROS_CONFIG.TOPICS.ARM_JOINTS_CMD, 'std_msgs/msg/Float64MultiArray', {
          data: [newJoints.base, newJoints.shoulder, newJoints.elbow, newJoints.wrist],
        });
      }
    },
    [isConnected, publish]
  );

  const enableArm = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.ARM_ENABLE, 'std_msgs/msg/String', {
      data: 'enable',
    });
  }, [isConnected, publish]);

  const disableArm = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.ARM_ENABLE, 'std_msgs/msg/String', {
      data: 'disable',
    });
  }, [isConnected, publish]);

  const homeArm = useCallback(() => {
    setAllJoints(ARM_PRESETS.HOME.joints);
  }, [setAllJoints]);

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

  return {
    joints,
    currentPose,
    setJointAngle,
    setAllJoints,
    enableArm,
    disableArm,
    homeArm,
    sendPoseGoal,
    sendVlaPrompt,
  };
}
