'use client';

import React from 'react';
import { useHardwareDiagnostics } from '@/hooks/useHardwareDiagnostics';
import { useRos } from '@/hooks/useRos';
import { Cpu, Stethoscope, Thermometer, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

function statusTone(status?: string): { text: string; dot: string; badge: string } {
  const s = (status || '').toLowerCase();
  if (['pass', 'ok', 'healthy', 'online', 'active', 'optimal'].includes(s)) {
    return { text: 'text-emerald-400', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' };
  }
  if (['warn', 'warning', 'near', 'degraded', 'check'].includes(s)) {
    return { text: 'text-amber-400', dot: 'bg-amber-500', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400' };
  }
  if (['fail', 'fault', 'error', 'offline', 'failed', 'critical'].includes(s)) {
    return { text: 'text-rose-400', dot: 'bg-rose-500', badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400' };
  }
  return { text: 'text-muted-foreground', dot: 'bg-gray-500', badge: 'bg-muted border-card-border text-muted-foreground' };
}

function overallBadge(overall?: string): string {
  const s = (overall || '').toLowerCase();
  if (['healthy', 'ok', 'pass', 'good', 'nominal'].includes(s)) {
    return 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400';
  }
  if (['warn', 'warning', 'degraded', 'check'].includes(s)) {
    return 'bg-amber-500/20 border border-amber-500/40 text-amber-400';
  }
  if (['fail', 'fault', 'error', 'critical'].includes(s)) {
    return 'bg-rose-500/20 border border-rose-500/40 text-rose-400';
  }
  return 'bg-muted border border-card-border text-muted-foreground';
}

interface StatusRowProps {
  label: string;
  status?: string;
  detail?: string;
}

const StatusRow: React.FC<StatusRowProps> = ({ label, status, detail }) => {
  const tone = statusTone(status);
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="font-mono text-[11px] text-muted-foreground">{detail}</span>}
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          <span className={`font-mono text-[11px] font-bold uppercase ${tone.text}`}>{status || '--'}</span>
        </span>
      </div>
    </div>
  );
};

export const HardwareDiagnostics: React.FC = () => {
  const { isConnected } = useRos();
  const { hardware, checking, checkResult, runHardwareCheck } = useHardwareDiagnostics();

  const overall = hardware?.overall;
  const motors = hardware?.motors || hardware?.pico;
  const realsense = hardware?.realsense;
  const arm = hardware?.arm;
  const sys = hardware?.system;

  const cpuTemp = typeof sys?.cpu_temp === 'number' ? `${Math.round(sys.cpu_temp)}°C` : undefined;
  const gpuTemp = typeof sys?.gpu_temp === 'number' ? `${Math.round(sys.gpu_temp)}°C` : undefined;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Stethoscope className="w-4 h-4 text-blue-400" />
          <span>Hardware Diagnostics</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase ${overallBadge(overall)}`}>
          {overall || 'Unknown'}
        </span>
      </div>

      {!isConnected ? (
        <div className="py-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
          <Cpu className="w-6 h-6 text-gray-600" />
          <span>Connect to ROS to view hardware status</span>
        </div>
      ) : hardware ? (
        <>
          <div className="divide-y divide-card-border/50">
            <StatusRow label="Motor Controller (Pico)" status={motors?.status} detail={motors?.fault ? motors.fault : undefined} />
            <StatusRow label="RealSense D415" status={realsense?.status} />
            <StatusRow label="Arm PCA9685 (I2C)" status={arm?.status} />
            <StatusRow
              label="Jetson Temperature"
              status={cpuTemp || gpuTemp ? (cpuTemp ? 'OK' : undefined) : undefined}
              detail={cpuTemp && gpuTemp ? `${cpuTemp} / ${gpuTemp}` : cpuTemp || gpuTemp}
            />
            {typeof sys?.cpu_load === 'number' && (
              <StatusRow label="CPU Load" status={undefined} detail={`${Math.round(sys.cpu_load)}%`} />
            )}
            {typeof sys?.ram_used === 'number' && (
              <StatusRow label="RAM Used" status={undefined} detail={`${Math.round(sys.ram_used)}%`} />
            )}
          </div>

          <button
            onClick={runHardwareCheck}
            disabled={checking}
            className={`mt-3 w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              checking
                ? 'bg-muted text-muted-foreground cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Running Self-Check...' : 'Run Self-Check'}
          </button>
        </>
      ) : (
        <div className="py-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
          <Activity className="w-6 h-6 text-gray-600" />
          <span>Waiting for /ecobot/hardware_status...</span>
        </div>
      )}

      {checkResult && (
        <div
          className={`mt-2 p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${
            checkResult.ok
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {checkResult.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          {checkResult.message}
        </div>
      )}

      {hardware && !isConnected && (
        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Cached status shown — robot offline.
        </div>
      )}
    </div>
  );
};