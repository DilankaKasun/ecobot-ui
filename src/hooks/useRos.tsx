'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import ROSLIB from 'roslib';
import { ROS_CONFIG } from '@/lib/ros-config';
import { DetectedObject } from '@/types/ros';

interface RosContextType {
  ros: ROSLIB.Ros | null;
  isConnected: boolean;
  isConnecting: boolean;
  robotHost: string;
  streamHost: string;
  resolvedRosUrl: string;
  isMixedContentWarning: boolean;
  connectionError: string | null;
  operatorMode: 'operator' | 'observer';
  detections: DetectedObject[];
  setOperatorMode: (mode: 'operator' | 'observer') => void;
  setRobotHost: (host: string) => void;
  setStreamHost: (host: string) => void;
  publish: (topicName: string, messageType: string, message: any) => void;
  subscribe: (topicName: string, messageType: string, callback: (message: any) => void) => () => void;
  callService: (serviceName: string, serviceType: string, request?: any) => Promise<any>;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

export function isLocalOrLanHost(host: string): boolean {
  if (!host) return false;
  const clean = host.split(':')[0].replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  if (clean === 'localhost' || clean === '127.0.0.1' || clean.endsWith('.local')) return true;
  if (/^(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\./.test(clean)) return true;
  return false;
}

export function isTunnelHost(host: string): boolean {
  if (!host) return false;
  const lower = host.toLowerCase();
  return (
    lower.includes('trycloudflare.com') ||
    lower.includes('ngrok') ||
    lower.includes('loca.lt') ||
    lower.includes('serveo.net') ||
    lower.includes('pinggy') ||
    lower.includes('bore.pub') ||
    lower.includes('vercel.app')
  );
}

export function resolveRosUrl(rawHost: string): { url: string; isMixedContentWarning: boolean } {
  if (!rawHost) return { url: '', isMixedContentWarning: false };

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  let host = rawHost.trim();
  let isMixedContentWarning = false;

  // Handle explicit WebSocket schemes
  if (host.startsWith('ws://')) {
    if (isHttps) {
      isMixedContentWarning = true;
    }
    return { url: host, isMixedContentWarning };
  }

  if (host.startsWith('wss://')) {
    return { url: host, isMixedContentWarning: false };
  }

  if (host.startsWith('http://')) {
    const clean = host.replace(/^http:\/\//, '');
    if (isHttps) {
      isMixedContentWarning = true;
    }
    return { url: `ws://${clean}`, isMixedContentWarning };
  }

  if (host.startsWith('https://')) {
    const clean = host.replace(/^https:\/\//, '');
    return { url: `wss://${clean}`, isMixedContentWarning: false };
  }

  // Raw host/IP without scheme
  const defaultPort = ROS_CONFIG.ROSBRIDGE_PORT;
  const hasPort = host.includes(':');
  const hostWithPort = hasPort ? host : `${host}:${defaultPort}`;

  if (isHttps) {
    const isIp = /^\d+\.\d+\.\d+\.\d+/.test(host);
    if (isIp) {
      isMixedContentWarning = true;
      return { url: `ws://${hostWithPort}`, isMixedContentWarning };
    }
    return { url: `wss://${hostWithPort}`, isMixedContentWarning: false };
  }

  return { url: `ws://${hostWithPort}`, isMixedContentWarning: false };
}

export const RosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [robotHost, setRobotHostState] = useState<string>(ROS_CONFIG.DEFAULT_ROBOT_HOST);
  const [streamHost, setStreamHostState] = useState<string>(ROS_CONFIG.DEFAULT_STREAM_HOST || 'localhost');
  const [operatorMode, setOperatorModeState] = useState<'operator' | 'observer'>('operator');
  const [resolvedRosUrl, setResolvedRosUrl] = useState<string>('');
  const [isMixedContentWarning, setIsMixedContentWarning] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [detections, setDetections] = useState<any[]>([]);
  const rosRef = useRef<ROSLIB.Ros | null>(null);

  // Initialize host dynamically from browser URL query param, saved setting, env vars, or default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlHost = urlParams.get('robot');
      const urlStream = urlParams.get('stream');
      const urlMode = urlParams.get('mode');
      const savedHost = localStorage.getItem('ecobot_robot_host');
      const savedStreamHost = localStorage.getItem('ecobot_stream_host');
      const savedMode = localStorage.getItem('ecobot_operator_mode') as 'operator' | 'observer';
      const envHost = process.env.NEXT_PUBLIC_DEFAULT_ROBOT_HOST;
      const envStreamHost = process.env.NEXT_PUBLIC_DEFAULT_STREAM_HOST;
      const browserHost = window.location.hostname;

      let targetHost = ROS_CONFIG.DEFAULT_ROBOT_HOST;
      if (urlHost) {
        targetHost = urlHost;
      } else if (savedHost) {
        targetHost = savedHost;
      } else if (envHost) {
        targetHost = envHost;
      } else if (browserHost && isLocalOrLanHost(browserHost) && browserHost !== 'localhost' && browserHost !== '127.0.0.1') {
        targetHost = browserHost;
      }

      setRobotHostState(targetHost);

      if (urlStream) {
        setStreamHostState(urlStream);
      } else if (savedStreamHost) {
        setStreamHostState(savedStreamHost);
      } else if (envStreamHost) {
        setStreamHostState(envStreamHost);
      } else if (isTunnelHost(targetHost)) {
        setStreamHostState(ROS_CONFIG.DEFAULT_STREAM_HOST || 'localhost');
      } else {
        setStreamHostState(targetHost);
      }

      if (urlMode === 'observer' || urlMode === 'operator') {
        setOperatorModeState(urlMode);
      } else if (savedMode) {
        setOperatorModeState(savedMode);
      }
    }
  }, []);

