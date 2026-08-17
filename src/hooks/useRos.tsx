'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import ROSLIB from 'roslib';
import { ROS_CONFIG } from '@/lib/ros-config';

interface RosContextType {
  ros: ROSLIB.Ros | null;
  isConnected: boolean;
  isConnecting: boolean;
  robotHost: string;
  setRobotHost: (host: string) => void;
  publish: (topicName: string, messageType: string, message: any) => void;
  subscribe: (topicName: string, messageType: string, callback: (message: any) => void) => () => void;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

export const RosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [robotHost, setRobotHostState] = useState<string>(ROS_CONFIG.DEFAULT_ROBOT_HOST);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const rosRef = useRef<ROSLIB.Ros | null>(null);

  // Initialize host dynamically from browser URL, query param, or saved setting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlHost = urlParams.get('robot');
      const savedHost = localStorage.getItem('ecobot_robot_host');
      const browserHost = window.location.hostname;

      let targetHost = ROS_CONFIG.DEFAULT_ROBOT_HOST;
      if (urlHost) {
        targetHost = urlHost;
      } else if (savedHost) {
        targetHost = savedHost;
      } else if (browserHost && browserHost !== 'localhost' && browserHost !== '127.0.0.1') {
        targetHost = browserHost;
      } else {
        targetHost = ROS_CONFIG.DEFAULT_ROBOT_HOST;
      }

      setRobotHostState(targetHost);
    }
  }, []);

  const setRobotHost = (newHost: string) => {
    setRobotHostState(newHost);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_robot_host', newHost);
    }
  };

  useEffect(() => {
    if (!robotHost) return;

    setIsConnecting(true);
    const rosUrl = `ws://${robotHost}:${ROS_CONFIG.ROSBRIDGE_PORT}`;
    console.log(`[RosProvider] Connecting to ${rosUrl}...`);

    const ros = new ROSLIB.Ros({
      url: rosUrl,
    });

    ros.on('connection', () => {
      console.log(`[RosProvider] Connected to ${rosUrl}`);
      setIsConnected(true);
      setIsConnecting(false);
    });

    ros.on('error', (error) => {
      console.warn(`[RosProvider] Connection error:`, error);
      setIsConnected(false);
      setIsConnecting(false);
    });

    ros.on('close', () => {
      console.log(`[RosProvider] Disconnected from ${rosUrl}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    rosRef.current = ros;

    return () => {
      try {
        ros.close();
      } catch (e) {
        // ignore
      }
    };
  }, [robotHost]);

  const publish = useCallback((topicName: string, messageType: string, messageData: any) => {
    if (!rosRef.current || !isConnected) return;
    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicName,
      messageType: messageType,
    });
    const rosMsg = new ROSLIB.Message(messageData);
    topic.publish(rosMsg);
  }, [isConnected]);

  const subscribe = useCallback((topicName: string, messageType: string, callback: (message: any) => void) => {
    if (!rosRef.current) return () => {};
    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicName,
      messageType: messageType,
      throttle_rate: 50,
    });
    topic.subscribe(callback);

    return () => {
      try {
        topic.unsubscribe(callback);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <RosContext.Provider
      value={{
        ros: rosRef.current,
        isConnected,
        isConnecting,
        robotHost,
        setRobotHost,
        publish,
        subscribe,
      }}
    >
      {children}
    </RosContext.Provider>
  );
};

export const useRos = () => {
  const context = useContext(RosContext);
  if (!context) {
    throw new Error('useRos must be used within a RosProvider');
  }
  return context;
};
