import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const RECIPIENT = 'baoriowo@icloud.com';

type Task = { content: string; priority: number; due?: { date: string; string?: string } };

const priorityLabel = (p: number) =>
  ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

const priorityColor = (p: number) =>
  ({ 4: '#ef4444', 3: '#f97316', 2: '#eab308', 1: '#6b7280' }[p] ?? '#6b7280');

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missing = ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'TODOIST_API_TOKEN'].filter(
    k => !process.env[k],
  );
  if (missing.length) {
    return NextResponse.json({ error: `Missing env vars: ${missing.join(', ')}` }, { status: 500 });
  }

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const weekEnd = addDays(todayStr, 7);
  const weekLabel = now.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  });

  // Fetch all open tasks
  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=200', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  const { results: allTasks } = todoistRes.ok ? await todoistRes.json() : { results: [] };
  const all: Task[] = allTasks ?? [];

  const overdue = all.filter(t => t.due?.date && t.due.date < todayStr);
  const upcoming = all.filter(t => t.due?.date && t.due.date >= todayStr && t.due.date <= weekEnd);
  const undated = all.filter(t => !t.due?.date);

  // Generate weekly summary via Claude
  const overdueLines = overdue.length
    ? overdue.map(t => `- [OVERDUE] ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '';
  const upcomingLines = upcoming.length
    ? upcoming.map(t => `- [${t.due!.date}] ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '- No tasks scheduled this week';
  const undatedLines = undated.length
    ? undated.slice(0, 10).map(t => `- ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '';

  const taskContext = [
    overdueLines && `OVERDUE:\n${overdueLines}`,
    `THIS WEEK:\n${upcomingLines}`,
    undatedLines && `INBOX (no date):\n${undatedLines}`,
  ].filter(Boolean).join('\n\n');

  const anthropic = new Anthropic();
  let summaryText = '';
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      system: `You are a concise personal productivity coach. Given someone's task list, write a 3-4 sentence weekly review: acknowledge any overdue items directly, highlight the 2-3 most important things to accomplish this week by name, and end with one motivating sentence. Be specific about task names. No markdown or bullet points.`,
      messages: [{
        role: 'user',
        content: `Week of ${weekLabel}.\n\n${taskContext}`,
      }],
    });
    const block = message.content.find(b => b.type === 'text');
    summaryText = block?.type === 'text' ? block.text : '';
  } catch {
    // Proceed without summary
  }

  // Build email sections
  const summarySection = summaryText ? `
    <div style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px">
      <p style="margin:0;font-size:14px;line-height:1.75;color:#14532d">${summaryText}</p>
    </div>` : '';

  const overdueSection = overdue.length ? `
    <h2 style="margin:0 0 10px;font-size:12px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.08em">🚨 Overdue (${overdue.length})</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${overdue.map(t => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #fee2e2;font-size:14px;color:#111827">${t.content}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #fee2e2;font-size:11px;font-weight:700;color:${priorityColor(t.priority)};white-space:nowrap;text-transform:uppercase;letter-spacing:.05em">${priorityLabel(t.priority)}</td>
        </tr>`).join('')}
    </table>` : '';

  const upcomingRows = upcoming.length
    ? upcoming.map(t => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">${t.content}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#6b7280;white-space:nowrap">${t.due?.string ?? t.due?.date ?? ''}</td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f3f4f6;font-size:11px;font-weight:700;color:${priorityColor(t.priority)};white-space:nowrap;text-transform:uppercase;letter-spacing:.05em">${priorityLabel(t.priority)}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:10px 0;color:#9ca3af;font-size:14px">Nothing scheduled — add some tasks for a productive week.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif">
  <div style="max-width:580px;margin:40px auto;padding:0 16px">
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#059669 0%,#0891b2 100%);padding:36px 36px 28px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.08em">📋 Weekly Review</p>
        <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.2">Week of ${weekLabel}</h1>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.75)">${overdue.length} overdue · ${upcoming.length} this week · ${undated.length} in inbox</p>
      </div>

      <!-- Body -->
      <div style="padding:32px 36px">
        ${summarySection}
        ${overdueSection}

        <h2 style="margin:0 0 10px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">This Week</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          ${upcomingRows}
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:18px 36px;background:#f9fafb;border-top:1px solid #f3f4f6">
        <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">Sent by Efficiency · Have a great week.</p>
      </div>

    </div>
  </div>
</body>
</html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: 'Efficiency <onboarding@resend.dev>',
      to: RECIPIENT,
      subject: `Weekly Review — ${weekLabel}`,
      html,
    });
    return NextResponse.json({ ok: true, overdue: overdue.length, upcoming: upcoming.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to send email: ${msg}` }, { status: 500 });
  }
}
