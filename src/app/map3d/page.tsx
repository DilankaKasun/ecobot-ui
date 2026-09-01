'use client';

import React from 'react';
import { PointCloud3D } from '@/components/map/PointCloud3D';

export default function Map3DPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-foreground">3D SLAM & Point Cloud Visualization</h2>
      <p className="text-xs text-muted-foreground mt-1">
        Interactive WebGL rendering of RTAB-Map 3D RGB-D point clouds and real-time robot pose tracking.
      </p>
      </div>
      <PointCloud3D />
    </div>
  );
}
