// ============================================================
// Default State + Migration من V4/V5 القديمة
// ============================================================
import type { AppState, VocabWord } from '../types';
import { genId } from './utils';

export const SCHEMA_VERSION = 6;

export function defaultState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    userSettings: {
      theme: 'dark', font: 'Tajawal', fontSize: 2, bg: 'none', bgOpacity: 1, customBg: null,
      notifTimes: ['07:00', '09:00', '12:00', '17:00', '20:00', '22:00'],
      sentNotifications: {}
    },
    dailyPlan: { mode: null, dailyModes: {}, processedDays: {} },
    tasksState: { tasks: {}, stopped: {} },
    progressState: { progress: {}, islamicPhase: 1, phaseNotified: {}, topicIndex: 0 },
    vocabulary: { vocab: [] },
    carryoverState: { carryover: [] },
    library: { customSources: [] },
    sessions: { sessions: [] },
    attendance: { attendance: [], streak: 0, lastActiveDate: null, lastStreakDate: null },
    wins: { wins: [], weeklyWin: '', weeklyWinWeek: null }
  };
}

// isEpisodeMap: تفريق شكل V5 stopped (بالحلقة) عن شكل V4 (مباشر)
function isEpisodeMap(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const keys = Object.keys(val as object);
  if (!keys.length) return false;
  return keys.every(k => /^\d+$/.test(k) || k === 'legacy');
}

/**
 * migrateState: بتاخد أي شكل بيانات قديم (V4 flat, V5 flat, أو V6 domains)
 * وترجع AppState سليمة كاملة الحقول من غير فقد بيانات.
 */
