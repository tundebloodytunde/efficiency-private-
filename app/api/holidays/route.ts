import { NextResponse } from 'next/server';

interface HolidayEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: true;
  source: 'holiday';
}

// weekday: 0=Sun … 6=Sat; n>0 = Nth occurrence, n=-1 = last
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  if (n > 0) {
    const d = new Date(year, month - 1, 1);
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + (n - 1) * 7);
    return d.toLocaleDateString('en-CA');
  }
  const lastDay = new Date(year, month, 0).getDate();
  const d = new Date(year, month - 1, lastDay);
  d.setDate(lastDay - ((d.getDay() - weekday + 7) % 7));
  return d.toLocaleDateString('en-CA');
}

function holidaysForYear(year: number): HolidayEvent[] {
  const h = (id: string, title: string, date: string): HolidayEvent => ({
    id: `holiday-${year}-${id}`,
    title,
    start: date,
    end: date,
    allDay: true,
    source: 'holiday',
  });

  return [
    h('new-years',     "New Year's Day",          `${year}-01-01`),
    h('mlk',           'MLK Day',                  nthWeekday(year, 1, 1, 3)),
    h('presidents',    "Presidents' Day",           nthWeekday(year, 2, 1, 3)),
    h('valentines',    "Valentine's Day",           `${year}-02-14`),
    h('stpatricks',    "St. Patrick's Day",         `${year}-03-17`),
    h('memorial',      'Memorial Day',              nthWeekday(year, 5, 1, -1)),
    h('mothers',       "Mother's Day",              nthWeekday(year, 5, 0, 2)),
    h('juneteenth',    'Juneteenth',                `${year}-06-19`),
    h('fathers',       "Father's Day",              nthWeekday(year, 6, 0, 3)),
    h('independence',  'Independence Day',          `${year}-07-04`),
    h('labor',         'Labor Day',                 nthWeekday(year, 9, 1, 1)),
    h('columbus',      'Columbus Day',              nthWeekday(year, 10, 1, 2)),
    h('halloween',     'Halloween',                 `${year}-10-31`),
    h('veterans',      'Veterans Day',              `${year}-11-11`),
    h('thanksgiving',  'Thanksgiving Day',          nthWeekday(year, 11, 4, 4)),
    h('christmas',     'Christmas Day',             `${year}-12-25`),
    h('nye',           "New Year's Eve",            `${year}-12-31`),
  ];
}

export async function GET() {
  const year = new Date().getFullYear();
  return NextResponse.json([...holidaysForYear(year), ...holidaysForYear(year + 1)]);
}
