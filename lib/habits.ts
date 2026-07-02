export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

const HABITS_KEY = 'habits';
const logKey = (date: string) => `habit-log-${date}`;
const todayStr = () => new Date().toLocaleDateString('en-CA');

export function getHabits(): Habit[] {
  try { return JSON.parse(localStorage.getItem(HABITS_KEY) ?? '[]'); }
  catch { return []; }
}

export function addHabit(name: string, emoji: string): Habit {
  const habit: Habit = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: name.trim(),
    emoji,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(HABITS_KEY, JSON.stringify([...getHabits(), habit]));
  return habit;
}

export function removeHabit(id: string) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(getHabits().filter(h => h.id !== id)));
}

export function getCompletedForDate(date: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(logKey(date)) ?? '[]')); }
  catch { return new Set(); }
}

export function toggleHabit(habitId: string, date: string): boolean {
  const done = getCompletedForDate(date);
  if (done.has(habitId)) done.delete(habitId); else done.add(habitId);
  localStorage.setItem(logKey(date), JSON.stringify([...done]));
  return done.has(habitId);
}

export function getStreak(habitId: string): number {
  const today = new Date();
  const t = todayStr();
  const todayDone = getCompletedForDate(t).has(habitId);
  let streak = 0;
  for (let i = todayDone ? 0 : 1; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (!getCompletedForDate(d.toLocaleDateString('en-CA')).has(habitId)) break;
    streak++;
  }
  return streak;
}

export function getHistory(habitId: string, days = 14): { date: string; done: boolean }[] {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const date = d.toLocaleDateString('en-CA');
    return { date, done: getCompletedForDate(date).has(habitId) };
  });
}

export function getTodayHabitStr() { return todayStr(); }
