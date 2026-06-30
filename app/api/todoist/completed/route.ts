import { NextResponse } from 'next/server';

interface TodoistTask {
  id: string;
  content: string;
  priority: number;
  completed_at: string | null;
  due: { date: string } | null;
  project_id: string | null;
}

export async function GET() {
  const res = await fetch(
    'https://api.todoist.com/api/v1/tasks?is_completed=true&limit=200',
    { headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch completed tasks' }, { status: 500 });
  }

  const data = await res.json();
  const tasks: TodoistTask[] = data.results ?? [];

  // Group by completion date (YYYY-MM-DD), keep last 14 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

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

  // Sort dates descending, skip today
  const today = new Date().toISOString().slice(0, 10);
  const dates = Object.keys(byDate)
    .filter(d => d < today)
    .sort((a, b) => b.localeCompare(a));

  return NextResponse.json({ byDate, dates });
}
