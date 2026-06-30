import { createDAVClient } from 'tsdav';

function escapeICS(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function dateToICS(dateStr: string): { dtstart: string; dtend: string; allDay: boolean } {
  if (dateStr.length === 10) {
    // Date only: YYYY-MM-DD → all-day event
    const compact = dateStr.replace(/-/g, '');
    const nextDay = new Date(dateStr + 'T00:00:00Z');
    nextDay.setDate(nextDay.getDate() + 1);
    const nextCompact = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    return { dtstart: `DTSTART;VALUE=DATE:${compact}`, dtend: `DTEND;VALUE=DATE:${nextCompact}`, allDay: true };
  }
  // DateTime: create 1-hour timed event
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '');
  return { dtstart: `DTSTART:${fmt(start)}`, dtend: `DTEND:${fmt(end)}`, allDay: false };
}

export async function createICloudEvent(taskId: string, content: string, dueDate: string) {
  const username = process.env.ICLOUD_USERNAME;
  const password = process.env.ICLOUD_APP_PASSWORD;
  if (!username || !password) return;

  const client = await createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const calendars = await client.fetchCalendars();
  if (!calendars.length) return;

  // Prefer a calendar named "Tasks", "Reminders", or fall back to first
  const cal =
    calendars.find(c => /tasks?|reminders?/i.test(c.displayName as string ?? '')) ??
    calendars[0];

  const uid = `todoist-${taskId}@efficiency`;
  const { dtstart, dtend } = dateToICS(dueDate);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace('.000', '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Efficiency//Task Sync//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${escapeICS(content)}`,
    dtstart,
    dtend,
    `DTSTAMP:${now}`,
    `CREATED:${now}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  await client.createCalendarObject({ calendar: cal, filename: `${uid}.ics`, iCalString: ics });
}
