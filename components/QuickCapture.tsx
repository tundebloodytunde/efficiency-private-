'use client';

import { useState, useEffect, useRef } from 'react';

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState(1);
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', content, priority, due_string: due }),
    });
    setSaving(false);
    setSaved(true);
    setContent('');
    setPriority(1);
    setDue('');
    setTimeout(() => { setSaved(false); setOpen(false); }, 800);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-pink-600 rounded-full shadow-2xl shadow-violet-500/40 flex items-center justify-center text-2xl font-light hover:scale-110 transition-transform active:scale-95 z-40"
        aria-label="Quick capture"
      >
        +
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0"
          onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Quick Capture</h3>
              <span className="text-xs text-gray-600 hidden sm:block">⌘K to toggle</span>
            </div>

            {saved ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-400 font-semibold">Task added to Todoist</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition text-lg"
                  required
                />
                <div className="flex gap-3">
                  <select
                    value={priority}
                    onChange={e => setPriority(parseInt(e.target.value))}
                    className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition"
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
                    className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none transition"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-pink-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm">
                    {saving ? 'Saving...' : 'Add Task →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
