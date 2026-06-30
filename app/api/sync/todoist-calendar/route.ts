import { NextResponse } from 'next/server';
import { createICloudEvent } from '@/lib/icloudCalendar';

interface TodoistTask {
  id: string;
  content: string;
  due?: { date?: string; datetime?: string } | null;
}

export async function POST() {
  const res = await fetch('https://api.todoist.com/api/v1/tasks?limit=200', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });

  const data = await res.json();
  const tasks: TodoistTask[] = data.results ?? [];
  const withDue = tasks.filter(t => t.due?.date || t.due?.datetime);

  const results = await Promise.allSettled(
    withDue.map(t =>
      createICloudEvent(t.id, t.content, t.due!.datetime ?? t.due!.date!)
    )
  );

  const synced = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ synced, failed, total: withDue.length });
}
