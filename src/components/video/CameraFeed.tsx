'use client';

import React, { useState } from 'react';
import { useRos, isTunnelHost } from '@/hooks/useRos';
import { ROS_CONFIG } from '@/lib/ros-config';
import { Camera, RefreshCw, AlertCircle, ShieldAlert, ExternalLink } from 'lucide-react';

interface CameraFeedProps {
  title: string;
  port: number;
  endpoint?: string;
  aspectRatio?: 'video' | 'square';
}

export function resolveStreamUrl(
  robotHost: string,
  streamHost: string | undefined,
  port: number,
  endpoint: string,
  refreshKey: number
): string {
  if (!robotHost && !streamHost) return '';

  let targetHost = (streamHost && streamHost.trim()) || robotHost.trim();

  const cleanHost = targetHost
    .replace(/^wss?:\/\//, '')
    .replace(/^https?:\/\//, '')
    .split(':')[0];

  const scheme = (targetHost.startsWith('wss://') || targetHost.startsWith('https://')) ? 'https' : 'http';

  // If using a Cloudflare/Ngrok tunnel, the port is handled by the tunnel, so omit it.
  if (isTunnelHost(targetHost)) {
    return `${scheme}://${cleanHost}/${endpoint}?t=${refreshKey}`;
  }

  return `${scheme}://${cleanHost}:${port}/${endpoint}?t=${refreshKey}`;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  title,
  port,
  endpoint = 'stream.mjpg',
  aspectRatio = 'video',
}) => {
  const { robotHost, streamHost, isConnected, detections } = useRos();
  const [streamError, setStreamError] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const streamUrl = resolveStreamUrl(robotHost, streamHost, port, endpoint, refreshKey);
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

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
        {streamError ? (
          <div className="flex flex-col items-center gap-2 text-gray-300 text-xs p-4 text-center max-w-sm">
            {isHttpsPage ? (
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500/80" />
            )}
            <span className="font-semibold text-amber-200">Stream Blocked (Port {port})</span>

            {isHttpsPage ? (
              <div className="space-y-2 text-left bg-black/60 border border-amber-500/30 p-3 rounded-lg text-[11px]">
                <div className="flex items-center justify-between font-semibold text-amber-300">
                  <span>How to Allow Video Stream in Chrome/Edge:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[10.5px]">
                  <li>Click the <strong>Site Settings / Lock icon</strong> next to URL in address bar.</li>
                  <li>Click <strong>Site settings</strong>.</li>
                  <li>Set <strong>Insecure content</strong> to <span className="text-emerald-400 font-bold">Allow</span>.</li>
                  <li>Reload this tab.</li>
                </ol>
              </div>
            ) : (
              <span className="text-gray-400 text-[11px]">Ensure the video server is running on the robot.</span>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded text-xs hover:bg-blue-600/50"
              >
                Retry Connection
              </button>
              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-card-border hover:bg-gray-700 text-gray-300 rounded text-xs flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Direct
                </a>
              )}
            </div>
          </div>
        ) : (robotHost === 'mock' && (!streamHost || streamHost === 'mock' || streamHost === ROS_CONFIG.DEFAULT_ROBOT_HOST)) ? (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 to-black flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
             <div className="flex flex-col items-center gap-2 z-10 text-blue-300/80">
               <Camera className="w-8 h-8 opacity-50" />
               <span className="text-sm font-mono tracking-wider font-bold">MOCK CAMERA FEED</span>
             </div>
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
