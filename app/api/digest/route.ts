import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const RECIPIENT = 'baoriowo@icloud.com';

type Task = { content: string; priority: number; due?: { date: string } };

const priorityLabel = (p: number) =>
  ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

const priorityColor = (p: number) =>
  ({ 4: '#ef4444', 3: '#f97316', 2: '#eab308', 1: '#6b7280' }[p] ?? '#6b7280');

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

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  });

  // Fetch tasks due today
  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=50', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  const { results: allTasks } = todoistRes.ok ? await todoistRes.json() : { results: [] };
  const tasks: Task[] = (allTasks ?? []).filter(
    (t: Task) => t.due?.date?.startsWith(todayStr),
  );

  // Generate brief via Claude
  const taskLines = tasks.length > 0
    ? tasks.map(t => `- ${t.content} (${priorityLabel(t.priority)})`).join('\n')
    : '- No tasks due today';

  const anthropic = new Anthropic();
  let briefText = '';
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      system: 'You are a concise personal productivity assistant. Write a 2-3 sentence daily briefing based on the tasks listed. Be specific about task names and priorities. No markdown.',
      messages: [{
        role: 'user',
        content: `Today is ${dateLabel}.\n\nTasks due today:\n${taskLines}`,
      }],
    });
    const block = message.content.find(b => b.type === 'text');
    briefText = block?.type === 'text' ? block.text : '';
  } catch {
    // Proceed without brief if Claude is unavailable
  }

  // Build email HTML
  const taskRows = tasks.length > 0
    ? tasks.map(t => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827">${t.content}</td>
          <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f3f4f6;font-size:11px;font-weight:700;color:${priorityColor(t.priority)};white-space:nowrap;text-transform:uppercase;letter-spacing:.05em">${priorityLabel(t.priority)}</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:12px 0;color:#9ca3af;font-size:14px">No tasks due today — enjoy the clear day.</td></tr>`;

  const briefSection = briefText ? `
    <div style="background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:32px">
      <p style="margin:0;font-size:14px;line-height:1.75;color:#4c1d95">${briefText}</p>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif">
  <div style="max-width:580px;margin:40px auto;padding:0 16px">
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);padding:36px 36px 28px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.08em">✨ Daily Brief</p>
        <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.2">${dateLabel}</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px 36px">
        ${briefSection}

        <h2 style="margin:0 0 14px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Tasks Due Today</h2>
        <table style="width:100%;border-collapse:collapse">
          ${taskRows}
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:18px 36px;background:#f9fafb;border-top:1px solid #f3f4f6">
        <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">Sent by Efficiency · Good luck today.</p>
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
      subject: `Your Daily Brief — ${dateLabel}`,
      html,
    });
    return NextResponse.json({ ok: true, tasks: tasks.length, hasBrief: !!briefText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to send email: ${msg}` }, { status: 500 });
  }
}
