'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
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
    if (perm === 'granted') { subscribe(); setStatus('granted'); }
    else if (perm === 'denied') setStatus('denied');
    else {
      // Show prompt after 3s if not yet asked
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
    if (perm === 'granted') subscribe();
  }

  if (!shown || status !== 'unknown') return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-24 sm:w-80 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-2xl z-40 flex items-start gap-3">
      <span className="text-2xl">🔔</span>
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
          <button
            onClick={() => setShown(false)}
            className="flex-1 border border-white/10 text-gray-400 text-xs py-1.5 rounded-lg hover:text-white transition"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
