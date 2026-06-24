'use client';

import Link from "next/link";
import { useEffect, useState } from 'react';

export default function Navigation() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true' || 
      (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl text-gray-900 dark:text-gray-100">Efficiency</Link>

        <div className="flex items-center gap-8 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Home</Link>
          <Link href="/today" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Today</Link>
          <Link href="/calendar" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Calendar</Link>
          <button 
            onClick={toggleDarkMode}
            className="text-xl hover:scale-110 transition"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}