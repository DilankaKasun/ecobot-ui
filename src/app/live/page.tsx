'use client';

import React from 'react';
import { LiveAgentView } from '@/components/live/LiveAgentView';

export default function LiveAgentPage() {
  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-3 shrink-0">
        <h1 className="text-lg font-bold text-foreground">Live AI Agent</h1>
        <p className="text-xs text-muted-foreground">
          Real-time voice + vision conversation with Gemini Live, watching the robot&apos;s camera feed.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <LiveAgentView />
      </div>
    </div>
  );
}
