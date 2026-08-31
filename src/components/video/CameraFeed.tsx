'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRos, isTunnelHost, isLocalOrLanHost } from '@/hooks/useRos';
import { useLiveKit } from '@/hooks/useLiveKit';
import { LiveKitVideoPlayer } from './LiveKitVideoPlayer';
import { VideoLoading } from './VideoLoading';
import { ROS_CONFIG } from '@/lib/ros-config';
import { Camera, RefreshCw, AlertCircle, ShieldAlert, ExternalLink, Eye, Maximize2 } from 'lucide-react';

export interface StreamOption {
  label: string;
  port: number;
  endpoint: string;
  livekitTrackName?: string;
}

interface CameraFeedProps {
  title: string;
  port: number;
  endpoint?: string;
  livekitTrackName?: string;
  aspectRatio?: 'video' | 'square';
  streamOptions?: StreamOption[];
}

export function resolveStreamUrl(
  robotHost: string,
  streamHost: string | undefined,
  port: number,
  endpoint: string = 'stream.mjpg',
  refreshKey: number = 0
): string {
  const host = (streamHost && streamHost.trim()) || (robotHost && robotHost.trim()) || '';
  if (!host || host === 'mock') return '';

  // If host is already a full image/stream URL
  if (/^https?:\/\/.+\.(mjpg|mjpeg|jpg|jpeg|png)($|\?)/i.test(host)) {
    const separator = host.includes('?') ? '&' : '?';
    return `${host}${separator}t=${refreshKey}`;
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  let protocol = isHttps ? 'https:' : 'http:';
  let clean = host;

  if (/^https?:\/\//i.test(clean)) {
    protocol = clean.startsWith('https://') ? 'https:' : 'http:';
    clean = clean.replace(/^https?:\/\//i, '');
  } else if (/^wss?:\/\//i.test(clean)) {
    protocol = clean.startsWith('wss://') ? 'https:' : 'http:';
    clean = clean.replace(/^wss?:\/\//i, '');
  }

  clean = clean.replace(/\/+$/, '');

  // Check if tunnel host
  if (isTunnelHost(clean)) {
    if (clean.includes('/')) {
      return `https://${clean}?t=${refreshKey}`;
    }
    return `https://${clean}/${endpoint}?t=${refreshKey}`;
  }

  // Handle explicit port in host string
  if (clean.includes(':')) {
    const [h, p] = clean.split(':');
    const portPart = p.split('/')[0];
    const pathPart = p.includes('/') ? p.substring(p.indexOf('/') + 1) : endpoint;
    const finalScheme = isHttps && !isLocalOrLanHost(h) ? 'https' : protocol;
    return `${finalScheme}://${h}:${portPart}/${pathPart}?t=${refreshKey}`;
  }

  const hostName = clean.split('/')[0];
  const finalScheme = isHttps && !isLocalOrLanHost(hostName) ? 'https' : protocol;
  return `${finalScheme}://${hostName}:${port}/${endpoint}?t=${refreshKey}`;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  title,
  port: initialPort,
  endpoint: initialEndpoint = 'stream.mjpg',
  livekitTrackName: initialLivekitTrackName,
  aspectRatio = 'video',
  streamOptions,
}) => {
  const { robotHost, streamHost, detections } = useRos();
  const { isConnected: isLiveKitConnected, videoTracks, mainCameraTrack, wristCameraTrack } = useLiveKit();

  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [streamMode, setStreamMode] = useState<'http' | 'livekit'>('http');
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [isStreamLoading, setIsStreamLoading] = useState<boolean>(true);
  const feedRef = useRef<HTMLDivElement>(null);

  const activePort = streamOptions ? streamOptions[selectedOptionIndex].port : initialPort;
  const activeEndpoint = streamOptions ? streamOptions[selectedOptionIndex].endpoint : initialEndpoint;
  const activeLivekitTrackName = streamOptions
    ? streamOptions[selectedOptionIndex].livekitTrackName || initialLivekitTrackName
    : initialLivekitTrackName;

  // Find matching LiveKit track
  const matchingLiveKitTrack = React.useMemo(() => {
    if (!isLiveKitConnected) return null;
    if (activeLivekitTrackName) {
      const match = videoTracks.find((t) =>
        t.trackName.toLowerCase().includes(activeLivekitTrackName.toLowerCase()) ||
        t.source.toLowerCase().includes(activeLivekitTrackName.toLowerCase())
      );
      if (match) return match.track;
    }
    // Fallback: match by title or port
    if (activePort === ROS_CONFIG.ARM_CAMERA_PORT || title.toLowerCase().includes('wrist') || title.toLowerCase().includes('arm')) {
      return wristCameraTrack;
    }
    return mainCameraTrack;
  }, [isLiveKitConnected, activeLivekitTrackName, videoTracks, activePort, title, wristCameraTrack, mainCameraTrack]);

  // Auto-switch to LiveKit if connected and track exists
  useEffect(() => {
    if (isLiveKitConnected && matchingLiveKitTrack && streamMode === 'http') {
      setStreamMode('livekit');
    }
  }, [isLiveKitConnected, matchingLiveKitTrack, streamMode]);

  const streamUrl = resolveStreamUrl(robotHost, streamHost, activePort, activeEndpoint, refreshKey);
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // A fresh stream URL or source means waiting on a first frame again.
  useEffect(() => {
    setIsStreamLoading(true);
  }, [streamUrl, streamMode]);

  // Reconnect the feed: re-select the best available source — WebRTC when a
  // LiveKit track is up, MJPEG otherwise — and force it to start over. This is
  // what the separate LiveKit button used to do, folded into one control.
  const handleRefresh = () => {
    setStreamError(false);
    setIsStreamLoading(true);
    setStreamMode(matchingLiveKitTrack ? 'livekit' : 'http');
    setRefreshKey((k) => k + 1);
  };

  // Fullscreening the feed is also what switches AI plant scanning on for it.
  const toggleFullscreen = () => {
    const el = feedRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
    setStreamError(false);
    setIsStreamLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const isMock = robotHost === 'mock' || streamHost === 'mock';

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg flex flex-col">
      <div className="px-4 py-2.5 bg-background/50 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {streamOptions && streamOptions.length > 0 && (
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-card-border">
              {streamOptions.map((opt, idx) => (
                <button
                  key={opt.label}
                  onClick={() => handleSelectOption(idx)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    selectedOptionIndex === idx
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {detections && detections.length > 0 && (
            <button
              onClick={() => setShowOverlays((v) => !v)}
              className={`p-1 px-1.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                showOverlays ? 'bg-primary/20 text-primary border border-primary/40' : 'text-gray-400 hover:text-white'
              }`}
              title="Toggle AI Detection Overlays"
            >
              <Eye className="w-3 h-3" />
              <span>AI</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-card-border transition-colors"
            title="Reconnect video stream (uses LiveKit WebRTC when available)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-card-border transition-colors"
            title="Fullscreen (starts AI plant scanning on this feed)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className={`relative bg-black flex items-center justify-center overflow-hidden [&:fullscreen]:aspect-auto [&:fullscreen]:w-screen [&:fullscreen]:h-screen ${
          aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
        }`}
      >
        {isMock ? (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950 via-gray-950 to-black flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,229,192,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,192,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="flex flex-col items-center gap-2 z-10 text-primary/80">
              <Camera className="w-8 h-8 opacity-60 animate-pulse" />
              <span className="text-xs font-mono tracking-widest font-bold">MOCK VIDEO STREAM ACTIVE</span>
              <span className="text-[10px] font-mono text-gray-400">{title} • Port {activePort}</span>
            </div>
          </div>
        ) : streamMode === 'livekit' && matchingLiveKitTrack ? (
          <LiveKitVideoPlayer
            key={`livekit-${refreshKey}`}
            track={matchingLiveKitTrack}
            objectFit="contain"
            className="w-full h-full"
            showStats={true}
            trackName={activeLivekitTrackName || title}
          />
        ) : streamError ? (
          <div className="flex flex-col items-center gap-2 text-gray-300 text-xs p-4 text-center max-w-sm">
            {isHttpsPage ? (
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500/80" />
            )}
            <span className="font-semibold text-amber-200">Stream Blocked or Offline (Port {activePort})</span>

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
              <span className="text-gray-400 text-[11px]">Ensure the video server (mjpg_streamer / ros_rtsp / LiveKit) is running on the robot host.</span>
            )}

            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
              <button
                onClick={handleRefresh}
                className="px-3 py-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded text-xs hover:bg-blue-600/50 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect stream
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
        ) : (
          <>
            <img
              src={streamUrl}
              alt={title}
              onLoad={() => setIsStreamLoading(false)}
              onError={() => {
                setIsStreamLoading(false);
                setStreamError(true);
              }}
              className="w-full h-full object-contain"
            />
            {/* No URL means nothing will ever load — do not spin forever. */}
            {isStreamLoading && streamUrl && <VideoLoading label="Loading video stream" />}
          </>
        )}

        {/* AI Detection Bounding Boxes Overlay */}
        {showOverlays && detections && detections.length > 0 && !streamError && (
          <div className="absolute inset-0 pointer-events-none">
            {detections.map((det, i) => {
              if (!det.box || !Array.isArray(det.box) || det.box.length < 4) return null;
              const [x1, y1, x2, y2] = det.box;
              const left = (x1 / 640) * 100;
              const top = (y1 / 480) * 100;
              const width = ((x2 - x1) / 640) * 100;
              const height = ((y2 - y1) / 480) * 100;

              return (
                <div
                  key={i}
                  className="absolute border-2 border-primary bg-primary/10 rounded"
                  style={{
                    left: `${Math.max(0, Math.min(95, left))}%`,
                    top: `${Math.max(0, Math.min(95, top))}%`,
                    width: `${Math.max(5, Math.min(100, width))}%`,
                    height: `${Math.max(5, Math.min(100, height))}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 bg-primary text-black font-mono font-bold text-[10px] px-1 py-0.5 rounded shadow">
                    {det.class_name} {Math.round(det.confidence * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
