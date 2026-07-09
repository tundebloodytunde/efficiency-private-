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

type ViewMode = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const priorityColor = (p: number) =>
  ({ 4: 'bg-red-500', 3: 'bg-orange-400', 2: 'bg-yellow-400', 1: 'bg-blue-400' }[p] ?? 'bg-blue-400');

const priorityBorder = (p: number) =>
  ({ 4: 'border-red-500', 3: 'border-orange-400', 2: 'border-yellow-400', 1: 'border-blue-400' }[p] ?? 'border-blue-400');

const eventBg = (source?: string) =>
  source === 'google'  ? 'bg-blue-600/80 border-blue-400'
  : source === 'qgenda'  ? 'bg-violet-600/80 border-violet-400'
  : source === 'holiday' ? 'bg-amber-500/80 border-amber-400'
  : 'bg-emerald-600/80 border-emerald-400';

const eventDot = (source?: string) =>
  source === 'google'  ? 'bg-blue-500'
  : source === 'qgenda'  ? 'bg-violet-500'
  : source === 'holiday' ? 'bg-amber-500'
  : 'bg-emerald-500';

// Compact chip color used in month grid and all-day row
const chipBg = (source?: string) =>
  source === 'google'  ? 'bg-blue-600 text-white'
  : source === 'qgenda'  ? 'bg-violet-600 text-white'
  : source === 'holiday' ? 'bg-amber-100 dark:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40'
  : 'bg-emerald-600 text-white';

function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function eventTop(start: string) {
  const d = new Date(start);
  return (d.getHours() + d.getMinutes() / 60) * 56; // 56px per hour
}