export function migrateState(oldState: unknown): AppState {
  const base = defaultState();
  if (!oldState || typeof oldState !== 'object') return base;
  const old = oldState as Record<string, unknown>;

  // لو already V6 domains shape
  if (old.schemaVersion === 6 && old.userSettings) {
    return mergeDomains(base, old as unknown as Partial<AppState>);
  }

  // V4/V5 كانوا flat state — نحوّلهم لـ domains
  const migrated = defaultState();

  if (typeof old.streak === 'number') migrated.attendance.streak = old.streak;
  if (typeof old.lastActiveDate === 'string' || old.lastActiveDate === null) migrated.attendance.lastActiveDate = old.lastActiveDate as string | null;
  if (typeof old.lastStreakDate === 'string' || old.lastStreakDate === null) migrated.attendance.lastStreakDate = old.lastStreakDate as string | null;
  if (Array.isArray(old.attendance)) migrated.attendance.attendance = old.attendance as string[];

  if (old.mode === 'busy' || old.mode === 'free' || old.mode === null) migrated.dailyPlan.mode = old.mode;
  if (old.dailyModes && typeof old.dailyModes === 'object') migrated.dailyPlan.dailyModes = old.dailyModes as Record<string, 'busy' | 'free'>;
  if (old.processedDays && typeof old.processedDays === 'object') migrated.dailyPlan.processedDays = old.processedDays as Record<string, boolean>;

  if (old.tasks && typeof old.tasks === 'object') migrated.tasksState.tasks = old.tasks as AppState['tasksState']['tasks'];

  // stopped: V4 كان {sourceName: {url,time}} مباشر. V5 كان {sourceName: {episode: {...}}}.
  if (old.stopped && typeof old.stopped === 'object') {
    const migratedStopped: AppState['tasksState']['stopped'] = {};
    for (const key in old.stopped as object) {
      const val = (old.stopped as Record<string, unknown>)[key];
      if (val && typeof val === 'object' && ('url' in val || 'time' in val) && !isEpisodeMap(val)) {
        migratedStopped[key] = { legacy: val as { url: string; time: string; savedAt: string } };
      } else {
        migratedStopped[key] = val as Record<string, { url: string; time: string; savedAt: string }>;
      }
    }
    migrated.tasksState.stopped = migratedStopped;
  }

  if (old.progress && typeof old.progress === 'object') migrated.progressState.progress = old.progress as Record<string, number>;
  if (old.islamicPhase === 1 || old.islamicPhase === 2 || old.islamicPhase === 3) migrated.progressState.islamicPhase = old.islamicPhase;
  if (old.phaseNotified && typeof old.phaseNotified === 'object') migrated.progressState.phaseNotified = old.phaseNotified as Record<string, boolean>;
  if (typeof old.topicIndex === 'number') migrated.progressState.topicIndex = old.topicIndex;

  if (Array.isArray(old.vocab)) {
    migrated.vocabulary.vocab = (old.vocab as Partial<VocabWord>[]).map(w => ({
      id: w.id || genId(),
      word: w.word || '',
      meaning: w.meaning || '',
      addedAt: w.addedAt || Date.now(),
      nextReview: w.nextReview || Date.now(),
      reviewCount: w.reviewCount || 0,
      difficulty: w.difficulty || '',
      lastReviewedAt: w.lastReviewedAt ?? null
    }));
  }

  if (Array.isArray(old.carryover)) migrated.carryoverState.carryover = old.carryover as AppState['carryoverState']['carryover'];

  if (Array.isArray(old.wins)) migrated.wins.wins = old.wins as AppState['wins']['wins'];
  if (typeof old.weeklyWin === 'string') migrated.wins.weeklyWin = old.weeklyWin;
  if (typeof old.weeklyWinWeek === 'string' || old.weeklyWinWeek === null) migrated.wins.weeklyWinWeek = old.weeklyWinWeek as string | null;

  // ثيمات V5 القديمة (رملي/سماوي/أخضر/وردي) بقت غير مدعومة — أي قيمة غير
  // Light/Dark/System بترجع لـ dark الافتراضي بدل ما تكسر الواجهة.
  const VALID_THEMES = ['dark', 'light', 'system'];
  if (old.theme && VALID_THEMES.includes(old.theme as string)) {
    migrated.userSettings.theme = old.theme as AppState['userSettings']['theme'];
  }
  if (old.font) migrated.userSettings.font = old.font as AppState['userSettings']['font'];
  if (typeof old.fontSize === 'number') migrated.userSettings.fontSize = old.fontSize;
  const VALID_BG = ['none', 'custom'];
  if (old.bg && VALID_BG.includes(old.bg as string)) {
    migrated.userSettings.bg = old.bg as AppState['userSettings']['bg'];
  }
  if (typeof old.bgOpacity === 'number') migrated.userSettings.bgOpacity = old.bgOpacity;
  if (old.customBg !== undefined) migrated.userSettings.customBg = old.customBg as string | null;
  if (Array.isArray(old.notifTimes)) migrated.userSettings.notifTimes = old.notifTimes as string[];
  if (old.sentNotifications && typeof old.sentNotifications === 'object') migrated.userSettings.sentNotifications = old.sentNotifications as Record<string, boolean>;

  // sessions مفهاش شكل قديم (بند 29 جديد في V6) — بتتبنى فاضية وتتملى من الاستخدام الجديد
  migrated.sessions.sessions = [];

  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated;
}

function mergeDomains(base: AppState, partial: Partial<AppState>): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    userSettings: { ...base.userSettings, ...partial.userSettings },
    dailyPlan: { ...base.dailyPlan, ...partial.dailyPlan },
    tasksState: { ...base.tasksState, ...partial.tasksState },
    progressState: { ...base.progressState, ...partial.progressState },
    vocabulary: { ...base.vocabulary, ...partial.vocabulary },
    carryoverState: { ...base.carryoverState, ...partial.carryoverState },
    library: { ...base.library, ...partial.library },
    sessions: { ...base.sessions, ...partial.sessions },
    attendance: { ...base.attendance, ...partial.attendance },
    wins: { ...base.wins, ...partial.wins }
  };
}
