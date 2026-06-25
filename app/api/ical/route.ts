import { NextResponse } from 'next/server';
import { createDAVClient } from 'tsdav';

export async function GET() {
  const username = process.env.ICLOUD_USERNAME!;
  const password = process.env.ICLOUD_APP_PASSWORD!;

  if (!username || !password) {
    return NextResponse.json({ error: 'iCloud credentials not configured' }, { status: 500 });
  }

  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    const calendars = await client.fetchCalendars();

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);

    const allEvents: { id: string; title: string; start: string; end: string; allDay: boolean; calendar: string }[] = [];

    for (const calendar of calendars) {
      const objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: start.toISOString(), end: end.toISOString() },
      });

      for (const obj of objects) {
        const events = parseICS(obj.data);
        for (const event of events) {
          allEvents.push({ ...event, calendar: (calendar.displayName as string) ?? 'Calendar' });
        }
      }
    }

    return NextResponse.json(allEvents);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch iCloud calendar' }, { status: 500 });
  }
}

function parseICS(ics: string) {
  const events: { id: string; title: string; start: string; end: string; allDay: boolean }[] = [];
  const blocks = ics.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : '';
    };

    const uid = get('UID');
    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');

    if (!dtstart) continue;

    const allDay = dtstart.length === 8;
    const parseDate = (d: string) => {
      if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      return new Date(
        d.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')
      ).toISOString();
    };

    events.push({
      id: uid || `${summary}-${dtstart}`,
      title: summary || 'Event',
      start: parseDate(dtstart),
      end: dtend ? parseDate(dtend) : parseDate(dtstart),
      allDay,
    });
  }

  return events;
}
