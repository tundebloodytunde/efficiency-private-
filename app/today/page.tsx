'use client';

import { useEffect, useState } from 'react';

interface Task {
  id: string;
  content: string;
  priority: number;
  due?: { date: string; string: string } | null;
  labels: string[];
  description: string;
}

const PRIORITY = {
  4: { label: 'Urgent', bg: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  3: { label: 'High', bg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  2: { label: 'Medium', bg: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  1: { label: 'Low', bg: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
} as Record<number, { label: string; bg: string }>;

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [newTask, setNewTask] = useState({ content: '', priority: 1, due_string: '' });

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/todoist');
      const data = await res.json();
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      setTasks(Array.isArray(data) ? data.filter((t: Task) => t.due?.date?.startsWith(todayStr)) : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadTasks(); }, []);

  async function markDone(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', taskId }),
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
      setBrief(data.brief || data.error || 'No response received.');
    } catch {
      setBrief('Failed to generate brief.');
    }
    setBriefLoading(false);
  }

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-500">Loading your day...</p>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-violet-400 mb-1">{dateLabel}</p>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Today
            </h1>
            <p className="text-gray-500 dark:text-gray-500 mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} due</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-violet-600 to-pink-600 text-white px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-violet-500/25"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Daily Brief */}
      <div className="rounded-3xl p-6 mb-6 bg-gradient-to-br from-violet-100/60 to-pink-100/30 dark:from-violet-900/40 dark:to-pink-900/20 border border-violet-300/40 dark:border-violet-500/20 backdrop-blur transition-colors duration-200">
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
            {briefLoading ? 'Thinking...' : 'Generate'}
          </button>
        </div>
        {brief ? (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm">{brief}</p>
        ) : (
          <p className="text-gray-500 text-sm">Generate an AI-powered briefing based on your schedule and tasks.</p>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-3xl p-16 text-center border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5 transition-colors duration-200">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">Clear day ahead</p>
            <p className="text-gray-500 mt-1">No tasks due today</p>
          </div>
        ) : (
          tasks.map(task => {
            const p = PRIORITY[task.priority] ?? PRIORITY[1];
            return (
              <div key={task.id} className="group bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/5 dark:hover:border-white/10 rounded-2xl px-5 py-4 flex justify-between items-center transition-all duration-200">
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
                <button
                  onClick={() => markDone(task.id)}
                  className="shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-green-500 hover:bg-green-500 dark:border-white/20 transition-all flex items-center justify-center text-transparent hover:text-white text-sm"
                >
                  ✓
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl transition-colors duration-200">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">New Task</h3>
            <form onSubmit={createTask} className="space-y-4">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTask.content}
                onChange={e => setNewTask({ ...newTask, content: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none transition"
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
                    className="w-full bg-gray-50 border border-gray-200 focus:border-violet-500 dark:bg-white/5 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition"
                  />
                </div>
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetModal} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/20 transition">
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
