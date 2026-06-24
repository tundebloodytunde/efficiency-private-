import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const todoistRes = await fetch('https://api.todoist.com/api/v1/tasks?limit=50', {
    headers: { Authorization: `Bearer ${process.env.TODOIST_API_TOKEN}` },
  });

  if (!todoistRes.ok) {
    return NextResponse.json({ error: 'Could not load tasks from Todoist' }, { status: 500 });
  }

  const { results: tasks } = await todoistRes.json();

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ brief: "You have no pending tasks. Enjoy the clear schedule — or add something new." });
  }

  const priorityLabel = (p: number) => ({ 4: 'Urgent', 3: 'High', 2: 'Medium', 1: 'Low' }[p] ?? 'Low');

  const taskList = tasks.map((t: { content: string; priority: number; due?: { string: string } }) =>
    `- ${t.content} (${priorityLabel(t.priority)}${t.due ? `, due ${t.due.string}` : ''})`
  ).join('\n');

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: `You are a concise productivity assistant. Generate a brief, practical daily briefing in 3-4 short paragraphs:
1. A one-sentence energy-setting opener for the day.
2. Top 1-2 tasks to tackle first, and why.
3. Any tasks to defer or batch.
4. A closing note on workload.
Write in plain text, no markdown headers or bullet points. Keep it tight and actionable.`,
    messages: [
      {
        role: 'user',
        content: `Today's pending tasks (${tasks.length} total):\n${taskList}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === 'text');
  const brief = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  return NextResponse.json({ brief });
}
