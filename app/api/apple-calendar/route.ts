import { NextRequest, NextResponse } from 'next/server';
import { getAppleCalendarEvents } from '@/lib/appleCalendar';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth()), 10);

  try {
    const events = await getAppleCalendarEvents(year, month);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Apple Calendar fetch error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
