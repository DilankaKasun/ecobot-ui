'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRos } from './useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { PlantMissionStatus, PlantWaypoint } from '@/types/ros';

export function usePlantMission() {
  const { subscribe, publish, isConnected } = useRos();

  const [missionStatus, setMissionStatus] = useState<PlantMissionStatus>({
    status: 'IDLE',
    currentPlant: 0,
    totalPlants: 0,
    captures: 0,
  });

  const [waypoints, setWaypoints] = useState<PlantWaypoint[]>([
    { id: 1, x: 1.2, y: 0.5, status: 'pending' },
    { id: 2, x: 2.4, y: -0.8, status: 'pending' },
    { id: 3, x: 3.5, y: 0.2, status: 'pending' },
  ]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubStatus = subscribe(
      ROS_CONFIG.TOPICS.PLANT_SCAN_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          setMissionStatus((prev) => ({
            ...prev,
            status: data.status || prev.status,
            currentPlant: data.current_index || prev.currentPlant,
            totalPlants: data.total_plants || prev.totalPlants,
            captures: data.captures_count || prev.captures,
            lastDiagnosis: data.diagnosis || prev.lastDiagnosis,
          }));
        } catch (e) {
          // ignore
        }
      }
    );

    return () => {
      unsubStatus();
    };
  }, [isConnected, subscribe]);

  const startMission = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.PLANT_SCAN_CMD, 'std_msgs/msg/String', {
      data: JSON.stringify({ command: 'start', waypoints }),
    });
  }, [isConnected, waypoints, publish]);

  const nextPlant = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.PLANT_SCAN_CMD, 'std_msgs/msg/String', {
      data: JSON.stringify({ command: 'next' }),
    });
  }, [isConnected, publish]);

  const stopMission = useCallback(() => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.PLANT_SCAN_CMD, 'std_msgs/msg/String', {
      data: JSON.stringify({ command: 'stop' }),
    });
  }, [isConnected, publish]);

  return {
    missionStatus,
    waypoints,
    setWaypoints,
    startMission,
    nextPlant,
    stopMission,
  };
}