function eventHeight(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const dur = Math.max((e.getTime() - s.getTime()) / 3600000, 0.25);
  return dur * 56;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekStart(d: Date) {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<{ day: Date; tasks: Task[]; events: CalEvent[] } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();

  function loadCalendarData() {
    setRefreshing(true);
    const done = () => setRefreshing(false);
    let pending = 4;
    const dec = () => { if (--pending === 0) done(); };

    fetch('/api/todoist?limit=200').then(r => r.json()).then(d => { setTasks(Array.isArray(d) ? d : []); dec(); }).catch(dec);
    fetch('/api/ical').then(r => r.json()).then(d => {
      setEvents(prev => [
        ...prev.filter(e => e.source !== 'icloud'),
        ...(Array.isArray(d) ? d.map((e: CalEvent) => ({ ...e, source: 'icloud' })) : []),
      ]); dec();
    }).catch(dec);
    fetch('/api/qgenda').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setEvents(prev => [
        ...prev.filter(e => e.source !== 'qgenda'),
        ...d.map((e: CalEvent) => ({ ...e, source: 'qgenda' })),
      ]); dec();
    }).catch(dec);
    fetch('/api/holidays').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setEvents(prev => [
        ...prev.filter(e => e.source !== 'holiday'),
        ...d,
      ]); dec();
    }).catch(dec);

    // Auto-sync Todoist tasks to iCloud Calendar, throttled to once per 5 min
    const SYNC_KEY = 'lastTodoistCalSync';
    const lastSync = parseInt(localStorage.getItem(SYNC_KEY) ?? '0');
    if (Date.now() - lastSync > 5 * 60 * 1000) {
      localStorage.setItem(SYNC_KEY, String(Date.now()));
      fetch('/api/sync/todoist-calendar', { method: 'POST' }).catch(() => {});
    }
  }

  useEffect(() => {
    loadCalendarData();
    const poll = setInterval(loadCalendarData, 10 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const s = session as { accessToken?: string; error?: string } | null;
    if (s?.error === 'RefreshTokenError') {
      setEvents(prev => prev.filter(e => e.source !== 'google'));
      return;
    }
    const accessToken = s?.accessToken;
    if (!accessToken) return;
    fetch('/api/gcal', { headers: { 'x-access-token': accessToken } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        const gcalEvents: CalEvent[] = d.map((e: { id: string; summary?: string; start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string } }) => ({
          id: e.id, title: e.summary ?? 'Event',
          start: e.start.dateTime ?? e.start.date ?? '',
          end: e.end.dateTime ?? e.end.date ?? '',
          allDay: !e.start.dateTime, source: 'google',
        }));
        setEvents(prev => [...prev.filter(e => e.source !== 'google'), ...gcalEvents]);
      });
  }, [session]);

  function tasksForDate(d: Date) {
    const str = d.toLocaleDateString('en-CA');
    return tasks.filter(t => t.due?.date?.startsWith(str));
  }

  function eventsForDate(d: Date) {
    const dateStr = d.toLocaleDateString('en-CA');
    return events.filter(e => {
      if (e.allDay) return e.start.slice(0, 10) === dateStr;
      return isSameDay(new Date(e.start), d);
    });
  }

  function openDay(d: Date) {
    setSelected({ day: d, tasks: tasksForDate(d), events: eventsForDate(d) });
  }

  function formatTime(e: CalEvent) {
    if (e.allDay) return 'All day';
    return new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Navigation
  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function goToday() { setCurrentDate(new Date()); }

  async function syncToCalendar() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync/todoist-calendar', { method: 'POST' });
      const d = await res.json();
      if (d.error) { setSyncMsg('Sync failed — check iCloud credentials'); return; }
      setSyncMsg(`Synced ${d.synced} task${d.synced !== 1 ? 's' : ''} to iCloud`);
    } catch {
      setSyncMsg('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  }

  function navLabel() {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'day') return currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const ws = getWeekStart(currentDate);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return `${ws.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  // ── Month View ──────────────────────────────────────────────────────────────
  function MonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

    return (
      <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/10">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-3 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - firstDow + 1;
            const valid = dayNum >= 1 && dayNum <= daysInMonth;
            const date = valid ? new Date(year, month, dayNum) : null;
            const dayTasks = date ? tasksForDate(date) : [];
            const dayEvents = date ? eventsForDate(date) : [];
            const isToday = date ? isSameDay(date, today) : false;
            const hasItems = dayTasks.length > 0 || dayEvents.length > 0;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={i}
                onClick={() => { if (!date) return; if (hasItems) openDay(date); else { setView('day'); setCurrentDate(date); } }}
                className={`min-h-[100px] p-1.5 border-b border-r border-white/5 transition-all group
                  ${!valid ? 'bg-transparent' : isWeekend ? 'bg-white/[0.02]' : ''}
                  ${valid ? 'hover:bg-white/5 cursor-pointer' : ''}
                  ${i % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                {valid && (
                  <>
                    <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ml-auto
                      ${isToday ? 'bg-violet-500 text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                      {dayNum}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={`text-xs rounded px-1.5 py-0.5 truncate font-medium ${chipBg(e.source)}`}>
                          {!e.allDay && <span className="opacity-70 mr-1">{formatTime(e)}</span>}
                          {e.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2 - Math.min(dayEvents.length, 2)).map(t => (
                        <div key={t.id} className={`text-white text-xs rounded px-1.5 py-0.5 truncate font-medium ${priorityColor(t.priority)}`}>
                          {t.content}
                        </div>
                      ))}
                      {(dayTasks.length + dayEvents.length) > 2 && (
                        <div className="text-xs text-gray-500 px-1">+{dayTasks.length + dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Time Grid (shared by Day + Week) ─────────────────────────────────────
  function TimeGrid({ days }: { days: Date[] }) {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const nowTop = (nowMinutes / 60) * 56;

    return (
      <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className={`grid border-b border-white/10`} style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={i} className="text-center py-3 border-l border-white/5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{DAY_NAMES[d.getDay()]}</div>
                <div className={`text-xl font-black mt-0.5 mx-auto w-9 h-9 text-gray-900 dark:text-white flex items-center justify-center rounded-full
                  ${isToday ? 'bg-violet-500 text-white' : 'text-white'}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row — holidays always trigger this */}
        {days.some(d => eventsForDate(d).some(e => e.allDay)) && (
          <div className={`grid border-b border-white/10 min-h-[32px]`} style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            <div className="text-xs text-gray-400 dark:text-gray-600 flex items-center justify-end pr-2 py-1">all-day</div>
            {days.map((d, i) => (
              <div key={i} className="border-l border-white/5 px-1 py-1 space-y-0.5">
                {eventsForDate(d).filter(e => e.allDay).map(e => (
                  <div key={e.id} className={`text-xs px-2 py-0.5 rounded font-medium truncate ${chipBg(e.source)}`}>
                    {e.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable time grid */}
        <div className="overflow-y-auto max-h-[600px]" style={{ scrollbarWidth: 'thin' }}>
          {/* Grid: time label col + day cols */}
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, height: `${24 * 56}px` }}>
            {/* Time labels column */}
            <div className="relative">
              {HOURS.map(h => (
                <div key={h} className="absolute w-full text-right pr-2 text-xs text-gray-400 dark:text-gray-600" style={{ top: `${h * 56 - 9}px` }}>
                  {h > 0 ? formatHour(h) : ''}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((d, colIdx) => {
              const colEvents = eventsForDate(d).filter(e => !e.allDay);
              const colTasks = tasksForDate(d).filter(t => t.due?.date && t.due.date.length > 10);
              const isCol = days.some(day => isSameDay(day, today)) && isSameDay(d, today);

              return (
                <div key={colIdx} className="relative border-l border-gray-100 dark:border-white/5">
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-gray-100 dark:border-white/5" style={{ top: `${h * 56}px` }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map(h => (
                    <div key={`hh${h}`} className="absolute left-0 right-0 border-t border-gray-50 dark:border-white/[0.02]" style={{ top: `${h * 56 + 28}px` }} />
                  ))}

                  {/* Current time line */}
                  {isCol && (
                    <div className="absolute left-0 right-0 flex items-center z-20" style={{ top: `${nowTop}px` }}>
                      <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <div className="flex-1 border-t border-red-400/70" />
                    </div>
                  )}

                  {/* Calendar events */}
                  {colEvents.map(e => (
                    <div
                      key={e.id}
                      className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-white border-l-2 overflow-hidden cursor-pointer hover:brightness-110 transition z-10 ${eventBg(e.source)}`}
                      style={{ top: `${eventTop(e.start)}px`, height: `${Math.max(eventHeight(e.start, e.end), 22)}px` }}
                      onClick={ev => { ev.stopPropagation(); openDay(d); }}
                    >
                      <div className="truncate">{e.title}</div>
                      <div className="text-white/70 text-[10px]">{formatTime(e)}</div>
                    </div>
                  ))}

                  {/* Timed tasks */}
                  {colTasks.map(t => {
                    const due = new Date(t.due!.date);
                    const top = (due.getHours() + due.getMinutes() / 60) * 56;
                    return (
                      <div
                        key={t.id}
                        className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-white border-l-2 overflow-hidden cursor-pointer hover:brightness-110 transition z-10 ${priorityColor(t.priority)} ${priorityBorder(t.priority)}`}
                        style={{ top: `${top}px`, height: '28px' }}
                        onClick={ev => { ev.stopPropagation(); openDay(d); }}
                      >
                        <div className="truncate">{t.content}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function WeekView() {
    const ws = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });
    return <TimeGrid days={days} />;
  }

  function DayView() {
    return (
      <div>
        {/* Date tasks summary */}
        {tasksForDate(currentDate).length > 0 && (
          <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Tasks today</p>
            <div className="space-y-1.5">
              {tasksForDate(currentDate).filter(t => !t.due?.date || t.due.date.length === 10).map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColor(t.priority)}`} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{t.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <TimeGrid days={[currentDate]} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-5">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Calendar
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCalendarData}
              disabled={refreshing}
              title="Refresh calendar data"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all disabled:opacity-40"
            >
              <span className={`text-xl leading-none select-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
            <button
              onClick={syncToCalendar}
              disabled={syncing}
              className="text-sm px-4 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60 rounded-xl transition disabled:opacity-50"
              title="Sync Todoist tasks with due dates to iCloud Calendar"
            >
              {syncing ? 'Syncing...' : '⟳ Sync Tasks'}
            </button>
            {session ? (
              (session as { error?: string }).error === 'RefreshTokenError' ? (
                <button onClick={() => signIn('google')} className="text-sm bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition shadow-lg shadow-red-500/25">
                  Reconnect Google
                </button>
              ) : (
                <button onClick={() => signOut()} className="text-sm px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl transition">
                  Disconnect Google
                </button>
              )
            ) : (
              <button onClick={() => signIn('google')} className="text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-xl hover:opacity-90 transition shadow-lg shadow-blue-500/25">
                + Google Calendar
              </button>
            )}
          </div>
        </div>
        {syncMsg && (
          <div className="mb-4 text-sm text-center py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {syncMsg}
          </div>
        )}

        {/* View toggle + nav */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View switcher */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition
                  ${view === v ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Today button */}
          <button onClick={goToday} className="px-4 py-2 text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition font-semibold">
            Today
          </button>

          {/* Prev / next */}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition">
              ‹
            </button>
            <span className="text-base font-bold text-gray-900 dark:text-white min-w-[200px] text-center">{navLabel()}</span>
            <button onClick={() => navigate(1)} className="w-9 h-9 flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition">
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 px-1 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> iCloud</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Google</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> QGenda</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Urgent</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> High</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Medium</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Task</span>
      </div>

      {/* Day detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
              {DAY_NAMES_FULL[selected.day.getDay()]}
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              {selected.day.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {selected.events.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Calendar</p>
                <div className="space-y-2">
                  {selected.events.map(e => (
                    <div key={e.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${eventDot(e.source)}`} />
                      <span className="text-gray-800 dark:text-gray-200">{e.title}</span>
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
                  {selected.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColor(t.priority)}`} />
                      <span className="text-gray-800 dark:text-gray-200">{t.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setView('day'); setCurrentDate(selected.day); setSelected(null); }}
                className="flex-1 py-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl text-sm font-semibold text-violet-300 hover:bg-violet-600/30 transition"
              >
                Open day view
              </button>
              <button onClick={() => setSelected(null)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
