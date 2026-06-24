'use client';

import { useEffect, useState } from 'react';

interface Task {
  id: string;
  content: string;
  priority: number;
  due?: { date: string } | null;
}

const priorityColor = (p: number) => ({
  4: 'bg-red-500',
  3: 'bg-orange-400',
  2: 'bg-yellow-400',
  1: 'bg-blue-400',
}[p] ?? 'bg-blue-400');

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<{ day: number; tasks: Task[] } | null>(null);

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
    fetch('/api/todoist')
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []));
  }, []);

  function tasksForDay(day: number): Task[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.due?.date?.startsWith(dateStr));
  }

  return (
    <>
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-5xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="px-5 py-2 border dark:border-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ← Prev
          </button>
          <span className="text-xl font-semibold min-w-[200px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="px-5 py-2 border dark:border-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-7 text-center mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-sm font-semibold text-gray-400 dark:text-gray-500 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            const valid = dayNumber >= 1 && dayNumber <= daysInMonth;
            const dayTasks = valid ? tasksForDay(dayNumber) : [];

            return (
              <div
                key={i}
                onClick={() => valid && dayTasks.length > 0 && setSelected({ day: dayNumber, tasks: dayTasks })}
                className={`rounded-xl min-h-[80px] p-2 transition-all ${
                  valid
                    ? `border border-gray-100 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${dayTasks.length > 0 ? 'cursor-pointer' : ''}`
                    : 'bg-gray-50 dark:bg-gray-900/30'
                }`}
              >
                {valid && (
                  <>
                    <span className={`text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full ml-auto ${
                      isToday(dayNumber)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {dayNumber}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={`text-white text-xs rounded px-1.5 py-0.5 truncate ${priorityColor(task.priority)}`}
                        >
                          {task.content}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 px-1">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-semibold mb-5 text-gray-900 dark:text-gray-100">
              {monthName} {selected.day}
            </h3>
            <div className="space-y-3">
              {selected.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityColor(task.priority)}`} />
                  <span className="text-gray-800 dark:text-gray-200">{task.content}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full py-3 border-2 border-gray-200 dark:border-gray-600 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
