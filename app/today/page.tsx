'use client';

import { useEffect, useRef, useState } from 'react';
import { getNotesForDate, deleteNote, getTodayString, Note } from '@/lib/notes';

interface TriageItem { num: number; task: string; reason: string; }
interface TriageResult {
  do_now: TriageItem[];
  schedule: TriageItem[];
  delegate: TriageItem[];
  drop: TriageItem[];
}

interface Task {
  id: string;
  content: string;
  priority: number;
  due?: { date: string; string: string } | null;
  labels: string[];
  description: string;
}

const PRIORITY = {
  4: { label: 'Urgent', bg: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30' },
  3: { label: 'High', bg: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30' },
  2: { label: 'Medium', bg: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30' },
  1: { label: 'Low', bg: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30' },
} as Record<number, { label: string; bg: string }>;

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow',    due: 'tomorrow' },
  { label: 'In 3 days',  due: 'in 3 days' },
  { label: 'Next week',  due: 'next week' },
  { label: 'Next month', due: 'next month' },
];

const todayKey = () => new Date().toLocaleDateString('en-CA');

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [newTask, setNewTask] = useState({ content: '', priority: 1, due_string: '' });
  const [notes, setNotes] = useState<Note[]>([]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
  const snoozeRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  async function loadTasks(silent = false) {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch('/api/todoist');
      const data = await res.json();
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      setTasks(Array.isArray(data) ? data.filter((t: Task) => t.due?.date?.startsWith(todayStr)) : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  function loadNotes() {
    setNotes(getNotesForDate(getTodayString()));
  }

  // Restore cached brief and triage for today
  useEffect(() => {
    const key = todayKey();
    const cachedBrief = localStorage.getItem(`dailyBrief-${key}`);
    if (cachedBrief) setBrief(cachedBrief);

    const cachedTriage = localStorage.getItem(`triage-${key}`);
    if (cachedTriage) {
      try { setTriage(JSON.parse(cachedTriage)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadNotes();
    function onVisible() { if (document.visibilityState === 'visible') loadTasks(true); }
    window.addEventListener('notesUpdated', loadNotes);
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(() => loadTasks(true), 5 * 60 * 1000);
    return () => {
      window.removeEventListener('notesUpdated', loadNotes);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(poll);
    };
  }, []);

  // Auto-generate brief once per day if none cached
  useEffect(() => {
    const key = todayKey();
    if (!localStorage.getItem(`dailyBrief-${key}`)) {
      generateBrief();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close snooze menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setSnoozeOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markDone(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', taskId }),
    });
  }

  async function snoozeTask(taskId: string, dueString: string) {
    setSnoozeOpen(null);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', taskId, due_string: dueString }),
    });
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!newTask.content.trim()) return;
    const res = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newTask }),
    });
    if (!res.ok) { setFormError('Failed to create task.'); return; }
    resetModal();
    loadTasks();
  }

  function resetModal() {
    setShowModal(false);
    setFormError('');
    setNewTask({ content: '', priority: 1, due_string: '' });
  }

  async function generateBrief() {
    setBriefLoading(true);
    setBrief('');
    try {
      const res = await fetch('/api/brief', { method: 'POST' });
      const data = await res.json();
      const text = data.brief || data.error || 'No response received.';
      setBrief(text);
      localStorage.setItem(`dailyBrief-${todayKey()}`, text);
    } catch {
      setBrief('Failed to generate brief.');
    }
    setBriefLoading(false);
  }

  async function runTriage() {
    setTriageLoading(true);
    setTriage(null);
    try {
      const res = await fetch('/api/triage', { method: 'POST' });
      const data = await res.json();
      setTriage(data);
      localStorage.setItem(`triage-${todayKey()}`, JSON.stringify(data));
    } catch {
      // silently fail
    }
    setTriageLoading(false);
  }

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500">Loading your day...</p>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-violet-500 mb-1">{dateLabel}</p>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Today
            </h1>
            <p className="text-gray-500 mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} due</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTasks(true)}
              disabled={refreshing}
              title="Refresh tasks"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-violet-500 hover:bg-violet-500/10 transition-all disabled:opacity-40"
            >
              <span className={`text-xl leading-none select-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-violet-600 to-pink-600 text-white px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-violet-500/25"
            >
              + New Task
            </button>
          </div>
        </div>
      </div>

      {/* Daily Brief */}
      <div className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20 backdrop-blur">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="font-bold text-gray-900 dark:text-white">Daily Brief</h2>
          </div>
          <button
            onClick={generateBrief}
            disabled={briefLoading}
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-xl font-medium transition disabled:opacity-50"
          >
            {briefLoading ? 'Thinking...' : brief ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {briefLoading ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-gray-500 text-sm">Generating your briefing...</p>
          </div>
        ) : brief ? (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">{brief}</p>
        ) : (
          <p className="text-gray-500 text-sm">Generating your daily briefing...</p>
        )}
      </div>

      {/* AI Priority Triage */}
      <div className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 backdrop-blur">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h2 className="font-bold text-gray-900 dark:text-white">Priority Triage</h2>
          </div>
          <button
            onClick={runTriage}
            disabled={triageLoading}
            className="text-sm bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-xl font-medium transition disabled:opacity-50"
          >
            {triageLoading ? 'Thinking...' : triage ? 'Re-triage' : 'Triage'}
          </button>
        </div>
        {!triage && !triageLoading && (
          <p className="text-gray-500 text-sm">AI ranks all your open tasks by urgency and importance.</p>
        )}
        {triageLoading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Analyzing your tasks...</p>
          </div>
        )}
        {triage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {[
              { key: 'do_now' as const, label: '🔴 Do Now', bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500 text-white' },
              { key: 'schedule' as const, label: '🔵 Schedule', bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500 text-white' },
              { key: 'delegate' as const, label: '🟡 Reconsider', bg: 'bg-yellow-500/10 border-yellow-500/20', badge: 'bg-yellow-500 text-white' },
              { key: 'drop' as const, label: '⚫ Drop', bg: 'bg-gray-500/10 border-gray-500/20', badge: 'bg-gray-500 text-white' },
            ].map(({ key, label, bg, badge }) => {
              const items = triage[key] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={key} className={`rounded-xl p-4 border ${bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badge}`}>{items.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.task}</span>
                        {item.reason && <span className="text-gray-400 dark:text-gray-500"> — {item.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3" ref={snoozeRef}>
        {tasks.length === 0 ? (
          <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">Clear day ahead</p>
            <p className="text-gray-500 mt-1">No tasks due today</p>
          </div>
        ) : (
          tasks.map(task => {
            const p = PRIORITY[task.priority] ?? PRIORITY[1];
            return (
              <div key={task.id} className="group relative bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 rounded-2xl px-5 py-4 flex justify-between items-center transition-all">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-semibold text-gray-900 dark:text-white">{task.content}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg}`}>
                      {p.label}
                    </span>
                    {task.due && (
                      <span className="text-xs text-gray-500">{task.due.string}</span>
                    )}
                    {task.description && (
                      <span className="text-xs text-gray-500 truncate">{task.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const event = new CustomEvent('start-focus', { detail: { task: task.content } });
                      window.dispatchEvent(event);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-all"
                    title="Start focus timer"
                  >
                    🎯 Focus
                  </button>
                  {/* Snooze */}
                  <div className="relative">
                    <button
                      onClick={() => setSnoozeOpen(snoozeOpen === task.id ? null : task.id)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm flex items-center justify-center hover:bg-blue-500/20 transition-all"
                      title="Snooze task"
                    >
                      📅
                    </button>
                    {snoozeOpen === task.id && (
                      <div className="absolute right-0 top-10 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-2 min-w-[140px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 pb-1">Snooze until</p>
                        {SNOOZE_OPTIONS.map(opt => (
                          <button
                            key={opt.due}
                            onClick={() => snoozeTask(task.id, opt.due)}
                            className="w-full text-left px-3 py-2 text-sm rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition font-medium"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => markDone(task.id)}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-white/20 group-hover:border-green-500 hover:bg-green-500 transition-all flex items-center justify-center text-transparent hover:text-white text-sm"
                  >
                    ✓
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Today's Notes */}
      {notes.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📝</span>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Today&apos;s Notes</h2>
            <span className="ml-auto text-xs text-gray-400">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="group flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                <button
                  onClick={() => { deleteNote(getTodayString(), note.id); loadNotes(); window.dispatchEvent(new Event('notesUpdated')); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0 mt-0.5 text-lg leading-none"
                  title="Delete note"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">New Task</h3>
            <form onSubmit={createTask} className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTask.content}
                onChange={e => setNewTask({ ...newTask, content: e.target.value })}
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                    className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none transition"
                  >
                    <option value={4}>🔴 Urgent</option>
                    <option value={3}>🟠 High</option>
                    <option value={2}>🟡 Medium</option>
                    <option value={1}>⚪ Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Due</label>
                  <input
                    type="text"
                    placeholder="today, tomorrow..."
                    value={newTask.due_string}
                    onChange={e => setNewTask({ ...newTask, due_string: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                  />
                </div>
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetModal} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
