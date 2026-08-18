// ============================================================
// Storage Layer — طبقة موحدة فوق localStorage
// ============================================================

export const STORAGE_KEY = 'massar_mohsen_v6';
export const STORAGE_KEY_BACKUP = 'massar_mohsen_v6_backup';
export const LEGACY_KEY_V5 = 'mohsen_v5';
export const LEGACY_KEY_V4 = 'mohsen_v4';

export const storage = {
  save(key: string, value: unknown): boolean {
    const data = JSON.stringify(value);
    let ok = false;
    try { localStorage.setItem(key, data); ok = true; } catch (e) { console.error('storage.save failed:', e); }
    try { localStorage.setItem(key + '_backup', data); } catch { /* ثانوي */ }
    return ok;
  },
  get<T>(key: string): T | null {
    try {
      let raw = localStorage.getItem(key);
      if (!raw) raw = localStorage.getItem(key + '_backup');
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error('storage.get failed:', e);
      return null;
    }
  },
  getRaw(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
  backup(key: string, suffix: string): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (raw) localStorage.setItem(key + '_' + suffix, raw);
      return true;
    } catch (e) {
      console.error('storage.backup failed:', e);
      return false;
    }
  }
};
