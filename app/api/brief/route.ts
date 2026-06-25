import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createDAVClient } from 'tsdav';

function parseICSForToday(ics: string, todayStr: string) {
  const events: { title: string; time: string }[] = [];
  const blocks = ics.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : '';
    };
    const dtstart = get('DTSTART');
    if (!dtstart.startsWith(todayStr.replace(/-/g, ''))) continue;
    const summary = get('SUMMARY') || 'Event';
    const allDay = dtstart.length === 8;
    let time = 'All day';
    if (!allDay) {
      const d = new Date(dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z'));
      time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    events.push({ title: summary, time });
  }
  return events;
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD in ET

  // Fetch Todoist tasks due today
  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=50', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  const { results: allTasks } = todoistRes.ok ? await todoistRes.json() : { results: [] };
  const tasks = (allTasks ?? []).filter((t: { due?: { date: string } }) => t.due?.date?.startsWith(todayStr));

  // Fetch iCloud calendar events for today
  let calendarEvents: { title: string; time: string }[] = [];
  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: process.env.ICLOUD_USERNAME!, password: process.env.ICLOUD_APP_PASSWORD! },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    const calendars = await client.fetchCalendars();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    for (const calendar of calendars) {
      const objects = await client.fetchCalendarObjects({ calendar, timeRange: { start, end } });
      for (const obj of objects) {
        calendarEvents = calendarEvents.concat(parseICSForToday(obj.data, todayStr));
      }
    }
  } catch {
    // Calendar unavailable — proceed with tasks only
  }

  const priorityLabel = (p: number) => ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

  const taskLines = tasks.length > 0
    ? tasks.map((t: { content: string; priority: number }) => `- [TASK] ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '- No tasks due today';

  const eventLines = calendarEvents.length > 0
    ? calendarEvents.map(e => `- [CALENDAR] ${e.title} at ${e.time}`).join('\n')
    : '- No calendar events today';

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    system: `You are a concise personal productivity assistant. Generate a practical daily briefing in 3-4 short paragraphs based on the user's full schedule for today — both calendar events and tasks. Cover:
1. A one-sentence opener that frames the day based on what's ahead.
2. Key calendar commitments and when they occur.
3. Top tasks to tackle and when to fit them in around the schedule.
4. A closing note on realistic workload.
Write in plain prose, no markdown headers or bullet points. Be specific about times and task names.`,
    messages: [
      {
        role: 'user',
        content: `Today is ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.\n\nSchedule:\n${eventLines}\n\nTasks due today:\n${taskLines}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === 'text');
  const brief = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  return NextResponse.json({ brief });
}
