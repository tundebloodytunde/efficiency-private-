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
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch today's tasks from Todoist
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=50', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  if (!todoistRes.ok) return NextResponse.json({ error: 'Todoist fetch failed' }, { status: 500 });

  const { results: tasks } = await todoistRes.json();
  const todayTasks = tasks.filter((t: { due?: { date: string } }) => t.due?.date?.startsWith(todayStr));

  if (todayTasks.length === 0) return NextResponse.json({ sent: 0 });

  const title = `${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`;
  const body = todayTasks.slice(0, 3).map((t: { content: string }) => `• ${t.content}`).join('\n');

  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const stale: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body })
      );
      sent++;
    } catch {
      stale.push(sub.endpoint);
    }
  }

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
  }

  return NextResponse.json({ sent });
}
