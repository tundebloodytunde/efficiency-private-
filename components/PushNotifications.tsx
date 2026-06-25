'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// Schedule browser notifications for time-specific tasks today
async function scheduleLocalAlerts() {
  if (Notification.permission !== 'granted') return;
  const res = await fetch('/api/todoist');
  const tasks = await res.json();
  if (!Array.isArray(tasks)) return;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const now = Date.now();

  tasks.forEach((t: { content: string; due?: { date: string } }) => {
    if (!t.due?.date || t.due.date.length === 10) return; // skip date-only
    if (!t.due.date.startsWith(todayStr)) return;
    const dueMs = new Date(t.due.date).getTime();
    const alertMs = dueMs - 10 * 60 * 1000; // 10 min before
    if (alertMs <= now) return;

    setTimeout(() => {
      new Notification('Efficiency — Task Due Soon', {
        body: `${t.content} is due in 10 minutes`,
        icon: '/icon-192.png',
      });
    }, alertMs - now);
  });
}

export default function PushNotifications() {
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
      setStatus('granted');
      subscribe();
      scheduleLocalAlerts();
    } else if (perm === 'denied') {
      setStatus('denied');
    } else {
      const t = setTimeout(() => setShown(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    } catch (e) {
      console.error('Push subscription failed', e);
    }
  }

  async function requestPermission() {
    setShown(false);
    const perm = await Notification.requestPermission();
    setStatus(perm === 'granted' ? 'granted' : 'denied');
    if (perm === 'granted') {
      subscribe();
      scheduleLocalAlerts();
    }
  }

  if (!shown || status !== 'unknown') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-24 sm:w-80 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-2xl z-40 flex items-start gap-3">
      <span className="text-2xl">🔔</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Enable alerts?</p>
        <p className="text-xs text-gray-400 mt-0.5">Get notified when tasks are due.</p>
        <div className="flex gap-2 mt-3">
          <button onClick={requestPermission} className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs py-1.5 rounded-lg font-semibold hover:opacity-90 transition">
            Enable
          </button>
          <button onClick={() => setShown(false)} className="flex-1 border border-white/10 text-gray-400 text-xs py-1.5 rounded-lg hover:text-white transition">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
