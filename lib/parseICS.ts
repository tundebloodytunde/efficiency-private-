export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

export function parseICS(ics: string): CalEvent[] {
  const events: CalEvent[] = [];
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
