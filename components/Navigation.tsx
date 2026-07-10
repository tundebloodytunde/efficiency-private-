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
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathname === href
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={toggleDarkMode}
              className="ml-1 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Mobile header */}
          <div className="sm:hidden flex items-center gap-1">
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
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
              >
                <span className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
                  active ? 'bg-violet-500/15' : ''
                }`}>
                  <span className="text-xl leading-none">{icon}</span>
                  <span className={`text-[10px] font-bold tracking-wide ${
                    active ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
