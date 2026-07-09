import { NextResponse } from 'next/server';

interface CompletedTask {
  id: string;
  content: string;
  priority: number;
  completed_at: string | null;
  project_id: string | null;
}

export async function GET() {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const url = new URL('https://api.todoist.com/api/v1/tasks/completed/by_completion_date');
  url.searchParams.set('since', since.toISOString());
  url.searchParams.set('until', until.toISOString());
  url.searchParams.set('limit', '200');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Todoist completed tasks error:', res.status, errText);
    return NextResponse.json({ error: `Failed to fetch completed tasks (${res.status})` }, { status: 500 });
  }

  const data = await res.json();
  const tasks: CompletedTask[] = data.items ?? data.results ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const cutoffStr = since.toISOString().slice(0, 10);

  const byDate: Record<string, { id: string; content: string; priority: number; completedAt: string }[]> = {};

  for (const task of tasks) {
    const dateStr = (task.completed_at ?? '').slice(0, 10);
    if (!dateStr || dateStr < cutoffStr) continue;
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push({
      id: task.id,
      content: task.content,
      priority: task.priority,
      completedAt: task.completed_at ?? '',
    });
  }

  const dates = Object.keys(byDate)
    .sort((a, b) => b.localeCompare(a));

  return NextResponse.json({ byDate, dates });
}
