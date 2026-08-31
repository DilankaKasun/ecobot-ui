'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRobotLink } from './useRobotLink';
import { ROS_CONFIG } from '@/lib/ros-config';

/**
 * Keeps the reports a run produces, with the photographs that go with them.
 *
 * They live in the browser rather than on the robot: the photographs and
 * the assessment already cross the link as the scan happens, and the robot
 * has no store to keep them in — a restart there would lose every report
 * ever made. IndexedDB rather than localStorage because a scan is half a
 * dozen JPEGs and localStorage would be full after two of them.
 */

const DB_NAME = 'ecobot-reports';
const STORE = 'reports';
const DB_VERSION = 1;

export interface ReportPhoto {
  /** Viewpoint label the arm gave this shot, e.g. v03_mid_foliage. */
  label: string;
  /** The JPEG itself. Stored as a blob; turned into a URL when shown. */
  blob: Blob;
}

export interface PlantReport {
  id: string;
  at: number;
  health: string;
  confidence: number;
  notes: string;
  issues?: string[];
  symptoms?: string[];
  treatments?: string[];
  identification?: Record<string, string>;
  visible_condition?: Record<string, string>;
  species_data?: Record<string, string>;
  mature_size?: Record<string, string>;
  habitat?: Record<string, string>;
  scan_status?: string;
  captures?: number;
  photos: ReportPhoto[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putReport(report: PlantReport): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listReports(): Promise<PlantReport[]> {
  try {
    const db = await openDb();
    const all = await new Promise<PlantReport[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PlantReport[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return all.sort((a, b) => b.at - a.at);
  } catch {
    // A private window, cleared site data, or storage the browser refuses
    // to open. No reports is a fair answer; failing the page is not.
    return [];
  }
}

export async function getReport(id: string): Promise<PlantReport | null> {
  try {
    const db = await openDb();
    const one = await new Promise<PlantReport | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as PlantReport) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return one;
  } catch {
    return null;
  }
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* nothing to delete from */
  }
}

function hexToBlob(hex: string): Blob | null {
  if (!hex || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}

/**
 * Watches a run and files a report each time one finishes.
 *
 * Photographs arrive during the scan and the assessment only at the end, so
 * the shots are collected as they come and attached when the result lands.
 */
export function usePlantReports() {
  const { subscribe, isConnected } = useRobotLink();
  const [reports, setReports] = useState<PlantReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Shots for the scan currently in progress.
  const pending = useRef<ReportPhoto[]>([]);
  // Results already filed, so a status republishing the same list does not
  // file it again.
  const filed = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setReports(await listReports());
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!isConnected) return;
    const subs: Array<() => void> = [];

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.SCAN_CAPTURE, 'std_msgs/msg/String', (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          const blob = hexToBlob(d.image_jpeg);
          if (!blob) return;
          pending.current = [
            ...pending.current,
            { label: String(d.class ?? 'view'), blob },
          ].slice(-24);
        } catch { /* malformed capture */ }
      }));

    subs.push(subscribe(
      ROS_CONFIG.TOPICS.PLANT_SCAN_STATUS, 'std_msgs/msg/String',
      (msg: any) => {
        try {
          const d = JSON.parse(msg?.data ?? '');
          if (d.status === 'SCANNING' && pending.current.length === 0) return;
          const results = Array.isArray(d.results) ? d.results : [];
          const latest = results[results.length - 1];
          if (!latest || typeof latest.timestamp !== 'number') return;

          const id = `r${Math.round(latest.timestamp * 1000)}`;
          if (filed.current.has(id)) return;
          filed.current.add(id);

          const photos = pending.current;
          pending.current = [];

          const report: PlantReport = {
            id,
            at: latest.timestamp * 1000,
            health: String(latest.health ?? 'unknown'),
            confidence: Number(latest.confidence ?? 0),
            notes: String(latest.notes ?? ''),
            issues: latest.issues,
            symptoms: latest.symptoms,
            treatments: latest.treatments,
            identification: latest.identification,
            visible_condition: latest.visible_condition,
            species_data: latest.species_data,
            mature_size: latest.mature_size,
            habitat: latest.habitat,
            scan_status: latest.scan_status,
            captures: Number(latest.captures ?? photos.length),
            photos,
          };
          void putReport(report).then(refresh);
        } catch { /* malformed status */ }
      }));

    return () => { subs.forEach((u) => { try { u(); } catch { /* gone */ } }); };
  }, [isConnected, subscribe, refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteReport(id);
    await refresh();
  }, [refresh]);

  return { reports, loading, remove, refresh };
}
