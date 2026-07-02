'use client';

import { useEffect, useRef, useState } from 'react';

function playChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  } catch {}
}

const FIRED_KEY = 'efficiencyFiredAlarms';
const WINDOW = 24 * 60 * 60 * 1000;

function getFired(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function saveFired(fired: Set<string>) {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recent = [...fired].filter(id => parseInt(id.split(':')[1] ?? '0') > cutoff);
  localStorage.setItem(FIRED_KEY, JSON.stringify(recent));
}

export default function TaskAlarms() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [enabled, setEnabled] = useState(true);

  // Load initial state and listen for toggle events
  useEffect(() => {
    setEnabled(localStorage.getItem('alertsEnabled') !== 'false');
    const handler = (e: Event) => {
      setEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    };
    window.addEventListener('alertsToggled', handler);
    return () => window.removeEventListener('alertsToggled', handler);
  }, []);

  useEffect(() => {
    if (!enabled) {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
      return;
    }

    async function scheduleAlarms() {
      if (localStorage.getItem('alertsEnabled') === 'false') return;
      let tasks: { id: string; content: string; due?: { datetime?: string } | null }[] = [];
      try {
        const res = await fetch('/api/todoist?limit=200');
        tasks = await res.json();
        if (!Array.isArray(tasks)) return;
      } catch { return; }

      const now = Date.now();
      const fired = getFired();

      for (const task of tasks) {
        const datetime = task.due?.datetime;
        if (!datetime) continue;
        const dueMs = new Date(datetime).getTime();
        const alarmId = `${task.id}:${dueMs}`;
        if (fired.has(alarmId) || timersRef.current.has(alarmId)) continue;
        const delay = dueMs - now;
        if (delay < -60000 || delay > WINDOW) continue;

        const t = setTimeout(() => {
          if (localStorage.getItem('alertsEnabled') === 'false') return;
          playChime();
          if (Notification.permission === 'granted') {
            new Notification('Task due now', {
              body: task.content,
              icon: '/icon-192.png',
              tag: alarmId,
            });
          }
          fired.add(alarmId);
          saveFired(fired);
          timersRef.current.delete(alarmId);
        }, Math.max(delay, 0));

        timersRef.current.set(alarmId, t);
      }
    }

    scheduleAlarms();
    const interval = setInterval(scheduleAlarms, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [enabled]);

  return null;
}
