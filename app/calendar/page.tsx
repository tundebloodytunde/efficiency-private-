'use client';

import { useState } from 'react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <>
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-5xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="px-5 py-2 border rounded-xl hover:bg-gray-100 transition"
          >
            ← Prev
          </button>
          <span className="text-xl font-semibold min-w-[200px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="px-5 py-2 border rounded-xl hover:bg-gray-100 transition"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-7 text-center mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-sm font-semibold text-gray-400 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            const valid = dayNumber >= 1 && dayNumber <= daysInMonth;

            return (
              <div
                key={i}
                className={`rounded-xl min-h-[80px] p-2 transition-all ${
                  valid
                    ? 'border border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    : 'bg-gray-50'
                }`}
              >
                {valid && (
                  <span className={`text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full ml-auto ${
                    isToday(dayNumber)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500'
                  }`}>
                    {dayNumber}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
