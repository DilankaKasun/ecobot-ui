'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  DataPacket_Kind,
  ConnectionState,
} from 'livekit-client';

export interface VideoTrackInfo {
  sid: string;
  source: string;
  trackName: string;
  participantIdentity: string;
  track: RemoteTrack;
}

interface LiveKitContextType {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  livekitUrl: string;
  roomName: string;
  token: string;
  error: string | null;
  videoTracks: VideoTrackInfo[];
  mainCameraTrack: RemoteTrack | null;
  wristCameraTrack: RemoteTrack | null;
  connect: (customUrl?: string, customToken?: string, customRoom?: string) => Promise<void>;
  disconnect: () => void;
  sendData: (data: string | object, topic?: string) => Promise<void>;
  setLivekitUrl: (url: string) => void;
  setRoomName: (name: string) => void;
  setToken: (token: string) => void;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export const LiveKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [livekitUrl, setLivekitUrlState] = useState<string>(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://govimithuru-agent-c8j0bu7s.livekit.cloud');
  const [roomName, setRoomNameState] = useState<string>(process.env.NEXT_PUBLIC_LIVEKIT_ROOM || 'ecobot-control');
  const [token, setTokenState] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackInfo[]>([]);

  const roomRef = useRef<Room | null>(null);

  // Load configuration from localStorage or env on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('ecobot_livekit_url') || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://govimithuru-agent-c8j0bu7s.livekit.cloud';
      const savedRoom = localStorage.getItem('ecobot_livekit_room') || process.env.NEXT_PUBLIC_LIVEKIT_ROOM || 'ecobot-control';
      const savedToken = localStorage.getItem('ecobot_livekit_token') || '';

      if (savedUrl) setLivekitUrlState(savedUrl);
      if (savedRoom) setRoomNameState(savedRoom);
      if (savedToken) setTokenState(savedToken);
    }
  }, []);

  const setLivekitUrl = (url: string) => {
    setLivekitUrlState(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_livekit_url', url);
    }
  };

  const setRoomName = (name: string) => {
    setRoomNameState(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_livekit_room', name);
    }
  };

  const setToken = (t: string) => {
    setTokenState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecobot_livekit_token', t);
    }
  };

  const updateTracks = (room: Room) => {
    const list: VideoTrackInfo[] = [];
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.kind === Track.Kind.Video && pub.track) {
          list.push({
            sid: pub.trackSid,
            source: pub.source || 'camera',
            trackName: pub.trackName || '',
            participantIdentity: participant.identity,
            track: pub.track,
          });
        }
      });
    });
    setVideoTracks(list);
  };

  const connect = useCallback(async (customUrl?: string, customToken?: string, customRoom?: string) => {
    const targetUrl = customUrl || livekitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
    let targetToken = customToken || token;
    const targetRoom = customRoom || roomName || 'ecobot-teleop';

    if (!targetUrl) {
      setError('LiveKit URL not configured. Enter a valid LiveKit WebSocket URL (wss://...).');
      return;
    }

    // If no token provided, try fetching one from /api/livekit-token
    if (!targetToken) {
      try {
        const res = await fetch(`/api/livekit-token?room=${encodeURIComponent(targetRoom)}`);
        const data = await res.json();
        if (data.token) {
          targetToken = data.token;
          setToken(data.token);
        } else if (data.error) {
          setError(`Token generation error: ${data.error}. Enter a token manually in Settings.`);
          return;
        }
      } catch (e: any) {
        setError('Failed to fetch token from backend. Please provide token manually.');
        return;
      }
    }

    if (!targetToken) {
      setError('No valid LiveKit access token available.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Clean up previous room if exists
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        setIsConnected(state === ConnectionState.Connected);
        setIsConnecting(state === ConnectionState.Connecting || state === ConnectionState.Reconnecting);
      });

      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        updateTracks(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsConnecting(false);
        setVideoTracks([]);
      });

      room.on(RoomEvent.TrackSubscribed, () => {
        updateTracks(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        updateTracks(room);
      });

      room.on(RoomEvent.TrackMuted, () => {
        updateTracks(room);
      });

      room.on(RoomEvent.TrackUnmuted, () => {
        updateTracks(room);
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        updateTracks(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateTracks(room);
      });

      await room.connect(targetUrl, targetToken);
      roomRef.current = room;
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to LiveKit room');
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [livekitUrl, token, roomName]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setVideoTracks([]);
  }, []);

  const sendData = useCallback(async (data: string | object, topic?: string) => {
    if (!roomRef.current || !isConnected) return;
    try {
      const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);
      const encoder = new TextEncoder();
      const payload = encoder.encode(payloadStr);
      await roomRef.current.localParticipant.publishData(payload, {
        reliable: true,
        topic,
      });
    } catch (e) {
      console.warn('[LiveKit sendData Error]', e);
    }
  }, [isConnected]);

  // Identify main navigation camera track and wrist camera track
  const mainCameraTrack = videoTracks.find(
    (t) =>
      t.trackName.toLowerCase().includes('realsense') ||
      t.trackName.toLowerCase().includes('main') ||
      t.source === 'camera' ||
      t.trackName === 'camera'
  )?.track || (videoTracks.length > 0 ? videoTracks[0].track : null);

  const wristCameraTrack = videoTracks.find(
    (t) =>
      t.trackName.toLowerCase().includes('wrist') ||
      t.trackName.toLowerCase().includes('arm')
  )?.track || (videoTracks.length > 1 ? videoTracks[1].track : null);

  return (
    <LiveKitContext.Provider
      value={{
        room: roomRef.current,
        isConnected,
        isConnecting,
        connectionState,
        livekitUrl,
        roomName,
        token,
        error,
        videoTracks,
        mainCameraTrack,
        wristCameraTrack,
        connect,
        disconnect,
        sendData,
        setLivekitUrl,
        setRoomName,
        setToken,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  );
};

export const useLiveKit = () => {
  const context = useContext(LiveKitContext);
  if (!context) {
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  }
  return context;
};
