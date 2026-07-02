'use client';

import { useState, useEffect } from 'react';
import { getNotesForDate, getRecentNoteDates, Note } from '@/lib/notes';

interface TaskEntry {
  id: string;
  content: string;
  priority: number;
  completedAt: string;
}

interface CompletedData {
  byDate: Record<string, TaskEntry[]>;
  dates: string[];
}

interface WeekStats {
  completed: number;
  missed: number;
  events: number;
  weekStart: string;
  weekEnd: string;
}

const PRIORITY_DOT: Record<number, string> = {
  4: 'bg-red-500',
  3: 'bg-orange-400',
  2: 'bg-yellow-400',
  1: 'bg-gray-400',
};

function dayLabel(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.round((today.setHours(0,0,0,0) - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  if (diff === 2) return '2 days ago';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function ReviewContent({ text }: { text: string }) {
  const sections = text.split(/\n(?=##\s)/);
  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        const lines = section.trim().split('\n');
        const heading = lines[0].replace(/^##\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        const bullets = body.split('\n').filter(l => l.trim());
        return (
          <div key={i} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">{heading}</h3>
            <ul className="space-y-2">
              {bullets.map((b, j) => (
                <li key={j} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {b.replace(/^[•\-*]\s*/, '')}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ByDayTab() {
  const [data, setData] = useState<CompletedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notesByDate, setNotesByDate] = useState<Record<string, Note[]>>({});
  const [allDates, setAllDates] = useState<string[]>([]);

  function loadNotes(taskDates: string[]) {
    const noteDates = getRecentNoteDates();
    const merged = [...new Set([...taskDates, ...noteDates])].sort((a, b) => b.localeCompare(a));
    setAllDates(merged);
    const map: Record<string, Note[]> = {};
    for (const d of merged) { map[d] = getNotesForDate(d); }
    setNotesByDate(map);
  }

  useEffect(() => {
    fetch('/api/todoist/completed')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        loadNotes(d?.dates ?? []);
      })
      .catch(() => { setError('Failed to load completed tasks.'); setLoading(false); loadNotes([]); });
  }, []);

  useEffect(() => {
    function onNotesUpdated() { loadNotes(data?.dates ?? []); }
    window.addEventListener('notesUpdated', onNotesUpdated);
    return () => window.removeEventListener('notesUpdated', onNotesUpdated);
  }, [data]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading completed tasks...</p>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>;
  }

  if (!loading && !error && allDates.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl mb-3">🎉</p>
        <p className="text-gray-500">No completed tasks or notes from the past 14 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {allDates.map(date => {
        const tasks = data?.byDate[date] ?? [];
        const notes = notesByDate[date] ?? [];
        if (tasks.length === 0 && notes.length === 0) return null;
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{dayLabel(date)}</span>
              <span className="text-xs text-gray-400">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {tasks.length > 0 && (
                <span className="ml-auto text-xs font-semibold text-green-500">{tasks.length} done</span>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="space-y-2 mb-2">
                {tasks.map(task => (
                  <div key={task.id}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 line-through leading-snug flex-1">
                      {task.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {notes.length > 0 && (
              <div className="space-y-2">
                {notes.map(note => (
                  <div key={note.id}
                    className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
                    <span className="text-amber-500 flex-shrink-0 text-sm mt-0.5">📝</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed flex-1">{note.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekReviewTab() {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState('');
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setReview('');
    setError('');
    try {
      const res = await fetch('/api/review', { method: 'POST' });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setReview(data.review);
      setStats(data.stats);
    } catch {
      setError('Failed to generate review. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">AI-powered analysis of your week</p>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-orange-500/25 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : review ? 'Regenerate' : 'Generate Review'}
        </button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-green-500">{stats.completed}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">Completed</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-red-500">{stats.missed}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">Still Open</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-blue-500">{stats.events}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">Events</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
            Week of {formatDate(stats.weekStart)} – {formatDate(stats.weekEnd)}
          </p>
        </>
      )}

      {loading && (
        <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Claude is reviewing your week...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
      )}

      {review && !loading && <ReviewContent text={review} />}

      {!review && !loading && !error && (
        <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">Ready when you are</p>
          <p className="text-gray-500 mt-1 text-sm">Claude will analyze your completed tasks, missed items, and calendar to give you an honest look at your week.</p>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const [tab, setTab] = useState<'day' | 'week'>('day');

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
          Review
        </h1>
        <p className="text-gray-500 mt-1">What you&apos;ve accomplished.</p>
      </div>

      <div className="flex rounded-xl bg-gray-100 dark:bg-white/5 p-1 mb-6">
        {([['day', 'Prior Days'], ['week', 'Week Review']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
              tab === key
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'day' ? <ByDayTab /> : <WeekReviewTab />}
    </>
  );
}
