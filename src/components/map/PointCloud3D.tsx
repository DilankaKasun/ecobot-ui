'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useOdometry } from '@/hooks/useOdometry';
import { Box, Compass, Eye, RotateCcw } from 'lucide-react';

export const PointCloud3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { odom } = useOdometry();
  const [followRobot, setFollowRobot] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // 5. Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1f2937);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 6. Robot 3D Group
    const robotGroup = new THREE.Group();

    // Chassis
    const chassisGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 24);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.y = 0.08;
    robotGroup.add(chassis);

    // Heading Pointer
    const arrowGeom = new THREE.ConeGeometry(0.08, 0.2, 16);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.position.set(0, 0.16, -0.2);
    arrow.rotation.x = -Math.PI / 2;
    robotGroup.add(arrow);

    scene.add(robotGroup);
    robotGroupRef.current = robotGroup;

    // 7. Synthetic Obstacle Cloud Sample
    const pointCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount * 3; i += 3) {
      // Create some spatial points
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 4.0;
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.random() * 0.8;
      positions[i + 2] = Math.sin(angle) * radius;

      // Color by height
      colors[i] = 0.2 + positions[i + 1];
      colors[i + 1] = 0.6;
      colors[i + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const pointCloud = new THREE.Points(geometry, pMat);
    scene.add(pointCloud);

    // Simple Orbit Dragging (Mouse + Touch)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const startDrag = (x: number, y: number) => {
      isDragging = true;
      prevX = x;
      prevY = y;
    };

    const moveDrag = (x: number, y: number) => {
      if (!isDragging) return;
      const deltaX = x - prevX;
      const deltaY = y - prevY;
      prevX = x;
      prevY = y;

      camera.position.x += deltaX * 0.02;
      camera.position.y -= deltaY * 0.02;
      camera.lookAt(robotGroup.position);
    };

    const endDrag = () => {
      isDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      moveDrag(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      endDrag();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.005;
      camera.position.z = Math.max(2, Math.min(25, camera.position.z));
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDrag();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('touchstart', onTouchStart, { passive: false });
    domEl.addEventListener('touchmove', onTouchMove, { passive: false });
    domEl.addEventListener('touchend', onTouchEnd, { passive: false });

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchmove', onTouchMove);
      domEl.removeEventListener('touchend', onTouchEnd);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update robot position when odometry changes
  useEffect(() => {
    if (!robotGroupRef.current) return;
    const robot = robotGroupRef.current;
    robot.position.set(odom.x, 0, -odom.y);
    robot.rotation.y = -(odom.yaw * Math.PI) / 180;

    if (followRobot && cameraRef.current) {
      cameraRef.current.lookAt(robot.position.x, 0.5, robot.position.z);
    }
  }, [odom, followRobot]);

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-card-border shadow-2xl bg-background">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none" />

      {/* Floating Control HUD */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-auto bg-card/90 backdrop-blur-md border border-card-border px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-xl space-y-2 text-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <Box className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Real-time 3D SLAM</span>
          </div>
          <div className="pt-0 border-t-0 flex items-center gap-2">
            <button
              onClick={() => setFollowRobot(!followRobot)}
              className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                followRobot
                  ? 'bg-blue-600 text-white'
                  : 'bg-card-border text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              {followRobot ? 'Track' : 'Free'}
            </button>
          </div>
        </div>
        <div className="font-mono text-[11px] text-gray-400 space-y-0.5">
          <div className="flex items-center gap-2">
            <span>Pose:</span>
            <span className="text-white">{odom.x.toFixed(2)}, {odom.y.toFixed(2)} m</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Yaw:</span>
            <span className="text-white">{odom.yaw.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      <div className="hidden sm:block absolute bottom-4 right-4 bg-card/80 backdrop-blur-md border border-card-border px-3 py-1.5 rounded-lg text-[11px] text-gray-400 font-mono">
        Drag: Rotate | Scroll: Zoom
      </div>
    </div>
  );
};
