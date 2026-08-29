/**
 * Client-side 4-DOF Arm Forward and Inverse Kinematics solver
 * Matches ecobot_arm_control parameters
 */

export const ARM_PARAMS = {
  // Measured on the arm. L0 is ground to the shoulder pivot, so z is
  // measured from the floor, not from the top of the base.
  L0: 0.320, // ground to shoulder pivot (m)
  L1: 0.165, // shoulder link (m)
  L2: 0.140, // elbow link (m)
  L3: 0.090, // wrist / last link (m)

  // Limits and home angles mirror ecobot_arm_control/servo_config.py. The node
  // clamps every command to min/max, so a slider that ranges wider than the
  // robot silently stops responding past the real limit; one that ranges
  // narrower makes part of the joint unreachable from the UI. Home must match
  // too, or the UI's "Home" button parks the arm somewhere that is not the
  // stow pose the node ramps to on startup.
  // `offset` mirrors angle_offset in servo_config.py and is SUBTRACTED from a
  // servo angle to reach the kinematic frame, exactly as the node's to_ik()
  // does. Calibrated against the physical arm at the home pose, where the
  // lower link sits 38 deg above the floor with 67 deg at the elbow and 116
  // deg at the wrist.
  JOINTS: [
    { name: 'base', label: 'Base (Yaw)', min: 0, max: 220, home: 95, offset: -85, direction: 1 },
    { name: 'shoulder', label: 'Shoulder', min: 0, max: 125, home: 30, offset: -98, direction: 1 },
    { name: 'elbow', label: 'Elbow', min: 0, max: 180, home: 180, offset: 67, direction: 1 },
    // direction -1 reverses the wrist's sense; offset 89 keeps the measured
    // 116 deg interior angle at home despite that flip.
    { name: 'wrist', label: 'Wrist', min: 0, max: 180, home: 25, offset: 89, direction: -1 },
  ],
};

/**
 * Servo angles -> kinematic frame, matching servo_config.to_ik().
 *
 * The solver works in a frame where each joint's zero is a defined pose, but
 * the servos have their own zeros. Skipping this shift makes the computed
 * pose disagree with the robot's own /arm/pose.
 */
export function toIk(
  base: number,
  shoulder: number,
  elbow: number,
  wrist: number
): [number, number, number, number] {
  const o = ARM_PARAMS.JOINTS;
  return [
    (base - o[0].offset) * o[0].direction,
    (shoulder - o[1].offset) * o[1].direction,
    (elbow - o[2].offset) * o[2].direction,
    (wrist - o[3].offset) * o[3].direction,
  ];
}

/** Home pose in the joint order the node expects: [base, shoulder, elbow, wrist]. */
export const ARM_HOME = {
  base: 95,
  shoulder: 30,
  elbow: 180,
  wrist: 25,
};

export function forwardKinematics(
  theta1: number,
  theta2: number,
  theta3: number,
  theta4: number
): { x: number; y: number; z: number } {
  // Inputs are servo angles; shift into the kinematic frame first.
  const [i1, i2, i3, i4] = toIk(theta1, theta2, theta3, theta4);
  const th1 = (i1 * Math.PI) / 180;
  const th2 = (i2 * Math.PI) / 180;
  const th3 = (i3 * Math.PI) / 180;
  const th4 = (i4 * Math.PI) / 180;

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

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Every joint position along the arm, base first, end-effector last.
 *
 * Same convention as forwardKinematics — angles are servo-frame degrees and
 * each link is measured from vertical — so the last entry always equals what
 * forwardKinematics returns for the same input. Used to draw the arm rather
 * than just its tip.
 */
export function forwardKinematicsChain(
  theta1: number,
  theta2: number,
  theta3: number,
  theta4: number
): { points: Vec3[]; labels: string[] } {
  // Inputs are servo angles; shift into the kinematic frame first.
  const [i1, i2, i3, i4] = toIk(theta1, theta2, theta3, theta4);
  const th1 = (i1 * Math.PI) / 180;
  const th2 = (i2 * Math.PI) / 180;
  const th23 = th2 + (i3 * Math.PI) / 180;
  const th234 = th23 + (i4 * Math.PI) / 180;

  const { L0, L1, L2, L3 } = ARM_PARAMS;

  // Radial distance and height accumulated link by link, in the vertical
  // plane the base yaw rotates.
  const r1 = L1 * Math.sin(th2);
  const r2 = r1 + L2 * Math.sin(th23);
  const r3 = r2 + L3 * Math.sin(th234);

  const z1 = L0 - L1 * Math.cos(th2);
  const z2 = z1 - L2 * Math.cos(th23);
  const z3 = z2 - L3 * Math.cos(th234);

  const cos1 = Math.cos(th1);
  const sin1 = Math.sin(th1);
  const at = (r: number, z: number): Vec3 => ({
    x: r * cos1,
    y: r * sin1,
    z,
  });

  return {
    points: [
      { x: 0, y: 0, z: 0 },   // floor mount
      { x: 0, y: 0, z: L0 },  // shoulder pivot, atop the base column
      at(r1, z1),             // elbow
      at(r2, z2),             // wrist
      at(r3, z3),             // end-effector
    ],
    labels: ['Base', 'Shoulder', 'Elbow', 'Wrist', 'Tip'],
  };
}

/**
 * Whether the tip could physically reach (x, y, z), in metres, ignoring joint
 * limits. Mirrors the node's own check so the dashboard can warn before
 * sending rather than waiting for a rejection.
 *
 * Distinguishes "the arm is not long enough" from "the arm is long enough but
 * a joint cannot bend that way" — only the first is decidable from geometry.
 */
export function reachCheck(
  x: number,
  y: number,
  z: number
): { withinSpan: boolean; distance: number; span: number; reason?: string } {
  const { L0, L1, L2, L3 } = ARM_PARAMS;
  const span = L1 + L2 + L3;
  const distance = Math.hypot(x, y, z - L0);
  if (distance > span) {
    return {
      withinSpan: false,
      distance,
      span,
      reason:
        `${(distance * 100).toFixed(1)}cm from the shoulder pivot, but the ` +
        `arm only spans ${(span * 100).toFixed(1)}cm`,
    };
  }
  return { withinSpan: true, distance, span };
}
