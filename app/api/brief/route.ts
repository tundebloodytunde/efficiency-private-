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
      const iso = dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
      let d: Date;
      if (dtstart.endsWith('Z')) {
        d = new Date(iso);
      } else {
        // Floating / TZID — treat as America/New_York local time
        const utcProxy = new Date(iso + 'Z');
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
        const p = Object.fromEntries(fmt.formatToParts(utcProxy).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
        const etRepr = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
        const offsetMs = utcProxy.getTime() - new Date(etRepr + 'Z').getTime();
        d = new Date(new Date(iso + 'Z').getTime() - offsetMs);
      }
      time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
    }
    events.push({ title: summary, time });
  }
  return events;
}

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD in ET

  // Fetch Todoist tasks due today (with a hard timeout)
  let tasks: { content: string; priority: number }[] = [];
  try {
    const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=200', {
      headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = todoistRes.ok ? await todoistRes.json() : {};
    const allTasks: { content: string; priority: number; due?: { date: string } }[] = data.results ?? [];
    tasks = allTasks.filter(t => t.due?.date?.startsWith(todayStr));
  } catch {
    // Todoist unavailable — proceed with calendar only
  }

  // Fetch iCloud calendar events for today (capped at 12 s to avoid function timeout)
  let calendarEvents: { title: string; time: string }[] = [];
  try {
    const calPromise = (async () => {
      const client = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: { username: process.env.ICLOUD_USERNAME!, password: process.env.ICLOUD_APP_PASSWORD! },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });
      const calendars = await client.fetchCalendars();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const result: { title: string; time: string }[] = [];
      for (const calendar of calendars) {
        const objects = await client.fetchCalendarObjects({ calendar, timeRange: { start, end } });
        for (const obj of objects) result.push(...parseICSForToday(obj.data, todayStr));
      }
      return result;
    })();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000));
    calendarEvents = await Promise.race([calPromise, timeout]);
  } catch {
    // Calendar unavailable or timed out — proceed with tasks only
  }

  const priorityLabel = (p: number) => ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

  const taskLines = tasks.length > 0
    ? tasks.map((t: { content: string; priority: number }) => `- [TASK] ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '- No tasks due today';

  const eventLines = calendarEvents.length > 0
    ? calendarEvents.map(e => `- [CALENDAR] ${e.title} at ${e.time}`).join('\n')
    : '- No calendar events today';

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
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

    const textBlock = message.content.find((b) => b.type === 'text');
    const brief = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    return NextResponse.json({ brief });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate brief: ${msg}` }, { status: 500 });
  }
}
