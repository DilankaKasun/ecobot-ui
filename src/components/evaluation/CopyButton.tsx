'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * navigator.clipboard only exists on a secure origin, and this dashboard is
 * often opened over plain http on a LAN IP; the textarea fallback covers it.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <button
      onClick={async () => {
        setState((await copyText(text)) ? 'copied' : 'failed');
        setTimeout(() => setState('idle'), 1500);
      }}
      title="Copy the command"
      className="flex items-center gap-1 px-2 py-1 rounded-md border border-card-border text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
    >
      {state === 'copied' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select it' : 'Copy'}
    </button>
  );
};
