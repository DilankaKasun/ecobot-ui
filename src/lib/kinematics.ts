/**
 * Client-side 4-DOF Arm Forward and Inverse Kinematics solver
 * Matches ecobot_arm_control parameters
 */

export const ARM_PARAMS = {
  L0: 0.110, // Base height (m)
  L1: 0.150, // Shoulder to elbow (m)
  L2: 0.130, // Elbow to wrist (m)
  L3: 0.140, // Wrist to end-effector (m)

  // Limits and home angles mirror ecobot_arm_control/servo_config.py. The node
  // clamps every command to min/max, so a slider that ranges wider than the
  // robot silently stops responding past the real limit; one that ranges
  // narrower makes part of the joint unreachable from the UI. Home must match
  // too, or the UI's "Home" button parks the arm somewhere that is not the
  // stow pose the node ramps to on startup.
  JOINTS: [
    { name: 'base', label: 'Base (Yaw)', min: 0, max: 220, home: 107, offset: 95 },
    { name: 'shoulder', label: 'Shoulder', min: 0, max: 125, home: 125, offset: 0 },
    { name: 'elbow', label: 'Elbow', min: 0, max: 180, home: 180, offset: 0 },
    { name: 'wrist', label: 'Wrist', min: 0, max: 180, home: 45, offset: 0 },
  ],
};

/** Home pose in the joint order the node expects: [base, shoulder, elbow, wrist]. */
export const ARM_HOME = {
  base: 107,
  shoulder: 125,
  elbow: 180,
  wrist: 45,
};

export function forwardKinematics(
  theta1: number,
  theta2: number,
  theta3: number,
  theta4: number
): { x: number; y: number; z: number } {
  const th1 = (theta1 * Math.PI) / 180;
  const th2 = (theta2 * Math.PI) / 180;
  const th3 = (theta3 * Math.PI) / 180;
  const th4 = (theta4 * Math.PI) / 180;

  const th23 = th2 + th3;
  const th234 = th23 + th4;

  const r =
    ARM_PARAMS.L1 * Math.sin(th2) +
    ARM_PARAMS.L2 * Math.sin(th23) +
    ARM_PARAMS.L3 * Math.sin(th234);

  const z =
    ARM_PARAMS.L0 -
    (ARM_PARAMS.L1 * Math.cos(th2) +
      ARM_PARAMS.L2 * Math.cos(th23) +
      ARM_PARAMS.L3 * Math.cos(th234));

  const x = r * Math.cos(th1);
  const y = r * Math.sin(th1);

  return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z: Number(z.toFixed(3)) };
}
