import { NextResponse } from 'next/server';

interface SyncCompletedItem {
  id: string;
  task_id: string;
  content: string;
  priority: number;
  completed_at: string;
  project_id: string | null;
}

export async function GET() {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const url = new URL('https://api.todoist.com/sync/v9/items/get_all_completed');
  url.searchParams.set('limit', '200');
  url.searchParams.set('since', sinceStr);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch completed tasks' }, { status: 500 });
  }

  const data = await res.json();
  const items: SyncCompletedItem[] = data.items ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const cutoffStr = since.toISOString().slice(0, 10);

  const byDate: Record<string, { id: string; content: string; priority: number; completedAt: string }[]> = {};

  for (const item of items) {
    const dateStr = (item.completed_at ?? '').slice(0, 10);
    if (!dateStr || dateStr < cutoffStr) continue;
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push({
      id: item.task_id ?? item.id,
      content: item.content,
      priority: item.priority,
      completedAt: item.completed_at,
    });
  }

  const dates = Object.keys(byDate)
    .filter(d => d < today)
    .sort((a, b) => b.localeCompare(a));

  return NextResponse.json({ byDate, dates });
}
