'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Task {
  id: number;
  title: string;
  category: string;
  priority: number;
  estimated_minutes: number;
  status: string;
}

const MOCK_TASKS: Task[] = [
  { id: 1, title: "Pre-op AAA review", category: "clinical", priority: 1, estimated_minutes: 60, status: "pending" },
  { id: 2, title: "Follow up labs", category: "practice", priority: 2, estimated_minutes: 30, status: "pending" },
];

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'clinical',
    priority: 3,
    estimated_minutes: 30,
  });

  async function loadTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false });

    if (error) {
      setIsMockMode(true);
      setTasks(MOCK_TASKS);
    } else {
      setIsMockMode(false);
      setTasks(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadTasks(); }, []);

  async function markDone(id: number) {
    if (isMockMode) {
      setTasks(prev => prev.filter(t => t.id !== id));
      return;
    }
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
    loadTasks();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!newTask.title.trim()) return;

    if (isMockMode) {
      const mockNew: Task = {
        id: Date.now(),
        ...newTask,
        status: 'pending',
      };
      setTasks(prev => [...prev, mockNew]);
      resetModal();
      return;
    }

    const { error } = await supabase.from('tasks').insert([{
      title: newTask.title,
      category: newTask.category,
      priority: newTask.priority,
      estimated_minutes: newTask.estimated_minutes,
      status: 'pending',
    }]);

    if (error) {
      setFormError('Failed to create task. Please try again.');
    } else {
      resetModal();
      loadTasks();
    }
  }

  function resetModal() {
    setShowModal(false);
    setFormError('');
    setNewTask({ title: '', category: 'clinical', priority: 3, estimated_minutes: 30 });
  }

  async function generateBrief() {
    setBriefLoading(true);
    setBrief('');
    try {
      const res = await fetch('/api/brief', { method: 'POST' });
      const data = await res.json();
      setBrief(data.brief || data.error || 'No response received.');
    } catch {
      setBrief('Failed to generate brief. Check your API key.');
    }
    setBriefLoading(false);
  }

  const priorityLabel = (p: number) => ({ 1: 'High', 2: 'Medium', 3: 'Low' }[p] ?? 'Low');

  if (loading) return <div className="py-20 text-center text-xl text-gray-400">Loading your day...</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Today</h1>
          <p className="text-gray-500 mt-1">
            Focus on what matters
            {isMockMode && <span className="ml-2 text-xs text-amber-500">(offline mode)</span>}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all active:scale-95 shadow"
        >
          + New Task
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Daily Brief</h2>
          <button
            onClick={generateBrief}
            disabled={briefLoading}
            className="text-sm bg-gray-900 dark:bg-gray-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-700 dark:hover:bg-gray-500 transition disabled:opacity-50"
          >
            {briefLoading ? 'Thinking...' : 'Generate'}
          </button>
        </div>
        {brief ? (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{brief}</p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Hit Generate to get an AI-powered summary of your day.</p>
        )}
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center">
            <p className="text-2xl text-gray-400 dark:text-gray-500">No pending tasks</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Add some to get started</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-5 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
              <div>
                <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{task.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {task.category} · {priorityLabel(task.priority)} priority · {task.estimated_minutes} min
                </div>
              </div>
              <button
                onClick={() => markDone(task.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-medium transition-all active:scale-95 shrink-0"
              >
                Done
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">New Task</h3>

            <form onSubmit={createTask} className="space-y-5">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-400"
                required
                autoFocus
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                  >
                    <option value="clinical">Clinical</option>
                    <option value="or">OR</option>
                    <option value="practice">Practice</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Time (min)</label>
                  <input
                    type="number"
                    min={5}
                    value={newTask.estimated_minutes}
                    onChange={e => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-600 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
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
