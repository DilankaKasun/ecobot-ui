'use client';

import { useMemo } from 'react';
import { useRos } from './useRos';
import { useLiveKitBridge } from './useLiveKitBridge';

/**
 * Picks how to talk to the robot, exposing one publish/subscribe surface.
 *
 * rosbridge is preferred whenever it is actually connected: on the LAN it is
 * a direct socket to the robot with no SFU hop. It cannot connect from an
 * HTTPS-hosted page, though — the browser blocks ws:// as mixed content —
 * so there the LiveKit data channel takes over, since both ends dial out to
 * an endpoint that is already wss://.
 *
 * The upshot is that the same components work on the LAN and on Vercel with
 * no tunnel and no per-environment configuration.
 */
export type RobotTransport = 'rosbridge' | 'livekit' | 'none';

export function useRobotLink() {
  const ros = useRos();
  const bridge = useLiveKitBridge();

  const transport: RobotTransport = ros.isConnected
    ? 'rosbridge'
    : bridge.isConnected
      ? 'livekit'
      : 'none';

  return useMemo(
    () => ({
      transport,
      isConnected: transport !== 'none',
      publish: transport === 'rosbridge' ? ros.publish : bridge.publish,
      subscribe: transport === 'rosbridge' ? ros.subscribe : bridge.subscribe,
    }),
    [transport, ros.publish, ros.subscribe, bridge.publish, bridge.subscribe]
  );
}
