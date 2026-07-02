'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TIMER_PRESETS = [
  { label: '5m', ms: 5 * 60 * 1000 },
  { label: '10m', ms: 10 * 60 * 1000 },
  { label: '15m', ms: 15 * 60 * 1000 },
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '45m', ms: 45 * 60 * 1000 },
  { label: '1h', ms: 60 * 60 * 1000 },
];

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'task' | 'timer'>('task');

  // Task state
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState(1);
  const [due, setDue] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Voice state
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer state
  const [timerLabel, setTimerLabel] = useState('');
  const [timerActive, setTimerActive] = useState<{ label: string; endsAt: number } | null>(null);
  const [remaining, setRemaining] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  useEffect(() => {
    if (open && tab === 'task') setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!timerActive) { setRemaining(''); return; }
    const tick = () => {
      const left = timerActive.endsAt - Date.now();
      if (left <= 0) { setRemaining('0:00'); return; }
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000).toString().padStart(2, '0');
      setRemaining(`${m}:${s}`);
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [timerActive]);

  const stopListening = useCallback(() => {
    if (voiceTimeoutRef.current) { clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => { if (!open) stopListening(); }, [open, stopListening]);
  useEffect(() => () => stopListening(), [stopListening]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setContent(transcript);
    };
    recognition.onend = () => {
      if (voiceTimeoutRef.current) { clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
      recognitionRef.current = null;
      setListening(false);
      inputRef.current?.focus();
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', e.error);
      stopListening();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      voiceTimeoutRef.current = setTimeout(stopListening, 10000);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      recognitionRef.current = null;
    }
  }, [stopListening]);

  const toggleVoice = useCallback(() => {
    if (listening) stopListening(); else startListening();
  }, [listening, startListening, stopListening]);

  function buildDueString() {
    if (!due && !dueTime) return '';
    if (!dueTime) return due;
    const [h, m] = dueTime.split(':').map(Number);
    const suffix = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 || 12;
    const timeStr = `${h12}:${String(m).padStart(2, '0')}${suffix}`;
    return due ? `${due} at ${timeStr}` : `today at ${timeStr}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    stopListening();
    setSaving(true);
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', content, priority, due_string: buildDueString() }),
    });
    setSaving(false);
    setSaved(true);
    setContent(''); setPriority(1); setDue(''); setDueTime('');
    setTimeout(() => { setSaved(false); setOpen(false); }, 800);
  }

  function startTimer(ms: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const endsAt = Date.now() + ms;
    const label = timerLabel.trim() || 'Timer';
    setTimerActive({ label, endsAt });

    timerRef.current = setTimeout(() => {
      setTimerActive(null);
      if (Notification.permission === 'granted') {
        new Notification('Efficiency — Timer done', {
          body: label === 'Timer' ? "Time's up!" : `${label} — time's up!`,
          icon: '/icon-192.png',
        });
      }
    }, ms);

    setTimerLabel('');
    setTimeout(() => setOpen(false), 600);
  }

  function cancelTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    timerRef.current = null;
    setTimerActive(null);
    setRemaining('');
  }

  function handleClose() {
    stopListening();
    setOpen(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
        className="fixed right-4 sm:right-6 sm:bottom-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-pink-600 rounded-full shadow-2xl shadow-violet-500/40 flex flex-col items-center justify-center hover:scale-110 transition-transform active:scale-95 z-40"
        aria-label="Quick capture"
      >
        {timerActive ? (
          <span className="text-white text-xs font-bold leading-none">{remaining}</span>
        ) : (
          <span className="text-2xl font-light text-white">+</span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0"
          onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl transition-colors duration-200">

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-white/5 p-1 mb-5">
              {(['task', 'timer'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    tab === t
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t === 'task' ? 'Task' : 'Timer'}
                </button>
              ))}
            </div>

            {/* Task tab */}
            {tab === 'task' && (
              <>
                {saved ? (
                  <div className="py-8 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-green-500 font-semibold">Task added to Todoist</p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-3">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder={listening ? 'Listening...' : "What's on your mind?"}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className={`w-full bg-gray-50 border focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition text-lg ${
                          listening ? 'border-red-400 dark:border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {voiceSupported && (
                        <button
                          type="button"
                          onClick={toggleVoice}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                            listening
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400'
                          }`}
                          aria-label={listening ? 'Stop listening' : 'Start voice input'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                            <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={priority}
                        onChange={e => setPriority(parseInt(e.target.value))}
                        className="flex-1 bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none transition"
                      >
                        <option value={4}>🔴 Urgent</option>
                        <option value={3}>🟠 High</option>
                        <option value={2}>🟡 Medium</option>
                        <option value={1}>⚪ Low</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Due: today, tomorrow..."
                        value={due}
                        onChange={e => setDue(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Alarm at</span>
                      <input
                        type="time"
                        value={dueTime}
                        onChange={e => setDueTime(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none transition"
                      />
                      {dueTime && (
                        <button type="button" onClick={() => setDueTime('')}
                          className="text-xs text-gray-400 hover:text-red-400 transition px-2 py-2">
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={handleClose}
                        className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/20 transition text-sm font-medium">
                        Cancel
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm">
                        {saving ? 'Saving...' : 'Add Task →'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Timer tab */}
            {tab === 'timer' && (
              <div className="space-y-4">
                {timerActive ? (
                  <div className="text-center py-4">
                    <p className="text-5xl font-black tabular-nums bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">{remaining}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{timerActive.label}</p>
                    <button onClick={cancelTimer}
                      className="px-6 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:text-red-500 hover:border-red-300 dark:text-gray-400 dark:hover:text-red-400 dark:hover:border-red-500/30 transition text-sm font-medium">
                      Cancel timer
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="What are you timing? (optional)"
                      value={timerLabel}
                      onChange={e => setTimerLabel(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {TIMER_PRESETS.map(({ label, ms }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => startTimer(ms)}
                          className="py-3 rounded-xl font-bold text-sm bg-gray-50 border border-gray-200 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600 dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-500 dark:hover:bg-violet-500/10 dark:text-white dark:hover:text-violet-400 transition-all"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={handleClose}
                      className="w-full py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/20 transition text-sm font-medium">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
