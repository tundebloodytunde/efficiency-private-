'use client';

import { useState } from 'react';

interface Stats {
  completed: number;
  missed: number;
  events: number;
  weekStart: string;
  weekEnd: string;
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

export default function ReviewPage() {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
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
    }
    setLoading(false);
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-violet-500 mb-1">AI-Powered</p>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              Weekly Review
            </h1>
            <p className="text-gray-500 mt-1">What worked. What didn&apos;t. What&apos;s next.</p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : review ? 'Regenerate' : 'Generate Review'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
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
      )}

      {/* Week label */}
      {stats && (
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-4">
          Week of {formatDate(stats.weekStart)} – {formatDate(stats.weekEnd)}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Claude is reviewing your week...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
      )}

      {/* Review content */}
      {review && !loading && <ReviewContent text={review} />}

      {/* Empty state */}
      {!review && !loading && !error && (
        <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">Ready when you are</p>
          <p className="text-gray-500 mt-1 text-sm">Claude will analyze your completed tasks, missed items, and calendar to give you an honest look at your week.</p>
        </div>
      )}
    </>
  );
}
