'use client';

import React, { useState } from 'react';
import { useRos } from '@/hooks/useRos';
import { Camera, RefreshCw, Maximize2, AlertCircle } from 'lucide-react';

interface CameraFeedProps {
  title: string;
  port: number;
  endpoint?: string;
  aspectRatio?: 'video' | 'square';
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  title,
  port,
  endpoint = 'stream.mjpg',
  aspectRatio = 'video',
}) => {
  const { robotHost, isConnected } = useRos();
  const [streamError, setStreamError] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const streamUrl = `http://${robotHost}:${port}/${endpoint}?t=${refreshKey}`;

  const handleRefresh = () => {
    setStreamError(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg flex flex-col">
      <div className="px-4 py-2.5 bg-background/50 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-card-border transition-colors"
            title="Reload Video Stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className={`relative bg-black flex items-center justify-center overflow-hidden ${
          aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
        }`}
      >
        {!isConnected ? (
          <div className="flex flex-col items-center gap-2 text-gray-500 text-xs">
            <AlertCircle className="w-6 h-6 text-rose-500/80" />
            <span>Robot Offline</span>
          </div>
        ) : streamError ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 text-xs p-4 text-center">
            <AlertCircle className="w-6 h-6 text-amber-500/80" />
            <span>Cannot connect to stream on port {port}</span>
            <button
              onClick={handleRefresh}
              className="mt-1 px-3 py-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded text-xs hover:bg-blue-600/50"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <img
            src={streamUrl}
            alt={title}
            onError={() => setStreamError(true)}
            className="w-full h-full object-contain"
          />
        )}
      </div>
    </div>
  );
};
