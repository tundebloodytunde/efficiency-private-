import { NextRequest, NextResponse } from 'next/server';
import { createICloudEvent } from '@/lib/icloudCalendar';

const BASE = 'https://api.todoist.com/api/v1';

function headers() {
  return {
    Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function GET() {
  const res = await fetch(`${BASE}/tasks?limit=50`, { headers: headers() });
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  const data = await res.json();
  return NextResponse.json(data.results ?? []);
}

export async function POST(req: NextRequest) {
  const { action, taskId, content, priority, due_string } = await req.json();

  if (action === 'complete') {
    const res = await fetch(`${BASE}/tasks/${taskId}/close`, {
      method: 'POST',
      headers: headers(),
    });
    return NextResponse.json({ ok: res.ok });
  }

  if (action === 'create') {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        content,
        priority: priority ?? 1,
        ...(due_string ? { due_string } : {}),
      }),
    });
    const data = await res.json();

    // Auto-sync to iCloud Calendar when task has a due date
    const dueDate: string | undefined = data.due?.datetime ?? data.due?.date;
    if (dueDate) {
      createICloudEvent(data.id, content, dueDate).catch(() => {});
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
