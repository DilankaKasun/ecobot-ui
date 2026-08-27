/**
 * Client-side 4-DOF Arm Forward and Inverse Kinematics solver
 * Matches ecobot_arm_control parameters
 */

export const ARM_PARAMS = {
  L0: 0.110, // Base height (m)
  L1: 0.150, // Shoulder to elbow (m)
  L2: 0.130, // Elbow to wrist (m)
  L3: 0.140, // Wrist to end-effector (m)

  JOINTS: [
    { name: 'base', label: 'Base (Yaw)', min: 0, max: 270, home: 95, offset: 95 },
    { name: 'shoulder', label: 'Shoulder', min: 0, max: 90, home: 60, offset: 0 },
    { name: 'elbow', label: 'Elbow', min: 0, max: 180, home: 169, offset: 0 },
    { name: 'wrist', label: 'Wrist', min: 0, max: 180, home: 5, offset: 0 },
  ],
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
