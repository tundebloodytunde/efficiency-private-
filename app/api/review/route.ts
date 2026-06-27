import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createDAVClient } from 'tsdav';

const client = new Anthropic();

function parseICS(icsText: string) {
  const events: { title: string; start: string; end: string }[] = [];
  const blocks = icsText.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const m = block.match(new RegExp(`${key}[^:]*:(.+)`));
      return m ? m[1].trim() : '';
    };
    const parseDate = (raw: string) => {
      if (!raw) return '';
      if (raw.length === 8) return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
      return raw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6');
    };
    events.push({
      title: get('SUMMARY') || 'Event',
      start: parseDate(get('DTSTART')),
      end: parseDate(get('DTEND')),
    });
  }
  return events;
}

export async function POST() {
  // Week range: Mon–Sun of the current week (ET)
  const now = new Date();
  const etStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const etNow = new Date(etStr);
  const dayOfWeek = etNow.getDay(); // 0=Sun
  const monday = new Date(etNow);
  monday.setDate(etNow.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toLocaleDateString('en-CA');
  const weekEnd = sunday.toLocaleDateString('en-CA');

  // Fetch all tasks (open + completed) for context
  const [openRes, completedRes] = await Promise.all([
    fetch('https://api.todoist.com/api/v1/tasks?limit=100', {
      headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
    }),
    fetch('https://api.todoist.com/api/v1/tasks?is_completed=true&limit=100', {
      headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
    }),
  ]);

  const openData = await openRes.json();
  const completedData = await completedRes.json();

  interface TodoistTask {
    content: string;
    priority: number;
    due?: { date: string; is_recurring?: boolean };
    completed_at?: string;
  }

  const allOpen: TodoistTask[] = openData.results ?? [];
  const allCompleted: TodoistTask[] = completedData.results ?? [];

  // Tasks due this week that are still open (missed/pending)
  const missedTasks = allOpen.filter(t => {
    const d = t.due?.date?.slice(0, 10);
    return d && d >= weekStart && d <= weekEnd;
  });

  // Tasks completed this week
  const completedThisWeek = allCompleted.filter(t => {
    const d = (t.completed_at ?? t.due?.date ?? '').slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });

  // iCloud calendar events this week
  const calEvents: { title: string; start: string }[] = [];
  try {
    const davClient = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: process.env.ICLOUD_USERNAME!,
        password: process.env.ICLOUD_APP_PASSWORD!,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    const calendars = await davClient.fetchCalendars();
    const startISO = `${weekStart}T00:00:00Z`;
    const endISO = `${weekEnd}T23:59:59Z`;

    for (const cal of calendars.slice(0, 3)) {
      const objects = await davClient.fetchCalendarObjects({
        calendar: cal,
        timeRange: { start: startISO, end: endISO },
      });
      for (const obj of objects) {
        if (obj.data) {
          const parsed = parseICS(obj.data);
          calEvents.push(...parsed.filter(e => e.start >= weekStart && e.start <= weekEnd).map(e => ({ title: e.title, start: e.start })));
        }
      }
    }
  } catch { /* calendar optional */ }

  const priorityLabel = (p: number) => ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

  const prompt = `You are a personal productivity coach reviewing someone's week. Be direct, insightful, and specific. Avoid generic advice.

WEEK: ${weekStart} to ${weekEnd}

COMPLETED TASKS (${completedThisWeek.length}):
${completedThisWeek.map(t => `• [${priorityLabel(t.priority)}] ${t.content}`).join('\n') || 'None recorded'}

STILL OPEN / MISSED TASKS (${missedTasks.length}):
${missedTasks.map(t => `• [${priorityLabel(t.priority)}] ${t.content} (due ${t.due?.date?.slice(0,10)})`).join('\n') || 'None'}

CALENDAR EVENTS THIS WEEK (${calEvents.length}):
${calEvents.slice(0, 20).map(e => `• ${e.title} (${e.start.slice(0,10)})`).join('\n') || 'No events found'}

Write a weekly review with these exact sections:

## 🏆 Wins
What went well this week. Be specific about completed tasks and what they represent.

## ⚠️ Needs Attention
Tasks that were due but remain open. Be honest about patterns you notice.

## 🔍 Patterns
2-3 observations about how this person works — what days are busy, what types of tasks get dropped, time management themes.

## 🎯 Focus for Next Week
3 specific, actionable priorities for next week based on what's open and what matters most.

Keep each section concise — 3-5 bullet points max. Be a coach, not a cheerleader.`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const review = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('');

  return NextResponse.json({
    review,
    stats: {
      completed: completedThisWeek.length,
      missed: missedTasks.length,
      events: calEvents.length,
      weekStart,
      weekEnd,
    },
  });
}
