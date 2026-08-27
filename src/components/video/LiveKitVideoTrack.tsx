'use client';

import React, { useRef, useEffect } from 'react';
import { RemoteTrack } from 'livekit-client';

interface LiveKitVideoTrackProps {
  track: RemoteTrack | null | undefined;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
}

export const LiveKitVideoTrack: React.FC<LiveKitVideoTrackProps> = ({
  track,
  className = 'w-full h-full',
  objectFit = 'cover',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;

    try {
      track.attach(el);
    } catch (err) {
      console.warn('[LiveKitVideoTrack attach error]', err);
    }

    return () => {
      try {
        track.detach(el);
      } catch (err) {
        // ignore
      }
    };
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ objectFit }}
      className={`${className}`}
    />
  );
};
