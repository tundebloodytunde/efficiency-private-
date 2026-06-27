'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Phase = 'idle' | 'work' | 'break';

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function notify(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192.png' });
  }
}

export default function FocusTimer() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secs, setSecs] = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState('');
  const [sessions, setSessions] = useState(0);
  const [open, setOpen] = useState(false);
  const [inputTask, setInputTask] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Listen for start-focus events from task rows
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ task: string }>).detail;
      setInputTask(detail.task);
      setPhase('idle');
      setSecs(WORK_SECS);
      setRunning(false);
      setOpen(true);
    }
    window.addEventListener('start-focus', handler);
    return () => window.removeEventListener('start-focus', handler);
  }, []);

  function beep() {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch { /* audio not available */ }
  }

  const tick = useCallback(() => {
    setSecs(prev => {
      if (prev <= 1) {
        beep();
        if (phase === 'work') {
          setSessions(s => s + 1);
          notify('Focus session complete!', 'Time for a 5-minute break.');
          setPhase('break');
          setRunning(true);
          return BREAK_SECS;
        } else {
          notify('Break over!', 'Ready for another focus session?');
          setPhase('work');
          setRunning(false);
          return WORK_SECS;
        }
      }
      return prev - 1;
    });
  }, [phase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  // Update page title when timer is running
  useEffect(() => {
    if (phase !== 'idle' && running) {
      document.title = `${fmt(secs)} — ${phase === 'work' ? '🎯 Focus' : '☕ Break'}`;
    } else {
      document.title = 'Efficiency';
    }
  }, [secs, phase, running]);

  function startSession() {
    setTask(inputTask.trim());
    setPhase('work');
    setSecs(WORK_SECS);
    setRunning(true);
    setOpen(false);
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  function reset() {
    setRunning(false);
    setPhase('idle');
    setSecs(WORK_SECS);
    setTask('');
    setSessions(0);
    document.title = 'Efficiency';
  }

  const pct = phase === 'break'
    ? ((BREAK_SECS - secs) / BREAK_SECS) * 100
    : ((WORK_SECS - secs) / WORK_SECS) * 100;

  const ringColor = phase === 'break' ? '#34d399' : '#8b5cf6';
  const circumference = 2 * Math.PI * 36;
  const dash = (pct / 100) * circumference;

  // ── Setup modal ─────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
          className="fixed left-4 sm:bottom-24 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all hover:border-violet-500/40 group"
          title="Start focus timer"
        >
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition">Focus</span>
        </button>

        {open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setOpen(false)}>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Focus Timer</h2>
              <p className="text-sm text-gray-500 mb-6">25 min work · 5 min break</p>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                What are you working on?
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Write project proposal"
                value={inputTask}
                onChange={e => setInputTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition mb-6"
              />

              {sessions > 0 && (
                <p className="text-sm text-violet-500 font-semibold mb-4">🔥 {sessions} session{sessions > 1 ? 's' : ''} completed today</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
                  Cancel
                </button>
                <button onClick={startSession} className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition">
                  Start →
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Active timer ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed left-4 sm:bottom-24 z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
      <div className={`rounded-2xl border shadow-xl transition-all overflow-hidden
        ${phase === 'break'
          ? 'bg-emerald-950/90 border-emerald-500/30 dark:bg-emerald-950/90'
          : 'bg-violet-950/90 border-violet-500/30 dark:bg-violet-950/90'}
      `}>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Ring */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                stroke={ringColor} strokeWidth="6"
                strokeDasharray={`${dash} ${circumference}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
              {fmt(secs)}
            </span>
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest">
              {phase === 'break' ? '☕ Break' : '🎯 Focus'}
            </div>
            {task && <div className="text-sm font-semibold text-white truncate max-w-[140px]">{task}</div>}
            {sessions > 0 && <div className="text-xs text-white/50">{sessions} done</div>}
          </div>

          {/* Controls */}
          <div className="flex gap-1.5 ml-1 shrink-0">
            <button
              onClick={() => setRunning(r => !r)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition"
            >
              {running ? '⏸' : '▶'}
            </button>
            <button
              onClick={reset}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
