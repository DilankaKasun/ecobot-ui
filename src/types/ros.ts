export interface OdometryData {
  x: number;
  y: number;
  yaw: number;
  linearVelocity: number;
  angularVelocity: number;
}

export interface DetectedObject {
  id?: number;
  class_name: string;
  confidence: number;
  distance?: number;
  box?: [number, number, number, number]; // [x1, y1, x2, y2]
  center_x?: number;
  center_y?: number;
  center_z?: number;
  timestamp?: number;
}

export interface GotoStatus {
  status: 'IDLE' | 'ALIGNING' | 'APPROACHING' | 'REACHED' | 'SEARCHING' | 'LOST' | 'BLOCKED' | 'STOPPED';
  targetClass?: string;
  distance?: number;
  angle?: number;
}

export interface ArmJoints {
  base: number;      // 0 - 270 deg
  shoulder: number;  // 0 - 90 deg
  elbow: number;     // 0 - 180 deg
  wrist: number;     // 0 - 180 deg
}

export interface ArmPoseGoal {
  x: number;
  y: number;
  z: number;
}

export interface ArmStatus {
  state?: string;
  status?: string;
  joints?: number[] | { base?: number; shoulder?: number; elbow?: number; wrist?: number; gripper?: number };
  joint_names?: string[];
  end_effector?: { x?: number; y?: number; z?: number };
  gripper?: string | { position?: number; state?: string };
  fault?: boolean;
  error?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface ToFRanges {
  left: number;    // Front Left (mm)
  right: number;   // Front Right (mm)
  sensor1: number; // Front Left compatibility (mm)
  sensor2: number; // Front Right compatibility (mm)
  status: string;
}

export interface ZoneObstacleData {
  zones: number[]; // 5 zone distances in meters
  safeDistance: number;
  warnDistance: number;
  warningZone: number | null;
}

export interface PlantWaypoint {
  id: number;
  x: number;
  y: number;
  yaw?: number;
  status?: 'pending' | 'navigating' | 'scanning' | 'analyzing' | 'completed' | 'failed';
  healthReport?: PlantHealthReport;
}

export interface PlantHealthReport {
  species?: string;
  vitality?: string;
  healthScore?: number; // 0 - 100
  issues?: string[];
  hydration?: string;
  recommendations?: string[];
  timestamp?: number;
}

export interface PlantMissionStatus {
  status: 'IDLE' | 'NAVIGATING' | 'SCANNING' | 'ANALYZING' | 'WAITING' | 'DONE' | 'ERROR';
  currentPlant: number;
  totalPlants: number;
  captures: number;
  activeWaypoint?: PlantWaypoint;
  lastDiagnosis?: PlantHealthReport;
}

export interface HardwareComponentStatus {
  status: string;
  [key: string]: any;
}

export interface HardwareSystemStatus {
  cpu_temp?: number;
  gpu_temp?: number;
  cpu_load?: number;
  ram_used?: number;
  disk_used?: number;
  uptime?: number;
  [key: string]: any;
}

export interface HardwareStatus {
  overall?: string;
  motors?: HardwareComponentStatus;
  pico?: HardwareComponentStatus;
  realsense?: HardwareComponentStatus;
  arm?: HardwareComponentStatus;
  system?: HardwareSystemStatus;
  battery?: HardwareComponentStatus;
  wifi?: HardwareComponentStatus;
  timestamp?: number;
  [key: string]: any;
}

export interface ServiceResult {
  success: boolean;
  message?: string;
  values?: any;
}
