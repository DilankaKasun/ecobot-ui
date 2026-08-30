'use client';

import { useEffect, useRef, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/**
 * What the robot is doing right now, gathered from every node that can move
 * it, plus how fresh each of those reports is.
 *
 * Three separate nodes can have the wheels or the arm at any moment, and each
 * publishes its own status on its own topic. Reading one in isolation is
 * misleading — detection_goto and plant_mission_node both report a "status",
 * and both use the word SEARCHING for different things. This hook keeps them
 * apart, timestamps each one, and derives a single plain-language line for
 * what is actually happening.
 */

export interface GotoState {
  /** REACHED / TRACKING / SEARCHING / BLOCKED / LOST / IDLE */
  status: string;
  /** Which internal controller has the wheels — the field that matters most. */
  mode: string;
  target_class: string | null;
  /** Metres. Means distance to the plant in tracking, distance left in waypoint. */
  distance?: number;
  active?: boolean;
  auto_track_paused?: boolean;
}

export interface MissionState {
  status: string;
  idx: number;
  total: number;
  samples: number;
  captures: number;
  results: Record<string, unknown>[];
  error?: string;
}

export interface ScannerState {
  /** idle / scanning / recovering / failed */
  status: string;
  viewpoint: number;
  total_viewpoints: number;
  current_label: string;
  parts_covered?: unknown;
  reason?: string;
}

export interface Motion {
  linear: number;
  angular: number;
}

export interface RobotActivity {
  goto: GotoState | null;
  mission: MissionState | null;
  scanner: ScannerState | null;
  motion: Motion | null;
  /** True while a node has asked the safety layer to stand down. */
  missionSuppress: boolean;
  gotoSuppress: boolean;
  /** ms since each topic last arrived; null means never seen this session. */
  ages: {
    goto: number | null;
    mission: number | null;
    scanner: number | null;
    motion: number | null;
  };
  isConnected: boolean;
}

/** A report older than this is stale — the node has probably stopped. */
export const STALE_MS = 3000;

/** Plain-language description of what the wheels are doing. */
export function describeMotion(m: Motion | null): string {
  if (!m) return 'no speed command seen';
  const lin = Math.abs(m.linear);
  const ang = Math.abs(m.angular);
  if (lin < 0.01 && ang < 0.02) return 'standing still';
  if (lin < 0.01) {
    return `turning ${m.angular > 0 ? 'left' : 'right'} at ${ang.toFixed(2)} rad/s`;
  }
  if (ang < 0.02) {
    return `driving ${m.linear > 0 ? 'forward' : 'backward'} at ${lin.toFixed(2)} m/s`;
  }
  return `driving ${m.linear > 0 ? 'forward' : 'backward'} at ${lin.toFixed(
    2
  )} m/s while turning ${m.angular > 0 ? 'left' : 'right'}`;
}

/**
 * One sentence for what the robot is doing, in the order that matters: the
 * arm first (it is the slowest and most visible), then whichever wheel
 * controller is actually driving.
 */
export function describeActivity(a: RobotActivity): {
  headline: string;
  detail: string;
  owner: string;
} {
  if (!a.isConnected) {
    return {
      headline: 'Not connected',
      detail: 'No link to the robot, so nothing can be read.',
      owner: '—',
    };
  }

  const scanner = a.scanner;
  if (scanner && scanner.status === 'scanning') {
    const n = scanner.total_viewpoints || 0;
    return {
      headline: 'Photographing the plant',
      detail: `Arm is at viewpoint ${scanner.viewpoint}${
        n ? ` of ${n}` : ''
      }${scanner.current_label ? ` — ${scanner.current_label}` : ''}.`,
      owner: 'arm_scanner_node',
    };
  }
  if (scanner && scanner.status === 'failed') {
    return {
      headline: 'Arm scan failed',
      detail: scanner.reason || 'The scanner gave no reason.',
      owner: 'arm_scanner_node',
    };
  }

  const mission = a.mission;
  if (mission && (mission.status === 'ANALYZING' || mission.status === 'ANALYSING')) {
    return {
      headline: 'Reading the photos',
      detail: `Sending ${mission.captures} photo(s) to Gemini for a health report.`,
      owner: 'plant_mission_node',
    };
  }

  const goto = a.goto;
  const dist =
    goto && typeof goto.distance === 'number'
      ? ` (${goto.distance.toFixed(2)} m)`
      : '';

  if (goto && goto.active) {
    switch (goto.mode) {
      case 'startup_scan':
        return {
          headline: 'Surveying the room',
          detail:
            'Turning a full circle to list every plant it can see. It will not ' +
            'drive to any of them until the wheel counters report 360 degrees, ' +
            'or the time limit runs out.',
          owner: 'detection_goto',
        };
      case 'searching':
        return {
          headline: 'Looking for a plant',
          detail: 'Turning on the spot until a plant comes into view.',
          owner: 'detection_goto',
        };
      case 'tracking':
        return {
          headline: `Driving to the ${goto.target_class || 'plant'}`,
          detail: `Steering by the camera${dist}. It stops once it is close enough and facing the centre.`,
          owner: 'detection_goto',
        };
      case 'blind_drive':
        return {
          headline: 'Plant out of view — driving on last heading',
          detail: `The camera lost it while close${dist}. It keeps going straight toward where it last was.`,
          owner: 'detection_goto',
        };
      case 'waypoint':
        return {
          headline: 'Driving to a saved point',
          detail: `Steering by odometry, not the camera${dist}. Accuracy depends on the wheel counters.`,
          owner: 'detection_goto',
        };
      case 'avoid':
        return {
          headline: 'Avoiding an obstacle',
          detail: 'Turning away and driving clear before resuming.',
          owner: 'detection_goto',
        };
      default:
        break;
    }
  }

  if (mission && mission.status === 'NAVIGATING') {
    return {
      headline: 'Map path driving to the plant',
      detail: `Nav2 is steering to plant ${mission.idx + 1} of ${mission.total}.`,
      owner: 'plant_mission_node → Nav2',
    };
  }
  if (mission && mission.status === 'SEARCHING') {
    return {
      headline: 'Mission is waiting for a plant to be found',
      detail: 'It handed the search over to the camera path.',
      owner: 'plant_mission_node',
    };
  }
  if (mission && mission.status === 'SCANNING') {
    return {
      headline: 'Waiting for the arm',
      detail: 'The scan has been asked for but the arm has not started moving yet.',
      owner: 'plant_mission_node',
    };
  }
  if (goto && goto.status === 'REACHED') {
    return {
      headline: 'Parked at the plant',
      detail: 'It has arrived and is holding still, ready for the arm.',
      owner: 'detection_goto',
    };
  }

  return {
    headline: 'Holding still',
    detail: 'No controller is driving the wheels.',
    owner: '—',
  };
}

export function useRobotActivity(): RobotActivity {
  const { subscribe, isConnected } = useRobotLink();

  const [goto, setGoto] = useState<GotoState | null>(null);
  const [mission, setMission] = useState<MissionState | null>(null);
  const [scanner, setScanner] = useState<ScannerState | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [missionSuppress, setMissionSuppress] = useState(false);
  const [gotoSuppress, setGotoSuppress] = useState(false);

  // Timestamps live in a ref so arrivals do not re-render on their own; a
  // 1Hz tick below turns them into ages. Re-rendering on every message from
  // four topics would be far more work than this panel is worth.
  const stamps = useRef<{ [k: string]: number }>({});
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const unsubGoto = subscribe(
      ROS_CONFIG.TOPICS.GOTO_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          stamps.current.goto = Date.now();
          setGoto({
            status: String(d.status ?? 'IDLE'),
            // Older robot builds did not send mode; say so rather than
            // showing a confident but wrong value.
            mode: String(d.mode ?? 'unknown'),
            target_class: d.target_class ?? null,
            distance: typeof d.distance === 'number' ? d.distance : undefined,
            active: typeof d.active === 'boolean' ? d.active : undefined,
            auto_track_paused:
              typeof d.auto_track_paused === 'boolean'
                ? d.auto_track_paused
                : undefined,
          });
        } catch {
          /* ignore malformed status */
        }
      }
    );

    const unsubMission = subscribe(
      ROS_CONFIG.TOPICS.PLANT_SCAN_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          stamps.current.mission = Date.now();
          setMission({
            status: String(d.status ?? 'IDLE'),
            idx: Number(d.idx ?? 0),
            total: Number(d.total ?? 0),
            samples: Number(d.samples ?? 0),
            captures: Number(d.captures ?? 0),
            results: Array.isArray(d.results) ? d.results : [],
            error: d.error,
          });
        } catch {
          /* ignore malformed status */
        }
      }
    );

    const unsubScanner = subscribe(
      ROS_CONFIG.TOPICS.SCANNER_STATUS,
      'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          stamps.current.scanner = Date.now();
          setScanner({
            status: String(d.status ?? 'idle'),
            viewpoint: Number(d.viewpoint ?? 0),
            total_viewpoints: Number(d.total_viewpoints ?? 0),
            current_label: String(d.current_label ?? ''),
            parts_covered: d.parts_covered,
            reason: d.reason ? String(d.reason) : undefined,
          });
        } catch {
          /* ignore malformed status */
        }
      }
    );

    const unsubMotion = subscribe(
      ROS_CONFIG.TOPICS.CMD_VEL,
      'geometry_msgs/msg/Twist',
      (msg: any) => {
        stamps.current.motion = Date.now();
        setMotion({
          linear: Number(msg?.linear?.x ?? 0),
          angular: Number(msg?.angular?.z ?? 0),
        });
      }
    );

    const unsubMissionSuppress = subscribe(
      ROS_CONFIG.TOPICS.MISSION_SUPPRESS_AVOIDANCE,
      'std_msgs/msg/Bool',
      (msg: any) => setMissionSuppress(Boolean(msg?.data))
    );

    const unsubGotoSuppress = subscribe(
      ROS_CONFIG.TOPICS.GOTO_SUPPRESS_AVOIDANCE,
      'std_msgs/msg/Bool',
      (msg: any) => setGotoSuppress(Boolean(msg?.data))
    );

    return () => {
      unsubGoto();
      unsubMission();
      unsubScanner();
      unsubMotion();
      unsubMissionSuppress();
      unsubGotoSuppress();
    };
  }, [isConnected, subscribe]);

  const now = Date.now();
  const ageOf = (k: string) =>
    stamps.current[k] ? now - stamps.current[k] : null;

  return {
    goto,
    mission,
    scanner,
    motion,
    missionSuppress,
    gotoSuppress,
    ages: {
      goto: ageOf('goto'),
      mission: ageOf('mission'),
      scanner: ageOf('scanner'),
      motion: ageOf('motion'),
    },
    isConnected,
  };
}
