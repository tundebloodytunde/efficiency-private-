const todayKey = () => new Date().toLocaleDateString('en-CA');
const MORNING_KEY = (d: string) => `notif-morning-${d}`;
const NEWS_KEY    = (d: string) => `notif-news-${d}`;

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function notifPermission(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return (await Notification.requestPermission()) as NotifPermission;
}

function fire(title: string, body: string, tag: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/icon-192.png', tag }); } catch { /* noop */ }
}

// Module-level timer store so re-renders don't leak timers
const taskTimers = new Map<string, ReturnType<typeof setTimeout>>();
let morningTimer: ReturnType<typeof setTimeout> | null = null;

export function clearTaskNotifications() {
  taskTimers.forEach(id => clearTimeout(id));
  taskTimers.clear();
}

export function clearAllNotifications() {
  clearTaskNotifications();
  if (morningTimer) { clearTimeout(morningTimer); morningTimer = null; }
}

interface DueTask {
  id: string;
  content: string;
  due?: { date?: string; datetime?: string } | null;
}

export function scheduleTaskNotifications(tasks: DueTask[]) {
  clearTaskNotifications();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = Date.now();
  for (const task of tasks) {
    if (!task.due?.datetime) continue;
    const dueMs = new Date(task.due.datetime).getTime();
    const delay = dueMs - now;
    if (delay < 500 || delay > 24 * 60 * 60 * 1000) continue;
    const id = setTimeout(() => fire('Task due now', task.content, `task-${task.id}`), delay);
    taskTimers.set(task.id, id);
  }
}

export function fireNewsReady() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const key = NEWS_KEY(todayKey());
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  fire('📰 News ready', "Today's roundup has been updated.", 'news-ready');
}

export function scheduleMorningReminder(taskCount: number) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (morningTimer) { clearTimeout(morningTimer); morningTimer = null; }

  const key = MORNING_KEY(todayKey());
  if (localStorage.getItem(key)) return;

  const now = new Date();
  const nineAm = new Date();
  nineAm.setHours(9, 0, 0, 0);
  const delay = nineAm.getTime() - now.getTime();

  const send = () => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    fire(
      'Good morning',
      taskCount === 0
        ? 'No tasks due today — clear day ahead.'
        : `You have ${taskCount} task${taskCount !== 1 ? 's' : ''} due today.`,
      'morning-reminder',
    );
  };

  if (delay <= 0) { send(); return; }
  morningTimer = setTimeout(() => { send(); morningTimer = null; }, delay);
}
