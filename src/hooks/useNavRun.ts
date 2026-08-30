'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/**
 * Everything plant_run_node and the things around it are doing, right now.
 *
 * Built for debugging a live run: the state machine, which driver holds the
 * wheels, how long until the current state times out, what the camera can
 * see, and what the arm says. High-rate topics are buffered in refs and
 * flushed on a timer so a 20Hz velocity feed does not re-render the page
 * 20 times a second.
 */

export type RunState =
  | 'IDLE' | 'SURVEY' | 'PICK' | 'REACQUIRE' | 'DRIVE' | 'HANDOVER'
  | 'APPROACH' | 'SCAN' | 'REPORT' | 'TURN_AWAY' | 'DONE';

/** The order states run in, for the pipeline strip. */
export const RUN_PIPELINE: RunState[] = [
  'SURVEY', 'PICK', 'REACQUIRE', 'DRIVE', 'HANDOVER', 'APPROACH',
  'SCAN', 'REPORT', 'TURN_AWAY',
];

export interface PlantCandidate {
  heading_deg: number;
  range_m: number;
  name: string;
  state: 'pending' | 'done' | 'failed' | 'duplicate';
  sightings: number;
  x?: number;
  y?: number;
  reason?: string;
}

export interface NavStatus {
  state: RunState;
  driver: 'none' | 'map' | 'camera' | 'handover';
  saying: string;
  running: boolean;
  elapsed_s: number;
  deadline_s: number | null;
  plants: PlantCandidate[];
  done: number;
  target: PlantCandidate | null;
  /** Wall-clock ms when this status arrived; stale if it stops updating. */
  at: number;
}

export interface Detection {
  class_name: string;
  confidence: number;
  distance?: number | null;
  x?: number;
  z?: number;
  bbox?: number[];
  /** Degrees left of straight ahead, worked out from the 3D point. */
  bearing_deg?: number;
}

export interface ScannerStatus {
  status: string;
  viewpoint: number;
  total_viewpoints: number;
  current_label: string;
  parts_covered: string[];
  reason: string;
  at: number;
}

export interface Vel {
  x: number;
  z: number;
  hz: number;
  /** True while messages are still arriving — this is what the safety
   *  layer uses to decide who is driving. */
  live: boolean;
}

const NO_VEL: Vel = { x: 0, z: 0, hz: 0, live: false };

const EMPTY_STATUS: NavStatus = {
  state: 'IDLE', driver: 'none', saying: '—', running: false,
  elapsed_s: 0, deadline_s: null, plants: [], done: 0, target: null, at: 0,
};

/** What plant_run_node counts as a plant (its plant_classes default). */
const PLANT_CLASSES = new Set(['potted plant', 'plant', 'vase', 'pot']);

export function isPlantClass(name: string): boolean {
  return PLANT_CLASSES.has((name || '').trim().toLowerCase());
}

/** Tracks message arrival so we can show a rate and a live/dead flag. */
class RateCounter {
  private stamps: number[] = [];
  hit() {
    const now = Date.now();
    this.stamps.push(now);
    if (this.stamps.length > 40) this.stamps.shift();
  }
  get last(): number {
    return this.stamps.length ? this.stamps[this.stamps.length - 1] : 0;
  }
  rate(): number {
    const now = Date.now();
    const recent = this.stamps.filter((t) => now - t < 2000);
    if (recent.length < 2) return 0;
    const span = (recent[recent.length - 1] - recent[0]) / 1000;
    return span > 0 ? (recent.length - 1) / span : 0;
  }
}

