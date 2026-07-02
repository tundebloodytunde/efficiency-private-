'use client';

import { useEffect, useState, useRef } from 'react';
import { Habit, getHabits, addHabit, removeHabit, toggleHabit, getStreak, getHistory, getCompletedForDate, getTodayHabitStr } from '@/lib/habits';

const EMOJI_PRESETS = ['💪', '🏃', '📚', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🧹', '🪴', '🎨', '🎵', '🙏', '☀️', '🚴', '🧠', '💊'];

function HabitRow({ habit, onToggle, onRemove }: {
  habit: Habit;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const today = getTodayHabitStr();
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<{ date: string; done: boolean }[]>([]);

  useEffect(() => {
    setDone(getCompletedForDate(today).has(habit.id));
    setStreak(getStreak(habit.id));
    setHistory(getHistory(habit.id, 14));
  }, [habit.id, today]);

  function handleToggle() {
    const next = toggleHabit(habit.id, today);
    setDone(next);
    setStreak(getStreak(habit.id));
    setHistory(getHistory(habit.id, 14));
    onToggle();
  }

  return (
    <div className={`group rounded-2xl px-5 py-4 border transition-all ${
      done
        ? 'bg-green-500/10 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/30'
        : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
    }`}>
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggle}
          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all shrink-0 ${
            done
              ? 'bg-green-500 border-green-500 text-white scale-110'
              : 'border-gray-300 dark:border-white/20 hover:border-green-400 text-transparent hover:text-green-400'
          }`}
        >
          {done ? '✓' : '○'}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{habit.emoji}</span>
            <span className={`font-semibold text-base ${done ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
              {habit.name}
            </span>
            {streak > 0 && (
              <span className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
                🔥{streak}
              </span>
            )}
          </div>
          {/* 14-day history dots */}
          <div className="flex gap-1 mt-2">
            {history.map(({ date, done: d }) => (
              <div
                key={date}
                title={date}
                className={`w-4 h-4 rounded-full transition-all ${d ? 'bg-green-500' : 'bg-gray-200 dark:bg-white/10'}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-all text-xl shrink-0"
          title="Remove habit"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [completedCount, setCompletedCount] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const today = getTodayHabitStr();

  function load() {
    const h = getHabits();
    setHabits(h);
    const done = getCompletedForDate(today);
    setCompletedCount(h.filter(h => done.has(h.id)).length);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (adding) setTimeout(() => nameRef.current?.focus(), 50);
  }, [adding]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addHabit(newName, newEmoji);
    setNewName('');
    setNewEmoji('⭐');
    setAdding(false);
    load();
  }

  function handleRemove(id: string) {
    if (!confirm('Remove this habit?')) return;
    removeHabit(id);
    load();
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const allDone = habits.length > 0 && completedCount === habits.length;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-500 mb-1">{todayLabel}</p>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              Habits
            </h1>
            {habits.length > 0 && (
              <p className="text-gray-500 mt-1">
                {completedCount} / {habits.length} done today
                {allDone && ' 🎉'}
              </p>
            )}
          </div>
          <button
            onClick={() => setAdding(a => !a)}
            className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-orange-500/25"
          >
            {adding ? 'Cancel' : '+ New Habit'}
          </button>
        </div>
      </div>

      {/* Add habit form */}
      {adding && (
        <form onSubmit={handleAdd} className="mb-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex gap-3">
            <input
              ref={nameRef}
              type="text"
              placeholder="Habit name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition"
              required
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Emoji</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    newEmoji === e
                      ? 'bg-orange-500/20 border-2 border-orange-500 scale-110'
                      : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-orange-300'
                  }`}
                >
                  {e}
                </button>
              ))}
              <input
                type="text"
                maxLength={2}
                placeholder="✏️"
                value={EMOJI_PRESETS.includes(newEmoji) ? '' : newEmoji}
                onChange={e => { if (e.target.value) setNewEmoji(e.target.value); }}
                className="w-10 h-10 rounded-xl text-center text-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-orange-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
          >
            Add Habit
          </button>
        </form>
      )}

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="rounded-3xl p-16 text-center border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">No habits yet</p>
          <p className="text-gray-500 mt-1 text-sm">Add your first habit to start tracking streaks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onToggle={load}
              onRemove={() => handleRemove(habit.id)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {habits.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-6">
          Each dot = 1 day · Last 14 days
        </p>
      )}
    </>
  );
}
