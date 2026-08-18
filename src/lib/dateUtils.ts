// ============================================================
// Date Utilities — كل منطق الأيام يمر من هنا (ممنوع toISOString)
// ============================================================

export function getLocalDateKey(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return getLocalDateKey(new Date());
}

export function yesterdayKey(fromDate?: Date | string): string {
  const d = fromDate ? new Date(fromDate) : new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

export function dateKeyToDate(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00');
}

export function getDayOfWeek(dateKey: string): number {
  return dateKeyToDate(dateKey).getDay();
}

// بداية الأسبوع = السبت (واجهة مصرية/عربية)
export const WEEK_START_DAY = 6;

export function getWeekStart(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
  const day = d.getDay();
  const diff = (day - WEEK_START_DAY + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStartKey(date: Date | string): string {
  return getLocalDateKey(getWeekStart(date));
}

export function formatArabicDate(date: Date = new Date()): string {
  return date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير'; // بعد الظهر
  return 'مساء الخير';
}
