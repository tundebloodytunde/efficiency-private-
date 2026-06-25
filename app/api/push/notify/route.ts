import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch tasks with specific due times from Todoist
  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=50', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  if (!todoistRes.ok) return NextResponse.json({ error: 'Todoist fetch failed' }, { status: 500 });

  const { results: tasks } = await todoistRes.json();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000); // next 15 minutes

  const dueSoon = tasks.filter((t: { due?: { date: string } }) => {
    if (!t.due?.date || t.due.date.length === 10) return false; // skip date-only tasks
    const dueDate = new Date(t.due.date);
    return dueDate >= now && dueDate <= windowEnd;
  });

  if (dueSoon.length === 0) return NextResponse.json({ sent: 0 });

  // Fetch all push subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const stale: string[] = [];

  for (const task of dueSoon) {
    const dueDate = new Date(task.due.date);
    const minutesAway = Math.round((dueDate.getTime() - now.getTime()) / 60000);
    const body = minutesAway <= 1 ? 'Due now' : `Due in ${minutesAway} minutes`;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: task.content, body })
        );
        sent++;
      } catch {
        stale.push(sub.endpoint);
      }
    }
  }

  // Remove expired subscriptions
  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
  }

  return NextResponse.json({ sent });
}
