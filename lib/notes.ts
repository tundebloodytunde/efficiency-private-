export interface Note {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
}

function key(date: string) { return `notes-${date}`; }

export function getNotesForDate(date: string): Note[] {
  try { return JSON.parse(localStorage.getItem(key(date)) ?? '[]'); }
  catch { return []; }
}

export function saveNote(text: string, date?: string): Note {
  const d = date ?? new Date().toLocaleDateString('en-CA');
  const note: Note = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text: text.trim(), createdAt: new Date().toISOString() };
  const existing = getNotesForDate(d);
  localStorage.setItem(key(d), JSON.stringify([...existing, note]));
  return note;
}

export function deleteNote(date: string, id: string) {
  const notes = getNotesForDate(date).filter(n => n.id !== id);
  localStorage.setItem(key(date), JSON.stringify(notes));
}

export function getRecentNoteDates(days = 14): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const str = d.toLocaleDateString('en-CA');
    if (getNotesForDate(str).length > 0) dates.push(str);
  }
  return dates;
}

export function getTodayString() {
  return new Date().toLocaleDateString('en-CA');
}
