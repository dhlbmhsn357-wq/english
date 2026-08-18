// ============================================================
// General Utilities
// ============================================================

export function genId(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function isValidHttpUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const u = new URL(str.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function timeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const t = timeStr.trim();
  if (/^\d+$/.test(t)) return Math.round(parseInt(t, 10) / 60);
  if (/^(\d+):(\d+)$/.test(t)) {
    const [m, s] = t.split(':').map(Number);
    return m + Math.round(s / 60);
  }
  if (/^(\d+)m(\d+)s?$/i.test(t)) {
    const match = t.match(/^(\d+)m(\d+)s?$/i)!;
    return parseInt(match[1], 10) + Math.round(parseInt(match[2], 10) / 60);
  }
  return 0;
}

export function buildYtUrl(url: string | null | undefined, timeStr?: string | null): string | null {
  if (!url) return null;
  if (!timeStr) return url;
  let secs = 0;
  const t = timeStr.trim();
  if (/^\d+$/.test(t)) secs = parseInt(t, 10);
  else if (/^(\d+):(\d+)$/.test(t)) { const [m, s] = t.split(':').map(Number); secs = m * 60 + s; }
  else if (/^(\d+)m(\d+)s?$/i.test(t)) { const match = t.match(/^(\d+)m(\d+)s?$/i)!; secs = parseInt(match[1], 10) * 60 + parseInt(match[2], 10); }
  if (secs > 10) secs -= 10;
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return url;
  if (url.includes('watch?v=') || url.includes('youtu.be/')) {
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 't=' + secs;
  }
  return url;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} ساعة و${m} دقيقة` : `${h} ساعة`;
}
