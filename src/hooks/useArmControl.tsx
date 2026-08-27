'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { ArmJoints, ArmPoseGoal } from '@/types/ros';
import { forwardKinematics, ARM_PARAMS } from '@/lib/kinematics';

export const ARM_PRESETS = [
  { name: 'Home', label: '🏠 Home', joints: { base: 100, shoulder: 117, elbow: 180, wrist: 35 } },
  { name: 'Forward', label: '🔍 Forward View', joints: { base: 100, shoulder: 90, elbow: 90, wrist: 90 } },
  { name: 'Ground', label: '⬇️ Ground Reach', joints: { base: 100, shoulder: 45, elbow: 135, wrist: 45 } },
  { name: 'Stow', label: '📦 Stow/Rest', joints: { base: 100, shoulder: 180, elbow: 180, wrist: 0 } },
];

interface ArmContextType {
  joints: ArmJoints;
  currentPose: { x: number; y: number; z: number };
  setJointAngle: (jointName: keyof ArmJoints, angle: number) => void;
  stepJoint: (jointName: keyof ArmJoints, delta: number) => void;
  setAllJoints: (joints: ArmJoints) => void;
  homeArm: () => void;
  sendPoseGoal: (goal: ArmPoseGoal) => void;
  sendVlaPrompt: (prompt: string) => void;
}

const ArmContext = createContext<ArmContextType | undefined>(undefined);

export const ArmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publish, isConnected, operatorMode } = useRos();

  const [joints, setJoints] = useState<ArmJoints>({
    base: 100,
    shoulder: 117,
    elbow: 180,
    wrist: 35,
  });

  const [currentPose, setCurrentPose] = useState<{ x: number; y: number; z: number }>(() =>
    forwardKinematics(100, 117, 180, 35)
  );

  const jointsRef = useRef<ArmJoints>(joints);
  jointsRef.current = joints;

  // Immediate ROS publisher — exact same mechanism used by the working presets
  const emitJointsToRos = useCallback(() => {
    if (!isConnected || operatorMode === 'observer') return;

    const latest = jointsRef.current;
    publish(ROS_CONFIG.TOPICS.ARM_JOINTS_CMD, 'std_msgs/msg/Float64MultiArray', {
      data: [
        Number(latest.base),
        Number(latest.shoulder),
        Number(latest.elbow),
        Number(latest.wrist),
      ],
    });
  }, [isConnected, operatorMode, publish]);

  const setJointAngle = useCallback(
    (jointName: keyof ArmJoints, angle: number) => {
      const jointSpec = ARM_PARAMS.JOINTS.find((j) => j.name === jointName);
      const min = jointSpec?.min ?? 0;
      const max = jointSpec?.max ?? 180;
      const clampedAngle = Math.max(min, Math.min(max, Math.round(angle)));

      const nextJoints = { ...jointsRef.current, [jointName]: clampedAngle };
      jointsRef.current = nextJoints;
      setJoints(nextJoints);

      const fk = forwardKinematics(
        nextJoints.base,
        nextJoints.shoulder,
        nextJoints.elbow,
        nextJoints.wrist
      );
      setCurrentPose(fk);

      emitJointsToRos();
    },
    [emitJointsToRos]
  );

  const stepJoint = useCallback(
    (jointName: keyof ArmJoints, delta: number) => {
      const current = jointsRef.current[jointName] ?? 0;
      setJointAngle(jointName, current + delta);
    },
    [setJointAngle]
  );

  const setAllJoints = useCallback(
    (newJoints: ArmJoints) => {
      jointsRef.current = newJoints;
      setJoints(newJoints);
      setCurrentPose(
        forwardKinematics(newJoints.base, newJoints.shoulder, newJoints.elbow, newJoints.wrist)
      );
      emitJointsToRos();
    },
    [emitJointsToRos]
  );

  const homeArm = useCallback(() => {
    const homeState: ArmJoints = { base: 100, shoulder: 117, elbow: 180, wrist: 35 };
    setAllJoints(homeState);
  }, [setAllJoints]);

  const sendPoseGoal = useCallback(
    (goal: ArmPoseGoal) => {
      if (!isConnected || operatorMode === 'observer') return;
      publish(ROS_CONFIG.TOPICS.ARM_POSE_GOAL, 'std_msgs/msg/Float64MultiArray', {
        data: [goal.x, goal.y, goal.z],
      });
    },
    [isConnected, operatorMode, publish]
  );

  const sendVlaPrompt = useCallback(
    (prompt: string) => {
      if (!isConnected || operatorMode === 'observer' || !prompt.trim()) return;
      publish(ROS_CONFIG.TOPICS.VLA_PROMPT, 'std_msgs/msg/String', {
        data: prompt.trim(),
      });
    },
    [isConnected, operatorMode, publish]
  );

  return (
    <ArmContext.Provider
      value={{
        joints,
        currentPose,
        setJointAngle,
        stepJoint,
        setAllJoints,
        homeArm,
        sendPoseGoal,
        sendVlaPrompt,
      }}
    >
      {children}
    </ArmContext.Provider>
  );
};

export const useArmControl = () => {
  const context = useContext(ArmContext);
  if (!context) {
    return {
      joints: { base: 100, shoulder: 117, elbow: 180, wrist: 35 },
      currentPose: forwardKinematics(100, 117, 180, 35),
      setJointAngle: () => {},
      stepJoint: () => {},
      setAllJoints: () => {},
      homeArm: () => {},
      sendPoseGoal: () => {},
      sendVlaPrompt: () => {},
    };
  }
  return context;
};