  const setRobotHost = (newHost: string) => {
    setRobotHostState(newHost);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_robot_host', newHost);
      const savedStreamHost = localStorage.getItem('ecobot_stream_host');
      if (!savedStreamHost) {
        if (isTunnelHost(newHost)) {
          setStreamHostState(ROS_CONFIG.DEFAULT_STREAM_HOST || 'localhost');
        } else {
          setStreamHostState(newHost);
        }
      }
    }
  };

  const setStreamHost = (newHost: string) => {
    setStreamHostState(newHost);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_stream_host', newHost);
    }
  };

  const setOperatorMode = (mode: 'operator' | 'observer') => {
    setOperatorModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_operator_mode', mode);
    }
  };

  useEffect(() => {
    if (!robotHost) return;

    if (robotHost === 'mock') {
      console.log(`[RosProvider] Initializing MOCK mode...`);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setResolvedRosUrl('mock://local');
      setIsMixedContentWarning(false);
      return;
    }

    const resolved = resolveRosUrl(robotHost);
    setResolvedRosUrl(resolved.url);
    setIsMixedContentWarning(resolved.isMixedContentWarning);
    setConnectionError(null);
    setIsConnecting(true);

    console.log(`[RosProvider] Connecting to ${resolved.url}...`);

    let ros: ROSLIB.Ros | null = null;
    try {
      ros = new ROSLIB.Ros({
        url: resolved.url,
      });
    } catch (err: any) {
      console.warn(`[RosProvider] Error initializing ROS WebSocket:`, err);
      setIsConnected(false);
      setIsConnecting(false);
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps) {
        setConnectionError('Insecure WebSocket (ws://) blocked on HTTPS page (Mixed Content). Use wss:// or load over HTTP.');
      } else {
        setConnectionError(err?.message || 'WebSocket initialization failed');
      }
      return;
    }

    ros.on('connection', () => {
      console.log(`[RosProvider] Connected to ${resolved.url}`);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
    });

    ros.on('error', (error) => {
      console.warn(`[RosProvider] Connection error:`, error);
      setIsConnected(false);
      setIsConnecting(false);
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps && resolved.url.startsWith('ws://')) {
        setConnectionError('Blocked by browser: an HTTPS page cannot open an insecure WebSocket (ws://). Control falls back to the LiveKit data channel automatically — check the LiveKit room is connected. To use rosbridge directly, open the dashboard over HTTP on the LAN.');
      } else {
        setConnectionError(`Could not connect to ${resolved.url}`);
      }
    });

    ros.on('close', () => {
      console.log(`[RosProvider] Disconnected from ${resolved.url}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    rosRef.current = ros;

    return () => {
      try {
        ros?.close();
      } catch (e) {
        // ignore
      }
    };
  }, [robotHost]);

  const publish = useCallback((topicName: string, messageType: string, messageData: any) => {
    if (robotHost === 'mock') {
      console.log(`[Mock Publish] ${topicName}`, messageData);
      return;
    }
    if (!rosRef.current || !isConnected) return;
    if (operatorMode === 'observer') {
      console.warn(`[RosProvider] Blocked publish to ${topicName} because dashboard is in Observer (View Only) mode.`);
      return;
    }
    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicName,
      messageType: messageType,
    });
    const rosMsg = new ROSLIB.Message(messageData);
    topic.publish(rosMsg);
  }, [isConnected, operatorMode, robotHost]);

  const subscribe = useCallback((topicName: string, messageType: string, callback: (message: any) => void) => {
    if (robotHost === 'mock') {
      const interval = setInterval(() => {
        if (topicName === ROS_CONFIG.TOPICS.ODOM) {
          callback({
            pose: { pose: { position: { x: Math.sin(Date.now() / 2000) * 2, y: Math.cos(Date.now() / 2000) * 2 }, orientation: { w: 1, z: 0 } } },
            twist: { twist: { linear: { x: 0.5 }, angular: { z: 0.1 } } }
          });
        }
        else if (topicName === ROS_CONFIG.TOPICS.ARM_STATUS) {
          callback({
            data: JSON.stringify({ state: 'READY', joints: { base: 45, shoulder: -30, elbow: 90, wrist: 0 }, end_effector: { x: 1, y: 2, z: 3 }, gripper: 'open' })
          });
        }
        else if (topicName === ROS_CONFIG.TOPICS.HARDWARE_STATUS) {
          callback({
            data: JSON.stringify({ overall: 'OK', system: { cpu_temp: 45, cpu_load: 20, ram_used: 40 } })
          });
        }
        else if (topicName === ROS_CONFIG.TOPICS.TOF_RANGES) {
          callback({
            data: JSON.stringify({ left: Math.random() * 0.5, right: Math.random() * 0.5 })
          });
        }
        else if (topicName === ROS_CONFIG.TOPICS.DETECTIONS) {
          callback({
            data: JSON.stringify([
              { class_name: 'tomato', confidence: 0.94, distance: 0.65, box: [120, 80, 240, 220] },
              { class_name: 'weed', confidence: 0.88, distance: 0.42, box: [320, 150, 410, 270] }
            ])
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    }

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
  }, [robotHost]);

  const callService = useCallback((serviceName: string, serviceType: string, request: any = {}) => {
    return new Promise<any>((resolve, reject) => {
      if (robotHost === 'mock') {
        console.log(`[Mock Service Call] ${serviceName}`, request);
        setTimeout(() => resolve({ success: true, message: 'Mocked service success' }), 500);
        return;
      }
      if (!rosRef.current || !isConnected) {
        reject(new Error('Not connected to ROS'));
        return;
      }
      try {
        const service = new ROSLIB.Service({
          ros: rosRef.current,
          name: serviceName,
          serviceType,
        });
        const requestMsg = new ROSLIB.ServiceRequest(request);
        service.callService(requestMsg, (result) => resolve(result), (error) => reject(error));
      } catch (e) {
        reject(e);
      }
    });
  }, [isConnected, robotHost]);

  // Global subscription to detections
  useEffect(() => {
    if (!isConnected) {
      setDetections([]);
      return;
    }
    const unsub = subscribe(
      ROS_CONFIG.TOPICS.DETECTIONS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const parsed = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          if (Array.isArray(parsed)) {
            setDetections(parsed);
          } else if (parsed.detections && Array.isArray(parsed.detections)) {
            setDetections(parsed.detections);
          }
        } catch (e) {
          // ignore
        }
      }
    );
    return () => unsub();
  }, [isConnected, subscribe]);

  return (
    <RosContext.Provider
      value={{
        ros: rosRef.current,
        isConnected,
        isConnecting,
        robotHost,
        streamHost,
        resolvedRosUrl,
        isMixedContentWarning,
        connectionError,
        operatorMode,
        detections,
        setOperatorMode,
        setRobotHost,
        setStreamHost,
        publish,
        subscribe,
        callService,
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
