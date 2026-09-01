'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripHorizontal, Minus, Plus, X } from 'lucide-react';

/**
 * Draggable panel pinned above the page.
 *
 * Position is kept in a ref and written straight to the element's transform
 * during a drag, so pointer moves do not go through React state — at pointer
 * rate that would re-render the panel (and anything inside it, like a live
 * video element) dozens of times a second.
 */

interface Props {
  title: string;
  storageKey: string;
  defaultPos?: { x: number; y: number };
  defaultWidth?: number;
  children: React.ReactNode;
  onClose?: () => void;
}

const MARGIN = 8;

export const FloatingPanel: React.FC<Props> = ({
  title,
  storageKey,
  defaultPos,
  defaultWidth = 340,
  children,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: defaultPos?.x ?? 24, y: defaultPos?.y ?? 96 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  // Nothing renders until the stored position has been read, so the panel does
  // not visibly jump from its default to where the user left it.
  const [ready, setReady] = useState(false);

  const apply = useCallback(() => {
    const el = panelRef.current;
    if (el) el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
  }, []);

  const clampIntoView = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const w = el.offsetWidth || width;
    const h = el.offsetHeight || 80;
    pos.current.x = Math.min(
      Math.max(MARGIN, pos.current.x), Math.max(MARGIN, window.innerWidth - w - MARGIN)
    );
    pos.current.y = Math.min(
      Math.max(MARGIN, pos.current.y), Math.max(MARGIN, window.innerHeight - h - MARGIN)
    );
    apply();
  }, [apply, width]);

  useEffect(() => {
    let restored = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.x === 'number' && typeof s.y === 'number') {
          pos.current = { x: s.x, y: s.y };
          restored = true;
        }
        if (typeof s.w === 'number') setWidth(s.w);
        if (typeof s.collapsed === 'boolean') setCollapsed(s.collapsed);
      }
    } catch {
      // fall back to defaults
    }
    if (!restored && !defaultPos) {
      // Bottom-right by default, where the page has spare room — starting
      // over the controls would cover the very sliders it sits beside.
      pos.current = {
        x: Math.max(MARGIN, window.innerWidth - defaultWidth - 24),
        y: Math.max(MARGIN, window.innerHeight - 320),
      };
    }
    setReady(true);
    // Defer until after paint so offsetWidth reflects the real size.
    requestAnimationFrame(clampIntoView);
  }, [storageKey, clampIntoView]);

  useEffect(() => {
    if (ready) apply();
  }, [ready, apply]);

  const persist = useCallback(
    (extra: Record<string, unknown> = {}) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...pos.current, w: width, collapsed, ...extra })
        );
      } catch {
        // position just will not survive a reload
      }
    },
    [storageKey, width, collapsed]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      pos.current = { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy };
      clampIntoView();
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.style.userSelect = '';
      persist();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', clampIntoView);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', clampIntoView);
    };
  }, [clampIntoView, persist]);

  const startDrag = (e: React.PointerEvent) => {
    // Let the header buttons work without starting a drag.
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - pos.current.x, dy: e.clientY - pos.current.y };
    document.body.style.userSelect = 'none';
  };

  const resize = (delta: number) => {
    setWidth((w) => {
      const next = Math.min(640, Math.max(220, w + delta));
      requestAnimationFrame(() => {
        clampIntoView();
        try {
          localStorage.setItem(
            storageKey, JSON.stringify({ ...pos.current, w: next, collapsed })
          );
        } catch { /* ignore */ }
      });
      return next;
    });
  };

  return (
    <div
      ref={panelRef}
      style={{ width, visibility: ready ? 'visible' : 'hidden' }}
      className="fixed top-0 left-0 z-40 bg-card/95 backdrop-blur-md border border-card-border rounded-xl shadow-sm overflow-hidden"
    >
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-background/70 border-b border-card-border cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-semibold text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => resize(-60)} title="Smaller"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card-border/60">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={() => resize(60)} title="Larger"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card-border/60">
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setCollapsed((c) => {
                const next = !c;
                requestAnimationFrame(clampIntoView);
                try {
                  localStorage.setItem(
                    storageKey, JSON.stringify({ ...pos.current, w: width, collapsed: next })
                  );
                } catch { /* ignore */ }
                return next;
              });
            }}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="px-1.5 py-1 rounded text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-card-border/60"
          >
            {collapsed ? '▢' : '—'}
          </button>
          {onClose && (
            <button onClick={onClose} title="Close"
              className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Kept mounted while collapsed so the video stream is not torn down. */}
      <div className={collapsed ? 'hidden' : 'block'}>{children}</div>
    </div>
  );
};
