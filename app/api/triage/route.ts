import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface TodoistTask {
  id: string;
  content: string;
  priority: number;
  due?: { date: string } | null;
  description?: string;
}

export async function POST() {
  const res = await fetch('https://api.todoist.com/api/v1/tasks?limit=200', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });
  const data = await res.json();
  const tasks: TodoistTask[] = data.results ?? [];

  if (tasks.length === 0) {
    return NextResponse.json({ do_now: [], schedule: [], delegate: [], drop: [] });
  }

  const today = new Date().toLocaleDateString('en-CA');
  const pLabel = (p: number) => ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

  const taskList = tasks
    .map((t, i) => `${i + 1}. [${pLabel(t.priority)}] ${t.content}${t.due?.date ? ` (due: ${t.due.date.slice(0, 10)})` : ''}`)
    .join('\n');

  const prompt = `You are a productivity coach triaging a task list using the Eisenhower matrix. Today is ${today}.

TASKS:
${taskList}

Classify each task into exactly one quadrant:
- do_now: Urgent AND important. Must act today or within the next day or two.
- schedule: Important but NOT urgent. Worth doing soon, but can be planned.
- delegate: Urgent but NOT important. Question whether this really needs your attention.
- drop: Neither urgent nor important. Eliminate or park indefinitely.

Rules:
- Tasks due today/tomorrow or with priority Urgent/High lean toward do_now or delegate.
- Tasks with no due date and Low priority lean toward schedule or drop.
- Be decisive — every task goes in exactly one bucket.
- Limit do_now to the 5 most critical items max.

Respond with ONLY valid JSON, no explanation:
{
  "do_now": [{"num": 1, "task": "task name", "reason": "brief reason"}],
  "schedule": [...],
  "delegate": [...],
  "drop": [...]
}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: 'Parse failed' }, { status: 500 });

  return NextResponse.json(JSON.parse(match[0]));
}
