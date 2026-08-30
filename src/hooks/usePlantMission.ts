'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/**
 * Plant scanning mission: progress, the shots as they are taken, and the
 * report Gemini writes at the end.
 *
 * Field names here follow what plant_mission_node actually publishes on
 * /ecobot/plant_scan_status — idx, total, results — rather than the
 * current_index/total_plants/diagnosis this hook used to look for, none of
 * which the node has ever sent.
 */

export interface ScanCapture {
  /** Viewpoint label, e.g. v03_mid_foliage_elev+42_h520. */
  label: string;
  /** Object URL for the JPEG; revoked when the capture list is replaced. */
  url: string;
  index: number;
  at: number;
}

export interface PlantReport {
  timestamp?: number;
  [key: string]: unknown;
}

export interface MissionStatus {
  status: string;
  idx: number;
  total: number;
  samples: number;
  captures: number;
  results: PlantReport[];
  waypoints: { x: number; y: number }[];
  error?: string;
}

const EMPTY: MissionStatus = {
  status: 'IDLE',
  idx: 0,
  total: 0,
  samples: 6,
  captures: 0,
  results: [],
  waypoints: [],
};

/** Keep the strip bounded; a long mission would otherwise grow without limit. */
const MAX_CAPTURES = 24;

function hexToBlobUrl(hex: string): string | null {
  if (!hex || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
}

export function usePlantMission() {
  const { subscribe, publish, isConnected } = useRobotLink();
  const [status, setStatus] = useState<MissionStatus>(EMPTY);
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  // Object URLs have to be revoked by hand or the blobs leak for the life of
  // the page, and a scan produces one per shot.
  const urls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const unsubStatus = subscribe(
      ROS_CONFIG.TOPICS.PLANT_SCAN_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          setStatus((prev) => ({
            status: d.status ?? prev.status,
            idx: typeof d.idx === 'number' ? d.idx : prev.idx,
            total: typeof d.total === 'number' ? d.total : prev.total,
            samples: typeof d.samples === 'number' ? d.samples : prev.samples,
            captures:
              typeof d.captures === 'number' ? d.captures : prev.captures,
            results: Array.isArray(d.results) ? d.results : prev.results,
            waypoints: Array.isArray(d.waypoints) ? d.waypoints : prev.waypoints,
            error: d.error,
          }));
        } catch {
          // ignore malformed status
        }
      }
    );

    const unsubCapture = subscribe(
      ROS_CONFIG.TOPICS.SCAN_CAPTURE,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          // The node sends hex, not base64 — decoding it as base64 yields
          // noise that renders as a broken image.
          const url = hexToBlobUrl(d.image_jpeg);
          if (!url) return;
          urls.current.push(url);
          setCaptures((prev) => {
            const next = [
              ...prev,
              {
                label: String(d.class ?? 'view'),
                url,
                index: Number(d.capture_count ?? prev.length + 1),
                at: Date.now(),
              },
            ];
            return next.slice(-MAX_CAPTURES);
          });
        } catch {
          // ignore malformed capture
        }
      }
    );

    return () => {
      unsubStatus();
      unsubCapture();
    };
  }, [isConnected, subscribe]);

  const send = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isConnected) return;
      publish(ROS_CONFIG.TOPICS.PLANT_SCAN_CMD, 'std_msgs/msg/String', {
        data: JSON.stringify(payload),
      });
    },
    [isConnected, publish]
  );

  const clearCaptures = useCallback(() => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setCaptures([]);
  }, []);

  return {
    status,
    captures,
    isConnected,
    /** Scan where the robot already is, no navigation. */
    scanHere: (samples?: number) =>
      send({ action: 'scan_here', ...(samples ? { samples } : {}) }),
    start: (samples?: number) =>
      send({ action: 'start', ...(samples ? { samples } : {}) }),
    stop: () => send({ action: 'stop' }),
    pause: () => send({ action: 'pause' }),
    resume: () => send({ action: 'resume' }),
    next: () => send({ action: 'next' }),
    setSamples: (samples: number) => send({ action: 'set_samples', samples }),
    clearCaptures,
  };
}