export function useNavRun() {
  const { subscribe, publish, isConnected, transport } = useRobotLink();

  const [status, setStatus] = useState<NavStatus>(EMPTY_STATUS);
  const [scanner, setScanner] = useState<ScannerStatus | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [suppressed, setSuppressed] = useState(false);
  const [vels, setVels] = useState<{ cmd: Vel; nav: Vel; goto: Vel }>({
    cmd: NO_VEL, nav: NO_VEL, goto: NO_VEL,
  });
  const [odom, setOdom] = useState({ x: 0, y: 0, yaw_deg: 0, v: 0, w: 0 });
  /** Ticks once a second so elapsed/deadline counts up between messages. */
  const [, setTick] = useState(0);

  const buf = useRef({
    cmd: { x: 0, z: 0 }, nav: { x: 0, z: 0 }, goto: { x: 0, z: 0 },
    odom: { x: 0, y: 0, yaw_deg: 0, v: 0, w: 0 },
  });
  const rates = useRef({
    cmd: new RateCounter(), nav: new RateCounter(), goto: new RateCounter(),
  });

  useEffect(() => {
    if (!isConnected) return;
    const subs: Array<() => void> = [];

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.NAV_STATUS, 'std_msgs/msg/String', (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          setStatus({
            state: d.state ?? 'IDLE',
            driver: d.driver ?? 'none',
            saying: d.saying ?? '',
            running: !!d.running,
            elapsed_s: Number(d.elapsed_s ?? 0),
            deadline_s: d.deadline_s == null ? null : Number(d.deadline_s),
            plants: Array.isArray(d.plants) ? d.plants : [],
            done: Number(d.done ?? 0),
            target: d.target ?? null,
            at: Date.now(),
          });
        } catch { /* malformed status */ }
      }));

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.SCANNER_STATUS, 'std_msgs/msg/String', (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          setScanner({
            status: d.status ?? '?',
            viewpoint: Number(d.viewpoint ?? 0),
            total_viewpoints: Number(d.total_viewpoints ?? 0),
            current_label: d.current_label ?? '',
            parts_covered: Array.isArray(d.parts_covered) ? d.parts_covered : [],
            reason: d.reason ?? '',
            at: Date.now(),
          });
        } catch { /* malformed */ }
      }));

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.DETECTIONS, 'std_msgs/msg/String', (msg: any) => {
        try {
          const raw = JSON.parse(msg?.data ?? '[]');
          if (!Array.isArray(raw)) return;
          setDetections(raw.map((d: any) => {
            const z = typeof d.z === 'number' ? d.z : d.distance;
            const bearing =
              typeof d.x === 'number' && typeof z === 'number' && z > 0
                ? (Math.atan2(-d.x, z) * 180) / Math.PI
                : undefined;
            return { ...d, bearing_deg: bearing } as Detection;
          }));
        } catch { /* malformed */ }
      }));

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.GOTO_SUPPRESS_AVOIDANCE, 'std_msgs/msg/Bool',
      (msg: any) => setSuppressed(!!msg?.data)));

    const vel = (key: 'cmd' | 'nav' | 'goto') => (msg: any) => {
      buf.current[key] = {
        x: Number(msg?.linear?.x ?? 0), z: Number(msg?.angular?.z ?? 0),
      };
      rates.current[key].hit();
    };
    subs.push(subscribe(ROS_CONFIG.TOPICS.CMD_VEL, 'geometry_msgs/msg/Twist', vel('cmd')));
    subs.push(subscribe(ROS_CONFIG.TOPICS.NAV_CMD_VEL, 'geometry_msgs/msg/Twist', vel('nav')));
    subs.push(subscribe(ROS_CONFIG.TOPICS.GOTO_CMD_VEL, 'geometry_msgs/msg/Twist', vel('goto')));

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.ODOM, 'nav_msgs/msg/Odometry', (msg: any) => {
        const q = msg?.pose?.pose?.orientation ?? { z: 0, w: 1 };
        buf.current.odom = {
          x: Number(msg?.pose?.pose?.position?.x ?? 0),
          y: Number(msg?.pose?.pose?.position?.y ?? 0),
          yaw_deg: (Math.atan2(2 * q.w * q.z, 1 - 2 * q.z * q.z) * 180) / Math.PI,
          v: Number(msg?.twist?.twist?.linear?.x ?? 0),
          w: Number(msg?.twist?.twist?.angular?.z ?? 0),
        };
      }));

    return () => { subs.forEach((u) => { try { u(); } catch { /* gone */ } }); };
  }, [isConnected, subscribe]);

  // Flush the high-rate buffers on a timer instead of on every message.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const mk = (key: 'cmd' | 'nav' | 'goto'): Vel => {
        const r = rates.current[key];
        return {
          ...buf.current[key],
          hz: r.rate(),
          // One second with no message is what obstacle_avoidance.py uses
          // to decide a driver has gone away.
          live: r.last > 0 && now - r.last < 1000,
        };
      };
      setVels({ cmd: mk('cmd'), nav: mk('nav'), goto: mk('goto') });
      setOdom(buf.current.odom);
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    if (!isConnected) return;
    publish(ROS_CONFIG.TOPICS.PLANT_SCAN_CMD, 'std_msgs/msg/String', {
      data: JSON.stringify(payload),
    });
  }, [isConnected, publish]);

  /** Seconds left before the current state hits its deadline. */
  const timeLeft = status.deadline_s == null
    ? null
    : Math.max(0, status.deadline_s - status.elapsed_s
        - (status.at ? (Date.now() - status.at) / 1000 : 0));

  /** No status for two seconds means the run node is not talking. */
  const nodeAlive = status.at > 0 && Date.now() - status.at < 2000;

  return {
    status, scanner, detections, suppressed, vels, odom,
    isConnected, transport, timeLeft, nodeAlive,
    start: (samples?: number) =>
      send({ action: 'start', ...(samples ? { samples } : {}) }),
    stop: () => send({ action: 'stop' }),
    next: () => send({ action: 'next' }),
    scanHere: (samples?: number) =>
      send({ action: 'scan_here', ...(samples ? { samples } : {}) }),
    setSamples: (samples: number) => send({ action: 'set_samples', samples }),
  };
}
