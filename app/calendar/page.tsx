'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface Task {
  id: string;
  content: string;
  priority: number;
  due?: { date: string } | null;
}

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendar?: string;
  source?: string;
}

const taskPriorityColor = (p: number) => ({
  4: 'bg-red-500',
  3: 'bg-orange-400',
  2: 'bg-yellow-400',
  1: 'bg-blue-400',
}[p] ?? 'bg-blue-400');

export default function CalendarPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<{ day: number; tasks: Task[]; events: CalEvent[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  useEffect(() => {
    fetch('/api/todoist').then(r => r.json()).then(data => setTasks(Array.isArray(data) ? data : []));
    fetch('/api/ical').then(r => r.json()).then(data =>
      setEvents(prev => [
        ...prev.filter(e => e.source !== 'icloud'),
        ...(Array.isArray(data) ? data.map((e: CalEvent) => ({ ...e, source: 'icloud' })) : []),
      ])
    );
  }, []);

  useEffect(() => {
    const accessToken = (session as { accessToken?: string } | null)?.accessToken;
    if (!accessToken) return;
    fetch('/api/gcal', { headers: { 'x-access-token': accessToken } })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const gcalEvents: CalEvent[] = data.map((e: { id: string; summary?: string; start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string } }) => ({
          id: e.id, title: e.summary ?? 'Event',
          start: e.start.dateTime ?? e.start.date ?? '',
          end: e.end.dateTime ?? e.end.date ?? '',
          allDay: !e.start.dateTime, source: 'google',
        }));
        setEvents(prev => [...prev.filter(e => e.source !== 'google'), ...gcalEvents]);
      });
  }, [session]);

  function dateStrForDay(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function tasksForDay(day: number) {
    return tasks.filter(t => t.due?.date?.startsWith(dateStrForDay(day)));
  }

  function eventsForDay(day: number) {
    return events.filter(e => e.start.startsWith(dateStrForDay(day)));
  }

  function formatTime(e: CalEvent) {
    if (e.allDay) return 'All day';
    return new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Calendar
          </h1>
          {session ? (
            <button onClick={() => signOut()} className="text-sm px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl transition">
              Disconnect Google
            </button>
          ) : (
            <button onClick={() => signIn('google')} className="text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-500/25">
              + Google Calendar
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 rounded-xl transition">
            ← Prev
          </button>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{monthName} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 rounded-xl transition">
            Next →
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/10 rounded-3xl p-4 transition-colors duration-200">
        <div className="grid grid-cols-7 text-center mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs font-semibold text-gray-500 py-2 uppercase tracking-wide">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            const valid = dayNumber >= 1 && dayNumber <= daysInMonth;
            const dayTasks = valid ? tasksForDay(dayNumber) : [];
            const dayEvents = valid ? eventsForDay(dayNumber) : [];
            const hasItems = dayTasks.length > 0 || dayEvents.length > 0;

            return (
              <div
                key={i}
                onClick={() => valid && hasItems && setSelected({ day: dayNumber, tasks: dayTasks, events: dayEvents })}
                className={`rounded-xl min-h-[72px] p-1.5 transition-all ${
                  valid
                    ? `border hover:border-violet-500/40 hover:bg-violet-500/5 ${hasItems ? 'cursor-pointer' : ''} ${isToday(dayNumber) ? 'border-violet-500/40 bg-violet-500/10' : 'border-gray-100 dark:border-white/5'}`
                    : 'opacity-0'
                }`}
              >
                {valid && (
                  <>
                    <span className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full ml-auto ${
                      isToday(dayNumber) ? 'bg-violet-500 text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {dayNumber}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={`text-white text-xs rounded-md px-1.5 py-0.5 truncate ${e.source === 'google' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map(task => (
                        <div key={task.id} className={`text-white text-xs rounded-md px-1.5 py-0.5 truncate ${taskPriorityColor(task.priority)}`}>
                          {task.content}
                        </div>
                      ))}
                      {(dayTasks.length + dayEvents.length) > 4 && (
                        <div className="text-xs text-gray-500 px-1">+{dayTasks.length + dayEvents.length - 4} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 px-1 text-xs text-gray-500 dark:text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> iCloud</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Google</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Urgent</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> High</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Medium</span>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="bg-white border border-gray-200 dark:bg-gray-900 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl transition-colors duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-5 text-gray-900 dark:text-white">{monthName} {selected.day}</h3>
            {selected.events.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Calendar</p>
                <div className="space-y-2">
                  {selected.events.map(e => (
                    <div key={e.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${e.source === 'google' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      <span className="text-gray-700 dark:text-gray-200">{e.title}</span>
                      <span className="text-xs text-gray-500 ml-auto">{formatTime(e)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.tasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tasks</p>
                <div className="space-y-2">
                  {selected.tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${taskPriorityColor(task.priority)}`} />
                      <span className="text-gray-700 dark:text-gray-200">{task.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-6 w-full py-3 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white dark:hover:border-white/20 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
