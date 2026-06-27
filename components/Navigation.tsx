'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from 'react';

const links = [
  { href: '/',         label: 'Home',     icon: '⚡' },
  { href: '/today',    label: 'Today',    icon: '✅' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/review',   label: 'Review',   icon: '📋' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const isDark = stored === null ? true : stored === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <>
      {/* ── Top bar (desktop + mobile header) ── */}
      <nav className="border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Efficiency
          </span>

          {/* Desktop nav links */}
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
            <button
              onClick={toggleDarkMode}
              className="ml-2 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Mobile: just dark mode toggle in header */}
          <button
            onClick={toggleDarkMode}
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 transition"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* ── Bottom tab bar (mobile only) ── */}
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
