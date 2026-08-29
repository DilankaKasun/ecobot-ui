'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useLiveKit } from './useLiveKit';

/**
 * ROS transport over the LiveKit room's data channel.
 *
 * Exposes the same publish/subscribe/isConnected surface as useRos, so a
 * consumer can swap between the two without changing how it talks to the
 * robot. The robot side is ecobot_sensors/livekit_bridge.py.
 *
 * The point of this path is direction: both the browser and the robot dial
 * *out* to the LiveKit SFU, which is already wss://. Nothing has to connect
 * inbound to the robot, so an HTTPS-hosted dashboard needs no tunnel and no
 * public port on the robot.
 */

type Handler = (msg: any) => void;

export function useLiveKitBridge() {
  const { room, isConnected: roomConnected, sendData } = useLiveKit();

  // Set of handlers per topic, so several components can watch one topic
  // without clobbering each other's subscription.
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  // True once the robot bridge has actually sent something. Room connection
  // alone only means LiveKit is up; it does not mean the robot is present.
  const [bridgeSeen, setBridgeSeen] = useState(false);

  useEffect(() => {
    if (!room) return;

    const onData = (payload: Uint8Array) => {
      let packet: any;
      try {
        packet = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }
      if (!packet || packet.op !== 'topic' || typeof packet.topic !== 'string') {
        return;
      }

      setBridgeSeen(true);

      const handlers = handlersRef.current.get(packet.topic);
      if (!handlers) return;
      handlers.forEach((fn) => {
        try {
          fn(packet.msg);
        } catch (e) {
          console.warn('[LiveKitBridge] handler threw for', packet.topic, e);
        }
      });
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  useEffect(() => {
    if (!roomConnected) setBridgeSeen(false);
  }, [roomConnected]);

  const subscribe = useCallback(
    (topic: string, _messageType: string, callback: Handler) => {
      const map = handlersRef.current;
      if (!map.has(topic)) map.set(topic, new Set());
      map.get(topic)!.add(callback);

      // Announced for parity with rosbridge. The robot forwards a fixed
      // allowlist of topics, so this does not gate delivery.
      sendData({ op: 'subscribe', topic }).catch(() => {});

      return () => {
        const handlers = map.get(topic);
        if (!handlers) return;
        handlers.delete(callback);
        if (handlers.size === 0) map.delete(topic);
      };
    },
    [sendData]
  );

  const publish = useCallback(
    (topic: string, messageType: string, messageData: any) => {
      if (!roomConnected) return;
      sendData({ op: 'publish', topic, type: messageType, msg: messageData }).catch(
        () => {}
      );
    },
    [roomConnected, sendData]
  );

  return {
    publish,
    subscribe,
    // Only report connected once the robot bridge has actually been heard
    // from, so callers do not sit publishing into an empty room.
    isConnected: roomConnected && bridgeSeen,
    isRoomConnected: roomConnected,
  };
}
