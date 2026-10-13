import { useEffect, useRef } from 'react';
import { api } from './api.js';

// Live updates: one Server-Sent Events stream per tab (GET /api/live). The server only says what changed -
// "pds", "pds:PDS-2026-0007", "slots", "notifications" ... - and pages refetch through the normal API.

const listeners = new Set();
let source = null;
let identity;
let connectedBefore = false;
let attempt = 0;
let retryTimer;

const emit = (topics) => listeners.forEach((l) => l(topics));

function open() {
  clearTimeout(retryTimer);
  source?.close();
  const es = new EventSource('/api/live');
  source = es;
  es.addEventListener('ready', () => {
    // After a drop (server restart, Wi-Fi) changes may have been missed: every page refetches once.
    if (connectedBefore) emit(['*']);
    connectedBefore = true;
    attempt = 0;
  });
  es.onmessage = (e) => {
    try {
      emit(JSON.parse(e.data).topics);
    } catch {
      // ignore a malformed event
    }
  };
  es.onerror = () => {
    if (source !== es) return;
    es.close();
    source = null;
    const wait = Math.min(30_000, 1000 * 2 ** attempt++);
    retryTimer = setTimeout(async () => {
      // A stream with an expired session is refused; this call renews it before reconnecting.
      await api('/auth/me').catch(() => {});
      if (!source) open();
    }, wait);
  };
}

/** (Re)connect when the signed-in user changes, so the server sends the right updates. */
export function connectLive(who) {
  if (who === identity && source) return;
  identity = who;
  open();
}

/**
 * Re-run `onChange` when any of `topics` changes on the server. Bursts are merged; a hidden tab
 * catches up when it is shown again.
 */
export function useLive(topics, onChange) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const key = topics.filter(Boolean).join(' ');
  useEffect(() => {
    if (!key) return;
    const want = key.split(' ');
    let timer;
    let missed = false;
    const run = () => {
      missed = false;
      latest.current();
    };
    const listener = (got) => {
      if (!got.includes('*') && !got.some((t) => want.includes(t))) return;
      if (document.hidden) {
        missed = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(run, 250);
    };
    const onShow = () => !document.hidden && missed && run();
    listeners.add(listener);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      listeners.delete(listener);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [key]);
}
