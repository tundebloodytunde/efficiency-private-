'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const DISMISS_KEY = 'pushDismissedAt';
const REDISPLAY_AFTER = 24 * 60 * 60 * 1000; // re-show after 24h if dismissed

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

async function scheduleLocalAlerts() {
  if (Notification.permission !== 'granted') return;
  const res = await fetch('/api/todoist?limit=200');
  const tasks = await res.json();
  if (!Array.isArray(tasks)) return;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const now = Date.now();
  tasks.forEach((t: { content: string; due?: { date: string } }) => {
    if (!t.due?.date || t.due.date.length === 10) return;
    if (!t.due.date.startsWith(todayStr)) return;
    const dueMs = new Date(t.due.date).getTime();
    const alertMs = dueMs - 10 * 60 * 1000;
    if (alertMs <= now) return;
    setTimeout(() => {
      new Notification('Efficiency — Task Due Soon', {
        body: `${t.content} is due in 10 minutes`,
        icon: '/icon-192.png',
      });
    }, alertMs - now);
  });
}

type Status = 'unknown' | 'granted' | 'denied' | 'unsupported' | 'needs-pwa';

export default function PushNotifications() {
  const [status, setStatus] = useState<Status>('unknown');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (!('serviceWorker' in navigator)) { setStatus('unsupported'); return; }

    // iOS in browser (not installed as PWA) — push won't work until installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (isIOS && !isPWA) { setStatus('needs-pwa'); showIfNeeded(); return; }

    const perm = Notification.permission;
    if (perm === 'granted') {
      setStatus('granted');
      subscribe();
      scheduleLocalAlerts();
    } else if (perm === 'denied') {
      setStatus('denied');
      showIfNeeded();
    } else {
      setStatus('unknown');
      showIfNeeded();
    }
  }, []);

  function showIfNeeded() {
    const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) ?? '0');
    if (Date.now() - dismissed > REDISPLAY_AFTER) setVisible(true);
  }

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) return;
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
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setStatus('granted');
      setVisible(false);
      subscribe();
      scheduleLocalAlerts();
    } else {
      setStatus('denied');
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  // Expose a global trigger so the nav bell can re-open this
  useEffect(() => {
    (window as { __openPushPrompt?: () => void }).__openPushPrompt = () => setVisible(true);
    return () => { delete (window as { __openPushPrompt?: () => void }).__openPushPrompt; };
  }, []);

  if (!visible) return null;

  if (status === 'needs-pwa') {
    return (
      <Banner onDismiss={dismiss}>
        <div className="text-2xl">📲</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Add to Home Screen first</p>
          <p className="text-xs text-gray-400 mt-0.5">
            iOS requires the app to be installed. Tap the Share button → <strong className="text-gray-300">Add to Home Screen</strong>.
          </p>
          <button onClick={dismiss} className="mt-3 w-full border border-white/10 text-gray-400 text-xs py-1.5 rounded-lg hover:text-white transition">
            Got it
          </button>
        </div>
      </Banner>
    );
  }

  if (status === 'denied') {
    return (
      <Banner onDismiss={dismiss}>
        <div className="text-2xl">🔕</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Notifications blocked</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Go to <strong className="text-gray-300">Settings → Notifications → Efficiency</strong> and turn them on.
          </p>
          <button onClick={dismiss} className="mt-3 w-full border border-white/10 text-gray-400 text-xs py-1.5 rounded-lg hover:text-white transition">
            Dismiss
          </button>
        </div>
      </Banner>
    );
  }

  return (
    <Banner onDismiss={dismiss}>
      <div className="text-2xl">🔔</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Enable alerts?</p>
        <p className="text-xs text-gray-400 mt-0.5">Get notified when tasks are due.</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={requestPermission}
            className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs py-1.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Enable
          </button>
          <button onClick={dismiss} className="flex-1 border border-white/10 text-gray-400 text-xs py-1.5 rounded-lg hover:text-white transition">
            Not now
          </button>
        </div>
      </div>
    </Banner>
  );
}

function Banner({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
      {children}
      <button onClick={onDismiss} className="text-gray-600 hover:text-gray-400 text-lg leading-none shrink-0 -mt-0.5">×</button>
    </div>
  );
}
