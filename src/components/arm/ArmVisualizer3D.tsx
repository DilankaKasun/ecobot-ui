'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Boxes, RotateCcw } from 'lucide-react';
import { useArmControl } from '@/hooks/useArmControl';
import { forwardKinematicsChain, ARM_PARAMS } from '@/lib/kinematics';

/**
 * Live 3D view of the arm pose.
 *
 * The scene is built once and then mutated in place on each joint change —
 * rebuilding it per render would thrash the GPU, since joint feedback arrives
 * many times a second while the arm is moving.
 *
 * Three.js is Y-up but the arm's kinematics are Z-up, so ROS (x, y, z) maps to
 * scene (x, z, -y) on the way in. Keeping the conversion in one place means
 * kinematics.ts stays in robot coordinates.
 */

const COL = {
  base: 0x64748b,
  link1: 0x00e5c0,
  link2: 0x38bdf8,
  link3: 0xd28cff,
  joint: 0xf1f5f9,
  tip: 0xff7e79,
  x: 0x60a5fa,
  y: 0xd28cff,
  z: 0x34d399,
};

/** Robot (z-up, metres) -> three.js (y-up). */
function toScene(p: { x: number; y: number; z: number }) {
  return new THREE.Vector3(p.x, p.z, -p.y);
}

export const ArmVisualizer3D: React.FC = () => {
  const { joints, currentPose } = useArmControl();
  const mountRef = useRef<HTMLDivElement>(null);

  // Everything the animation/update path needs, kept out of React state so
  // joint updates never trigger a re-mount of the canvas.
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    segments: THREE.Mesh[];
    joints: THREE.Mesh[];
    projX: THREE.Line;
    projY: THREE.Line;
    projZ: THREE.Line;
    reach: THREE.Line;
    resetView: () => void;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d14);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.01,
      50
    );
    const HOME_CAM = new THREE.Vector3(0.40, 0.30, 0.40);
    camera.position.copy(HOME_CAM);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.18, 0);
    controls.minDistance = 0.25;
    controls.maxDistance = 2.5;
    // Stop the camera going under the floor, where the grid hides the arm.
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(0.5, 1, 0.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.35);
    rim.position.set(-0.6, 0.3, -0.5);
    scene.add(rim);

    const grid = new THREE.GridHelper(0.8, 16, 0x1f2937, 0x151d2b);
    scene.add(grid);

    // World axes at the base: +X forward, +Y left, +Z up in robot terms.
    const axisLen = 0.16;
    const mkAxis = (dir: THREE.Vector3, color: number) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        dir.clone().multiplyScalar(axisLen),
      ]);
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    };
    scene.add(mkAxis(new THREE.Vector3(1, 0, 0), COL.x));
    scene.add(mkAxis(new THREE.Vector3(0, 0, -1), COL.y));
    scene.add(mkAxis(new THREE.Vector3(0, 1, 0), COL.z));

    // Four link segments; each is a unit-length cylinder rescaled per frame.
    const linkColors = [COL.base, COL.link1, COL.link2, COL.link3];
    const linkRadii = [0.022, 0.017, 0.015, 0.012];
    const segments = linkColors.map((color, i) => {
      const geo = new THREE.CylinderGeometry(
        linkRadii[i], linkRadii[i], 1, 16
      );
      // Origin at the base of the cylinder so scaling grows it along +Y only.
      geo.translate(0, 0.5, 0);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.35,
          roughness: 0.45,
        })
      );
      scene.add(mesh);
      return mesh;
    });

    const jointMeshes = [0, 1, 2, 3, 4].map((i) => {
      const isTip = i === 4;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(isTip ? 0.02 : 0.018, 20, 20),
        new THREE.MeshStandardMaterial({
          color: isTip ? COL.tip : COL.joint,
          emissive: isTip ? COL.tip : 0x000000,
          emissiveIntensity: isTip ? 0.45 : 0,
          metalness: 0.2,
          roughness: 0.5,
        })
      );
      scene.add(mesh);
      return mesh;
    });

    const mkDashed = (color: number) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(),
        ]),
        new THREE.LineDashedMaterial({
          color,
          dashSize: 0.018,
          gapSize: 0.012,
          linewidth: 1,
        })
      );
      scene.add(line);
      return line;
    };
    // X/Y/Z decomposition from the base out to the end-effector.
    const projX = mkDashed(COL.x);
    const projY = mkDashed(COL.y);
    const projZ = mkDashed(COL.z);
    const reach = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineDashedMaterial({
        color: 0x94a3b8,
        dashSize: 0.03,
        gapSize: 0.02,
        opacity: 0.7,
        transparent: true,
      })
    );
    scene.add(reach);

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    sceneRef.current = {
      renderer, scene, camera, controls,
      segments, joints: jointMeshes,
      projX, projY, projZ, reach,
      resetView: () => {
        camera.position.copy(HOME_CAM);
        controls.target.set(0, 0.18, 0);
        controls.update();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // Push the current pose into the existing scene objects.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    const { points } = forwardKinematicsChain(
      joints.base, joints.shoulder, joints.elbow, joints.wrist
    );
    const p = points.map(toScene);

    p.forEach((v, i) => s.joints[i].position.copy(v));

    // Orient and stretch each cylinder to span its two endpoints.
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < s.segments.length; i++) {
      const a = p[i];
      const b = p[i + 1];
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const seg = s.segments[i];
      seg.position.copy(a);
      if (len > 1e-6) {
        seg.quaternion.setFromUnitVectors(up, dir.clone().normalize());
        seg.scale.set(1, len, 1);
        seg.visible = true;
      } else {
        seg.visible = false;
      }
    }

    // Walk base -> X -> Y -> Z so the dashed legs form a right-angle path to
    // the tip, which reads more clearly than three lines from the origin.
    const tip = points[points.length - 1];
    const o = new THREE.Vector3(0, 0, 0);
    const ax = toScene({ x: tip.x, y: 0, z: 0 });
    const axy = toScene({ x: tip.x, y: tip.y, z: 0 });
    const axyz = toScene(tip);

    const setLine = (line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) => {
      line.geometry.setFromPoints([from, to]);
      line.computeLineDistances(); // required for dashes to show
    };
    setLine(s.projX, o, ax);
    setLine(s.projY, ax, axy);
    setLine(s.projZ, axy, axyz);
    setLine(s.reach, o, axyz);
  }, [joints.base, joints.shoulder, joints.elbow, joints.wrist]);

  const reach = Math.hypot(currentPose.x, currentPose.y, currentPose.z);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-white text-sm">Arm Pose</h3>
        </div>
        <button
          onClick={() => sceneRef.current?.resetView()}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-gray-400 hover:text-gray-100 hover:bg-card-border/60 transition-colors"
          title="Reset camera"
        >
          <RotateCcw className="w-3 h-3" />
          Reset view
        </button>
      </div>

      <div
        ref={mountRef}
        className="w-full h-[300px] rounded-lg overflow-hidden border border-card-border bg-background cursor-grab active:cursor-grabbing"
      />

      {/* Joint angles, moved here from the Arm Status card so the numbers sit
          beside the pose they describe. */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        {[
          { label: 'Base', value: joints.base, cls: 'text-primary' },
          { label: 'Shoulder', value: joints.shoulder, cls: 'text-sky-400' },
          { label: 'Elbow', value: joints.elbow, cls: 'text-purple-300' },
          { label: 'Wrist', value: joints.wrist, cls: 'text-rose-300' },
        ].map((j) => (
          <div key={j.label} className="bg-black/30 rounded-lg py-1.5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
              {j.label}
            </div>
            <div className={`font-mono text-xs font-bold ${j.cls}`}>
              {Math.round(j.value)}°
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-2 text-center">
        {[
          { label: 'X', value: currentPose.x, cls: 'text-blue-400' },
          { label: 'Y', value: currentPose.y, cls: 'text-purple-400' },
          { label: 'Z', value: currentPose.z, cls: 'text-emerald-400' },
          { label: 'Reach', value: reach, cls: 'text-gray-300' },
        ].map((c) => (
          <div key={c.label} className="bg-black/30 rounded-lg py-1.5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
              {c.label}
            </div>
            <div className={`font-mono text-xs font-bold ${c.cls}`}>
              {(c.value * 100).toFixed(1)}cm
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-600 mt-2 text-center">
        Drag to orbit · scroll to zoom · dashed legs trace X → Y → Z from base
        to tip · link lengths L0–L3 {ARM_PARAMS.L0 * 100}/{ARM_PARAMS.L1 * 100}/
        {ARM_PARAMS.L2 * 100}/{ARM_PARAMS.L3 * 100} cm
      </p>
    </div>
  );
};
