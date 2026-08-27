export const ROS_CONFIG = {
  DEFAULT_ROBOT_HOST: 'wss://functional-hugh-focusing-hierarchy.trycloudflare.com',
  ROSBRIDGE_PORT: 9090,
  REALSENSE_STREAM_PORT: 8081,
  WEBRTC_SIGNALING_PORT: 8082,
  OBSTACLE_STREAM_PORT: 8083,
  GROUND_STREAM_PORT: 8084,
  ARM_CAMERA_PORT: 8085,

  TOPICS: {
    CMD_VEL: '/cmd_vel',
    NAV_CMD_VEL: '/nav_cmd_vel',
    ODOM: '/odom',
    RUN_MODE: '/run_mode',
    DETECTIONS: '/ecobot/detections',
    GOTO_TARGET: '/ecobot/goto_target',
    GOTO_STATUS: '/ecobot/goto_status',
    TOF_RANGES: '/ecobot/tof_ranges',
    ARM_JOINTS_CMD: '/arm/joint_commands',
    ARM_POSE_GOAL: '/arm/pose_goal',
    ARM_STATUS: '/arm/status',
    VLA_PROMPT: '/arm/vla_prompt',
    PLANT_SCAN_CMD: '/ecobot/plant_scan_cmd',
    PLANT_SCAN_STATUS: '/ecobot/plant_scan_status',
    SCAN_CAPTURE: '/ecobot/scan_capture',
    MAP_2D: '/map',
    MAP_3D: '/rtabmap/cloud_map',
    HARDWARE_STATUS: '/ecobot/hardware_status',
  },

  SERVICES: {
    HARDWARE_CHECK: '/ecobot/trigger_hardware_check',
  },
};
