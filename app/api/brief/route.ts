import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Could not load tasks' }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ brief: "You have no pending tasks. Enjoy the clear schedule — or add something new." });
  }

  const totalMinutes = tasks.reduce((sum: number, t: { estimated_minutes: number }) => sum + (t.estimated_minutes || 0), 0);
  const taskList = tasks.map((t: { title: string; category: string; priority: number; estimated_minutes: number }) =>
    `- ${t.title} (${t.category}, priority ${t.priority}, ${t.estimated_minutes} min)`
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
4. Total estimated time and a closing note.
Write in plain text, no markdown headers or bullet points. Keep it tight and actionable.`,
    messages: [
      {
        role: 'user',
        content: `Today's pending tasks (${tasks.length} total, ~${totalMinutes} min):\n${taskList}`,
      },
    ],
  });

  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === 'text');
  const brief = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  return NextResponse.json({ brief });
}
