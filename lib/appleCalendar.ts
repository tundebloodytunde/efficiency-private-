export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description?: string;
  location?: string;
}

// Unfold iCal lines (RFC 5545 line folding: CRLF + whitespace = continuation)
function unfoldLines(icalData: string): string {
  return icalData.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function extractValue(line: string): string {
  const colonIdx = line.indexOf(':');
  return colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : '';
}

// Parses DTSTART/DTEND values into ISO strings.
// Handles: YYYYMMDD (all-day), YYYYMMDDTHHmmss[Z] (timed)
function parseICalDate(raw: string): { date: string; allDay: boolean } {
  const value = raw.trim();
  if (value.length === 8) {
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      allDay: true,
    };
  }
  const y = value.slice(0, 4);
  const mo = value.slice(4, 6);
  const d = value.slice(6, 8);
  const h = value.slice(9, 11);
  const mi = value.slice(11, 13);
  const s = value.slice(13, 15);
  const utc = value.endsWith('Z') ? 'Z' : '';
  return { date: `${y}-${mo}-${d}T${h}:${mi}:${s}${utc}`, allDay: false };
}

function parseVEvents(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = unfoldLines(icalData).split(/\r\n|\n/);

  let inEvent = false;
  let uid = '';
  let title = '';
  let rawStart = '';
  let rawEnd = '';
  let description = '';
  let location = '';

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      uid = title = rawStart = rawEnd = description = location = '';
    } else if (line === 'END:VEVENT') {
      if (uid && title && rawStart) {
        const startParsed = parseICalDate(rawStart);
        const endParsed = rawEnd ? parseICalDate(rawEnd) : startParsed;
        events.push({
          id: uid,
          title,
          start: startParsed.date,
          end: endParsed.date,
          allDay: startParsed.allDay,
          ...(description ? { description } : {}),
          ...(location ? { location } : {}),
        });
      }
      inEvent = false;
    } else if (inEvent) {
      if (upper.startsWith('UID:')) {
        uid = extractValue(line);
      } else if (upper.startsWith('SUMMARY:')) {
        title = extractValue(line);
      } else if (upper.startsWith('DTSTART')) {
        rawStart = extractValue(line);
      } else if (upper.startsWith('DTEND')) {
        rawEnd = extractValue(line);
      } else if (upper.startsWith('DESCRIPTION:')) {
        description = extractValue(line).replace(/\\n/g, ' ').replace(/\\,/g, ',');
      } else if (upper.startsWith('LOCATION:')) {
        location = extractValue(line).replace(/\\,/g, ',');
      }
    }
  }

  return events;
}

function extractCalendarData(xml: string): string[] {
  const matches = xml.match(/<[^>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^>]*:?calendar-data>/g) ?? [];
  return matches.map(m =>
    m
      .replace(/<[^>]*:?calendar-data[^>]*>/, '')
      .replace(/<\/[^>]*:?calendar-data>/, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  );
}

export async function getAppleCalendarEvents(year: number, month: number): Promise<CalendarEvent[]> {
  const user = process.env.APPLE_CALDAV_USER;
  const password = process.env.APPLE_CALDAV_PASSWORD;
  const calendarUrl = process.env.APPLE_CALDAV_URL;

  if (!user || !password || !calendarUrl) return [];

  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${year}${pad(month + 1)}01T000000Z`;
  // end = first day of next month
  const endDate = new Date(year, month + 1, 1);
  const endStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}01T000000Z`;

  const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${startStr}" end="${endStr}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const response = await fetch(calendarUrl, {
    method: 'REPORT',
    headers: {
      Authorization: `Basic ${auth}`,
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
      Prefer: 'return-minimal',
    },
    body: reportBody,
  });

  if (!response.ok) {
    throw new Error(`CalDAV REPORT failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const icalBlocks = extractCalendarData(xml);
  return icalBlocks.flatMap(parseVEvents);
}
