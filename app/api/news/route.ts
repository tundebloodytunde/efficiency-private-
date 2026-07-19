import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const RSS_FEEDS = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'AP News', url: 'https://feeds.apnews.com/rss/apf-topnews' },
];

function extractItems(xml: string): { title: string; description: string }[] {
  const items: { title: string; description: string }[] = [];
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks.slice(0, 8)) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
    const description = descMatch?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 200) ?? '';
    if (title && !title.toLowerCase().includes('advertisement')) {
      items.push({ title, description });
    }
  }
  return items;
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Fetch all RSS feeds in parallel, ignore individual failures
  const headlines: string[] = [];
  await Promise.allSettled(
    RSS_FEEDS.map(async ({ name, url }) => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'efficiency-app/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const items = extractItems(xml);
      for (const item of items) {
        headlines.push(`[${name}] ${item.title}${item.description ? ' — ' + item.description : ''}`);
      }
    }),
  );

  if (headlines.length === 0) {
    return NextResponse.json({ error: 'No news headlines available' }, { status: 503 });
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a concise news editor. Given a list of today's top headlines, produce a structured daily news roundup as valid JSON in this exact shape:
{
  "intro": "one sentence framing the day's biggest themes",
  "stories": [
    { "headline": "short punchy headline (max 10 words)", "brief": "1-2 sentence context explaining why it matters" }
  ]
}
Include 5-7 of the most significant stories. Return only valid JSON, no markdown fences.`,
    messages: [{
      role: 'user',
      content: `Today is ${today}.\n\nHeadlines:\n${headlines.slice(0, 24).join('\n')}`,
    }],
  });

  const text = message.content.find(b => b.type === 'text')?.text ?? '';

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse news summary' }, { status: 500 });
  }
}
