'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from 'react';

const links = [
  { href: '/',         label: 'Home',     icon: '⚡' },
  { href: '/today',    label: 'Today',    icon: '✅' },
  { href: '/habits',   label: 'Habits',   icon: '🔥' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/review',   label: 'Review',   icon: '📋' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);
  const [notifGranted, setNotifGranted] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const isDark = stored === null ? true : stored === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    const granted = Notification.permission === 'granted';
    setNotifGranted(granted);
    if (granted) {
      setAlertsEnabled(localStorage.getItem('alertsEnabled') !== 'false');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  function handleBell() {
    if (!notifGranted) {
      // Not yet permitted — open the push prompt
      const fn = (window as { __openPushPrompt?: () => void }).__openPushPrompt;
      if (fn) fn();
      return;
    }
    // Toggle alerts on/off
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    localStorage.setItem('alertsEnabled', String(next));
    window.dispatchEvent(new CustomEvent('alertsToggled', { detail: { enabled: next } }));
  }

  // Keep notifGranted in sync after user grants permission via the prompt
  useEffect(() => {
    function onFocus() {
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotifGranted(true);
        setAlertsEnabled(localStorage.getItem('alertsEnabled') !== 'false');
      }
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const bellOn = notifGranted && alertsEnabled;
  const bellTitle = !notifGranted
    ? 'Enable notifications'
    : alertsEnabled ? 'Alerts on — tap to mute' : 'Alerts muted — tap to unmute';

  const BellButton = ({ className }: { className?: string }) => (
    <button
      onClick={handleBell}
      title={bellTitle}
      className={className}
      aria-label={bellTitle}
    >
      {bellOn ? '🔔' : '🔕'}
    </button>
  );

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Efficiency
          </span>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === href
                    ? 'bg-gray-900/10 dark:bg-white/10 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
            <BellButton className={`w-9 h-9 flex items-center justify-center rounded-xl transition hover:bg-gray-100 dark:hover:bg-white/5 ${
              bellOn ? 'text-violet-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`} />
            <button
              onClick={toggleDarkMode}
              className="ml-1 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Mobile header */}
          <div className="sm:hidden flex items-center gap-1">
            <BellButton className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${
              bellOn ? 'text-violet-500' : 'text-gray-400'
            }`} />
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Bottom tab bar (mobile) ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${
                  active ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span className="text-2xl leading-none">{icon}</span>
                <span className={`text-xs font-semibold tracking-wide ${active ? 'text-violet-500' : ''}`}>
                  {label}
                </span>
                {active && <span className="absolute bottom-0 w-8 h-0.5 bg-violet-500 rounded-full" />}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
