'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from 'react';

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

  const links = [
    { href: '/', label: 'Home' },
    { href: '/today', label: 'Today' },
    { href: '/calendar', label: 'Calendar' },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white/90 dark:border-white/10 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Efficiency
        </span>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
          <button onClick={toggleDarkMode} className="ml-2 text-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
