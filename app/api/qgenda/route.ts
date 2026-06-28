import { NextResponse } from 'next/server';
import { parseICS } from '@/lib/parseICS';

export async function GET() {
  const url = process.env.QGENDA_ICAL_URL;
  if (!url) {
    return NextResponse.json({ error: 'QGENDA_ICAL_URL not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) throw new Error(`QGenda fetch failed: ${res.status}`);
    const ics = await res.text();
    return NextResponse.json(parseICS(ics));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch QGenda calendar' }, { status: 500 });
  }
}
