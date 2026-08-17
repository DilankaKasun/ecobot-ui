'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import ROSLIB from 'roslib';
import { ROS_CONFIG } from '@/lib/ros-config';

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
  const [streamHost, setStreamHostState] = useState<string>(ROS_CONFIG.DEFAULT_ROBOT_HOST);
  const [operatorMode, setOperatorModeState] = useState<'operator' | 'observer'>('operator');
  const [resolvedRosUrl, setResolvedRosUrl] = useState<string>('');
  const [isMixedContentWarning, setIsMixedContentWarning] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
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
        setStreamHostState(ROS_CONFIG.DEFAULT_ROBOT_HOST);
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
          setStreamHostState(ROS_CONFIG.DEFAULT_ROBOT_HOST);
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
        setConnectionError('Blocked by browser: Insecure WebSocket (ws://) cannot be initiated on an HTTPS page (Mixed Content). Use a wss:// tunnel or run dashboard over HTTP.');
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
  }, [isConnected, operatorMode]);

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

  const callService = useCallback((serviceName: string, serviceType: string, request: any = {}) => {
    return new Promise<any>((resolve, reject) => {
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
  }, [isConnected]);

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
