// ============================================================
// Store رئيسي — Zustand، مقسّم منطقيًا بـ Domains (بند 28)
// كل الحفظ بيمر من هنا؛ باقي الكود ما بيلمسش localStorage مباشرة.
// ============================================================
import { create } from 'zustand';
import type {
  AppState, DailyMode, StoppedEntry, CarryoverItem,
  VocabWord, WeeklyWinEntry, LearningSession, Difficulty, Theme, FontFamily, BgStyle,
  LearningSource, CustomSourceStatus
} from '../types';
import { storage, STORAGE_KEY, LEGACY_KEY_V5, LEGACY_KEY_V4 } from '../lib/storage';
import { defaultState, migrateState } from '../lib/migration';
import { todayKey, yesterdayKey, getWeekStartKey } from '../lib/dateUtils';
import { getTasks, getNextEpisodeNumber, getCurrentZadSubject } from '../lib/taskEngine';
import { TOTALS, PHASE_SOURCES, DURATIONS } from '../lib/staticData';
import { genId, timeToMins } from '../lib/utils';

interface UIState {
  lastSaveOk: boolean;
  safeMode: boolean; // لو حصل init error، بنشتغل بحالة آمنة من غير مسح بيانات
  toast: { msg: string; key: number } | null;
  activeSession: { taskId: string; sourceName: string; episode: number; isCarryover: boolean; carryId?: string } | null;
  phaseModal: { open: boolean; phase: number; allComplete: boolean };
}

interface Store extends AppState, UIState {
  // ---- persistence ----
  hydrate: () => void;
  save: () => boolean;

  // ---- daily plan ----
  setMode: (mode: DailyMode) => void;
  checkAndProcessNewDay: () => void;

  // ---- tasks / sessions ----
  startSession: (taskId: string, sourceName: string, episode: number, isCarryover?: boolean, carryId?: string) => void;
  endSession: (result: {
    completed: boolean;
    stoppedAt?: string;
    note?: string;
    newWord?: { word: string; meaning: string };
    difficulty?: Difficulty;
    durationMinutes?: number;
  }) => void;
  cancelSession: () => void;

  toggleDone: (taskKey: string, sourceName?: string) => void;
  saveStop: (sourceName: string, episode: number, url: string, time: string) => boolean;
  saveNote: (taskKey: string, note: string) => void;

  // ---- carryover ----
  completeCarryover: (carryId: string) => void;
  dismissCarryover: (carryId: string) => void;
  postponeCarryover: (carryId: string) => void;

  // ---- progress ----
  updateProgress: (sourceName: string, value: number) => boolean;
  advancePhase: () => void;
  closePhaseModal: () => void;

  // ---- vocab ----
  addWord: (word: string, meaning: string, allowDuplicate?: boolean) => void;
  removeWord: (id: string) => void;
  reviewWord: (id: string, difficulty: Difficulty) => void;

  // ---- wins ----
  saveWin: (text: string) => void;
  refreshWeeklyWinField: () => void;

  // ---- theme/settings ----
  setTheme: (t: Theme) => void;
  setFont: (f: FontFamily) => void;
  setFontSize: (dir: number) => void;
  setBg: (bg: BgStyle) => void;
  setCustomBg: (dataUrl: string | null) => void;
  setBgOpacity: (v: number) => void;
  toggleNotifTime: (time: string) => void;
  addNotifTime: (time: string) => void;
  removeNotifTime: (time: string) => void;
  markNotificationSent: (key: string) => void;

  // ---- attendance ----
  markAttendanceForToday: () => boolean;

  // ---- topic ----
  newTopic: () => void;

  // ---- library (مصادر يضيفها المستخدم) ----
  addSource: (input: Partial<LearningSource> & { title: string }) => LearningSource;
  updateSource: (id: string, patch: Partial<LearningSource>) => void;
  updateSourceUnits: (id: string, completedUnits: number) => void;
  setSourceStatus: (id: string, status: CustomSourceStatus) => void;
  deleteSource: (id: string) => void;

  // ---- import/export ----
  exportSnapshot: () => AppState;
  importSnapshot: (data: unknown) => { ok: boolean; reason?: string };

  // ---- ui ----
  showToast: (msg: string) => void;
  clearToast: () => void;
}

function snapshot(s: Store): AppState {
  return {
    schemaVersion: s.schemaVersion,
    userSettings: s.userSettings,
    dailyPlan: s.dailyPlan,
    tasksState: s.tasksState,
    progressState: s.progressState,
    vocabulary: s.vocabulary,
    carryoverState: s.carryoverState,
    library: s.library,
    sessions: s.sessions,
    attendance: s.attendance,
    wins: s.wins
  };
}

export const useStore = create<Store>((set, get) => ({
  ...defaultState(),
  lastSaveOk: true,
  safeMode: false,
  toast: null,
  activeSession: null,
  phaseModal: { open: false, phase: 1, allComplete: false },

  hydrate: () => {
    try {
      let raw = storage.getRaw(STORAGE_KEY);
      let sourceIsLegacy = false;
      if (!raw) {
        raw = storage.getRaw(LEGACY_KEY_V5) || storage.getRaw(LEGACY_KEY_V4);
        sourceIsLegacy = true;
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateState(parsed);
        set({ ...migrated });
        if (sourceIsLegacy) {
          storage.backup(LEGACY_KEY_V5, 'legacy_preserved');
          storage.backup(LEGACY_KEY_V4, 'legacy_preserved');
        }
      }
    } catch (e) {
      console.error('hydrate error:', e);
      set({ safeMode: true, ...defaultState() });
    }
  },

  save: () => {
    const s = get();
    const ok = storage.save(STORAGE_KEY, snapshot(s));
    set({ lastSaveOk: ok });
    if (!ok) get().showToast('⚠️ تعذر حفظ البيانات. قد تكون مساحة التخزين ممتلئة.');
    return ok;
  },

  // ---------------- Daily Plan ----------------
  setMode: (mode) => {
    const t = todayKey();
    set(s => ({
      dailyPlan: { ...s.dailyPlan, mode, dailyModes: { ...s.dailyPlan.dailyModes, [t]: mode } }
    }));
    get().markAttendanceForToday();
    get().save();
    get().showToast(mode === 'busy' ? '⚡ مضغوط — الأهم فقط' : '🌙 مفضي — خطة كاملة');
  },

  checkAndProcessNewDay: () => {
    const today = todayKey();
    const s = get();
    const pendingDays = Object.keys(s.dailyPlan.dailyModes)
      .filter(dk => dk < today && !s.dailyPlan.processedDays[dk])
      .sort();

    pendingDays.forEach(dk => processEndOfDay(dk, get, set));

    if (s.attendance.lastActiveDate !== today) {
      set(st => ({ dailyPlan: { ...st.dailyPlan, mode: null } }));
    }
    get().save();
  },

  // ---------------- Learning Session Flow (بند 3) ----------------
  startSession: (taskId, sourceName, episode, isCarryover = false, carryId) => {
    set({ activeSession: { taskId, sourceName, episode, isCarryover, carryId } });
  },

  cancelSession: () => set({ activeSession: null }),

  endSession: (result) => {
    const s = get();
    const session = s.activeSession;
    if (!session) return;
    const { taskId, sourceName, episode, isCarryover, carryId } = session;
    const t = todayKey();
    const taskKey = isCarryover ? undefined : `${t}_${taskId}`;

    // 1) سجّل LearningSession (بند 29)
    const learningSession: LearningSession = {
      id: genId(), date: t, taskId, sourceId: sourceName, episodeNumber: episode,
      startedAt: Date.now(), endedAt: Date.now(),
      durationMinutes: result.durationMinutes ?? null,
      completed: result.completed,
      stoppedAt: result.completed ? null : (result.stoppedAt || null),
      note: result.note || '', difficulty: result.difficulty || null, isCarryover
    };
    set(st => ({ sessions: { sessions: [...st.sessions.sessions, learningSession] } }));

    // 2) تحديث progress لو خلصت الحلقة (مرة واحدة بس، ومفيش تخطي للإجمالي)
    if (result.completed && TOTALS[sourceName]) {
      const total = TOTALS[sourceName];
      set(st => {
        const before = st.progressState.progress[sourceName] || 0;
        const after = before < total ? before + 1 : before;
        return { progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: after } } };
      });
    }

    // 3) تحديث stopped position لو ما خلصتش
    if (!result.completed && result.stoppedAt) {
      set(st => {
        const map = { ...(st.tasksState.stopped[sourceName] || {}) };
        map[String(episode)] = { url: '', time: result.stoppedAt!, savedAt: t };
        return { tasksState: { ...st.tasksState, stopped: { ...st.tasksState.stopped, [sourceName]: map } } };
      });
    }

    // 4) احفظ الملاحظة + علّم المهمة كمكتملة لو completed=true
    if (isCarryover && carryId) {
      if (result.completed) {
        const item = s.carryoverState.carryover.find(c => c.id === carryId);
        if (item) {
          const key = `${item.fromDate}_${item.originalTaskId}`;
          set(st => ({ tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [key]: { ...(st.tasksState.tasks[key] || {}), done: true, note: result.note || '' } } } }));
        }
        set(st => ({ carryoverState: { carryover: st.carryoverState.carryover.filter(c => c.id !== carryId) } }));
      }
    } else if (taskKey) {
      set(st => ({
        tasksState: {
          ...st.tasksState,
          tasks: { ...st.tasksState.tasks, [taskKey]: { ...(st.tasksState.tasks[taskKey] || {}), done: result.completed, note: result.note || '', completedEpisode: result.completed } }
        }
      }));
    }

    // 5) كلمة جديدة لو موجودة
    if (result.newWord && result.newWord.word.trim()) {
      get().addWord(result.newWord.word.trim(), result.newWord.meaning.trim());
    }

    set({ activeSession: null });
    get().save();
    if (result.completed) {
      get().showToast('✅ ممتاز! المهمة خلصت 🎉');
      checkPhaseComplete(get, set);
    } else {
      get().showToast('📍 اتسجل مكانك. كمّل من هنا المرة الجاية');
    }
  },

  // ---------------- Simple toggle (للمهام السريعة بدون session كاملة) ----------------
  toggleDone: (taskKey, sourceName) => {
    const s = get();
    const current = s.tasksState.tasks[taskKey] || {};
    const willBeDone = !current.done;
    set(st => ({ tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [taskKey]: { ...current, done: willBeDone } } } }));

    if (sourceName && TOTALS[sourceName]) {
      const total = TOTALS[sourceName];
      if (willBeDone && !current.completedEpisode) {
        set(st => {
          const before = st.progressState.progress[sourceName] || 0;
          const after = before < total ? before + 1 : before;
          return {
            progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: after } },
            tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [taskKey]: { ...st.tasksState.tasks[taskKey], completedEpisode: true } } }
          };
        });
      } else if (!willBeDone && current.completedEpisode) {
        set(st => {
          const before = st.progressState.progress[sourceName] || 0;
          const after = before > 0 ? before - 1 : 0;
          return {
            progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: after } },
            tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [taskKey]: { ...st.tasksState.tasks[taskKey], completedEpisode: false } } }
          };
        });
      }
    }
    get().save();
    if (get().tasksState.tasks[taskKey]?.done) {
      get().showToast('✅ ممتاز! المهمة خلصت 🎉');
      checkPhaseComplete(get, set);
    }
  },

  saveStop: (sourceName, episode, url, time) => {
    if (url && !isValidUrlLocal(url)) {
      get().showToast('❌ الرابط غير صالح');
      return false;
    }
    const entry: StoppedEntry = { url, time, savedAt: todayKey() };
    set(st => {
      const map = { ...(st.tasksState.stopped[sourceName] || {}) };
      map[String(episode)] = entry;
      return { tasksState: { ...st.tasksState, stopped: { ...st.tasksState.stopped, [sourceName]: map } } };
    });
    get().save();
    get().showToast('📍 حُفظ! لما ترجع اضغط "افتح من هنا"');
    return true;
  },

  saveNote: (taskKey, note) => {
    set(st => ({ tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [taskKey]: { ...(st.tasksState.tasks[taskKey] || {}), note } } } }));
    get().save();
  },

  // ---------------- Carryover ----------------
  completeCarryover: (carryId) => {
    const s = get();
    const item = s.carryoverState.carryover.find(c => c.id === carryId);
    if (!item) return;
    const key = `${item.fromDate}_${item.originalTaskId}`;
    set(st => ({
      tasksState: { ...st.tasksState, tasks: { ...st.tasksState.tasks, [key]: { ...(st.tasksState.tasks[key] || {}), done: true, completedEpisode: true } } }
    }));
    if (TOTALS[item.sourceName]) {
      const total = TOTALS[item.sourceName];
      set(st => {
        const before = st.progressState.progress[item.sourceName] || 0;
        const after = before < total ? before + 1 : before;
        return { progressState: { ...st.progressState, progress: { ...st.progressState.progress, [item.sourceName]: after } } };
      });
    }
    set(st => ({ carryoverState: { carryover: st.carryoverState.carryover.filter(c => c.id !== carryId) } }));
    get().save();
    get().showToast('✅ مهمة مترحلة خلصت! 🎉');
  },

  dismissCarryover: (carryId) => {
    set(st => ({ carryoverState: { carryover: st.carryoverState.carryover.filter(c => c.id !== carryId) } }));
    get().save();
    get().showToast('تم إلغاء المهمة المترحلة');
  },

  postponeCarryover: (carryId) => {
    // ترحيل لاحقًا = سيبها زي ما هي (هتتحسب تاني في نهاية اليوم لو ما اتعملتش)
    get().showToast('هتفضل في المتأخرات لحد ما تخلصها');
    void carryId;
  },

  // ---------------- Progress ----------------
  updateProgress: (sourceName, value) => {
    const total = TOTALS[sourceName] || 0;
    if (isNaN(value)) { get().showToast('❌ رقم غير صالح'); return false; }
    if (value < 0) { get().showToast('❌ الرقم لا يمكن أن يكون سالبًا'); return false; }
    if (value > total) { get().showToast(`❌ العدد أكبر من الإجمالي (${total})`); return false; }
    set(st => ({ progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: value } } }));
    get().save();
    get().showToast('📊 تم التحديث');
    checkPhaseComplete(get, set);
    return true;
  },

  advancePhase: () => {
    set(st => ({ progressState: { ...st.progressState, islamicPhase: Math.min((st.progressState.islamicPhase + 1), 3) as 1 | 2 | 3 } }));
    set(st => ({ phaseModal: { ...st.phaseModal, open: false } }));
    get().save();
    get().showToast('🚀 انتقلت للمرحلة ' + get().progressState.islamicPhase + '!');
  },

  closePhaseModal: () => set(st => ({ phaseModal: { ...st.phaseModal, open: false } })),

  // ---------------- Vocabulary ----------------
  addWord: (word, meaning, allowDuplicate = false) => {
    if (!word.trim()) return;
    const s = get();
    const dup = s.vocabulary.vocab.find(x => x.word.toLowerCase() === word.toLowerCase());
    if (dup && !allowDuplicate) {
      get().showToast(`الكلمة "${word}" موجودة بالفعل`);
      return;
    }
    const w: VocabWord = { id: genId(), word, meaning, addedAt: Date.now(), nextReview: Date.now(), reviewCount: 0, difficulty: '', lastReviewedAt: null };
    set(st => ({ vocabulary: { vocab: [...st.vocabulary.vocab, w] } }));
    get().save();
    get().showToast('✨ أضفت: ' + word);
  },

  removeWord: (id) => {
    set(st => ({ vocabulary: { vocab: st.vocabulary.vocab.filter(x => x.id !== id) } }));
    get().save();
  },

  reviewWord: (id, difficulty) => {
    set(st => {
      const vocab = st.vocabulary.vocab.map(v => {
        if (v.id !== id) return v;
        const reviewCount = (v.reviewCount || 0) + 1;
        const days = difficulty === 'easy' ? Math.min(3 * Math.pow(2, reviewCount), 30) : difficulty === 'mid' ? 3 : 1;
        return { ...v, difficulty, reviewCount, lastReviewedAt: Date.now(), nextReview: Date.now() + days * 86400000 };
      });
      return { vocabulary: { vocab } };
    });
    get().save();
  },

  // ---------------- Wins ----------------
  saveWin: (text) => {
    if (!text.trim()) return;
    const wk = getWeekStartKey(new Date());
    set(st => ({
      wins: {
        weeklyWin: text, weeklyWinWeek: wk,
        wins: [...st.wins.wins.filter(w => w.week !== wk), { text, date: todayKey(), week: wk } as WeeklyWinEntry]
      }
    }));
    get().save();
    get().showToast('🏆 محفوظ! كمّل 💪');
  },

  refreshWeeklyWinField: () => {
    const wk = getWeekStartKey(new Date());
    const s = get();
    if (s.wins.weeklyWinWeek !== wk) {
      set(st => ({ wins: { ...st.wins, weeklyWin: '', weeklyWinWeek: wk } }));
    }
  },

  // ---------------- Theme ----------------
  setTheme: (t) => { set(st => ({ userSettings: { ...st.userSettings, theme: t } })); get().save(); },
  setFont: (f) => { set(st => ({ userSettings: { ...st.userSettings, font: f } })); get().save(); },
  setFontSize: (dir) => {
    set(st => ({ userSettings: { ...st.userSettings, fontSize: Math.max(0, Math.min(4, st.userSettings.fontSize + dir)) } }));
    get().save();
  },
  setBg: (bg) => { set(st => ({ userSettings: { ...st.userSettings, bg, customBg: bg === 'custom' ? st.userSettings.customBg : null } })); get().save(); },
  setCustomBg: (dataUrl) => { set(st => ({ userSettings: { ...st.userSettings, customBg: dataUrl, bg: 'custom' } })); get().save(); },
  setBgOpacity: (v) => { set(st => ({ userSettings: { ...st.userSettings, bgOpacity: v } })); get().save(); },

  toggleNotifTime: (time) => {
    set(st => {
      const has = st.userSettings.notifTimes.includes(time);
      const notifTimes = has ? st.userSettings.notifTimes.filter(t => t !== time) : [...st.userSettings.notifTimes, time];
      return { userSettings: { ...st.userSettings, notifTimes } };
    });
    get().save();
  },
  addNotifTime: (time) => {
    const s = get();
    if (s.userSettings.notifTimes.includes(time)) { get().showToast('الوقت ده مضاف بالفعل'); return; }
    set(st => ({ userSettings: { ...st.userSettings, notifTimes: [...st.userSettings.notifTimes, time] } }));
    get().save();
  },
  removeNotifTime: (time) => {
    set(st => ({ userSettings: { ...st.userSettings, notifTimes: st.userSettings.notifTimes.filter(t => t !== time) } }));
    get().save();
  },
  markNotificationSent: (key) => {
    set(st => ({ userSettings: { ...st.userSettings, sentNotifications: { ...st.userSettings.sentNotifications, [key]: true } } }));
    get().save();
  },

  // ---------------- Attendance ----------------
  markAttendanceForToday: () => {
    const t = todayKey();
    const s = get();
    const already = s.attendance.attendance.includes(t);
    if (!already) {
      set(st => ({ attendance: { ...st.attendance, attendance: [...st.attendance.attendance, t] } }));
    }
    // streak — مرة واحدة يوميًا بس
    if (s.attendance.lastStreakDate !== t) {
      const y = yesterdayKey();
      const newStreak = s.attendance.lastActiveDate === y ? (s.attendance.streak || 0) + 1 : 1;
      set(st => ({ attendance: { ...st.attendance, streak: newStreak, lastActiveDate: t, lastStreakDate: t } }));
    }
    return !already;
  },

  // ---------------- Topic ----------------
  newTopic: () => {
    set(st => ({ progressState: { ...st.progressState, topicIndex: st.progressState.topicIndex + 1 } }));
    get().save();
  },

  // ---------------- Library (مصادر المستخدم) ----------------
  addSource: (input) => {
    const now = Date.now();
    const source: LearningSource = {
      id: genId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      url: input.url?.trim() || null,
      coverImage: input.coverImage || null,
      contentType: input.contentType || 'other',
      format: input.format || 'mixed',
      skills: input.skills || [],
      trackingType: input.trackingType || 'manual',
      totalUnits: input.totalUnits ?? null,
      completedUnits: input.completedUnits ?? 0,
      goal: input.goal || undefined,
      priority: input.priority || 'secondary',
      status: 'not-started',
      notes: input.notes || undefined,
      lastActivityAt: null,
      createdAt: now,
      updatedAt: now
    };
    set(st => ({ library: { customSources: [source, ...st.library.customSources] } }));
    get().save();
    get().showToast('تمت إضافة المصدر إلى مكتبتك');
    return source;
  },

  updateSource: (id, patch) => {
    set(st => ({
      library: {
        customSources: st.library.customSources.map(src =>
          src.id === id ? { ...src, ...patch, updatedAt: Date.now() } : src
        )
      }
    }));
    get().save();
  },

  updateSourceUnits: (id, completedUnits) => {
    set(st => ({
      library: {
        customSources: st.library.customSources.map(src => {
          if (src.id !== id) return src;
          const total = src.totalUnits ?? null;
          const clamped = Math.max(0, total != null ? Math.min(completedUnits, total) : completedUnits);
          const status: CustomSourceStatus =
            total != null && clamped >= total ? 'completed' : clamped > 0 ? 'in-progress' : src.status === 'archived' ? 'archived' : 'not-started';
          return { ...src, completedUnits: clamped, status, lastActivityAt: Date.now(), updatedAt: Date.now() };
        })
      }
    }));
    get().save();
    get().showToast('تم تحديث التقدم');
  },

  setSourceStatus: (id, status) => {
    set(st => ({
      library: { customSources: st.library.customSources.map(src => (src.id === id ? { ...src, status, updatedAt: Date.now() } : src)) }
    }));
    get().save();
  },

  deleteSource: (id) => {
    set(st => ({ library: { customSources: st.library.customSources.filter(src => src.id !== id) } }));
    get().save();
    get().showToast('تم حذف المصدر');
  },

  // ---------------- Import / Export ----------------
  exportSnapshot: () => snapshot(get()),

  importSnapshot: (data) => {
    const result = validateImportedState(data);
    if (!result.ok) return result;
    storage.backup(STORAGE_KEY, 'pre_import_backup');
    const migrated = migrateState(result.data);
    set({ ...migrated });
    const saved = get().save();
    if (saved) get().showToast('✅ تم استيراد البيانات!');
    else get().showToast('⚠️ استُورد لكن تعذر حفظه');
    return { ok: true };
  },

  // ---------------- UI ----------------
  showToast: (msg) => set({ toast: { msg, key: Date.now() } }),
  clearToast: () => set({ toast: null })
}));

// ================= Helpers خارج الـ store (منطق مستقل يستخدم get/set) =================

function isValidUrlLocal(str: string): boolean {
  try { const u = new URL(str.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function processEndOfDay(dateKey: string, get: () => Store, set: (fn: (s: Store) => Partial<Store>) => void) {
  const s = get();
  if (s.dailyPlan.processedDays[dateKey]) return;

  const modeForDay = s.dailyPlan.dailyModes[dateKey] || null;
  if (!modeForDay) {
    set(st => ({ dailyPlan: { ...st.dailyPlan, processedDays: { ...st.dailyPlan.processedDays, [dateKey]: true } } }));
    return;
  }

  const tasks = getTasks(modeForDay, dateKey, s.progressState.islamicPhase, s.progressState.progress);
  const newItems: CarryoverItem[] = [];

  tasks.forEach(t => {
    const taskKey = dateKey + '_' + t.id;
    const taskState = s.tasksState.tasks[taskKey] || {};
    if (taskState.done) return;

    const episode = getNextEpisodeNumber(t.name, s.progressState.progress);
    const stoppedMap = s.tasksState.stopped[t.name] || {};
    const stoppedEntry = stoppedMap[String(episode)];
    const duration = DURATIONS[t.name] || 45;

    let remainMins: number;
    if (stoppedEntry && stoppedEntry.time && stoppedEntry.savedAt === dateKey) {
      const doneMins = timeToMins(stoppedEntry.time);
      remainMins = Math.max(0, duration - doneMins);
    } else {
      remainMins = duration;
    }
    if (remainMins <= 0) return;

    newItems.push({
      id: genId(), sourceName: t.name, originalTaskId: t.id, fromDate: dateKey, episode,
      remainMinutes: remainMins, stoppedTime: stoppedEntry?.time || null, url: stoppedEntry?.url || null,
      type: t.type, meta: t.meta
    });
  });

  set(st => ({
    carryoverState: { carryover: [...st.carryoverState.carryover, ...newItems] },
    dailyPlan: { ...st.dailyPlan, processedDays: { ...st.dailyPlan.processedDays, [dateKey]: true } }
  }));
}

function checkPhaseComplete(get: () => Store, set: (fn: (s: Store) => Partial<Store>) => void) {
  const s = get();
  const phase = s.progressState.islamicPhase;
  if (phase >= 3) {
    const allDone3 = PHASE_SOURCES[3].every(name => (s.progressState.progress[name] || 0) >= (TOTALS[name] || Infinity));
    if (allDone3 && !s.progressState.phaseNotified['allComplete']) {
      set(st => ({ progressState: { ...st.progressState, phaseNotified: { ...st.progressState.phaseNotified, allComplete: true } } }));
      get().save();
      set(() => ({ phaseModal: { open: true, phase: 3, allComplete: true } }));
    }
    return;
  }
  const sources = PHASE_SOURCES[phase] || [];
  const allDone = sources.length > 0 && sources.every(name => {
    const total = TOTALS[name];
    return total && (s.progressState.progress[name] || 0) >= total;
  });
  if (allDone && !s.progressState.phaseNotified[String(phase)]) {
    set(st => ({ progressState: { ...st.progressState, phaseNotified: { ...st.progressState.phaseNotified, [String(phase)]: true } } }));
    get().save();
    set(() => ({ phaseModal: { open: true, phase, allComplete: false } }));
  }
}

function validateImportedState(payload: unknown): { ok: true; data: unknown } | { ok: false; reason: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'الملف ليس بالشكل الصحيح' };
  }
  let data: Record<string, unknown> = payload as Record<string, unknown>;
  if (data.data && typeof data.data === 'object') data = data.data as Record<string, unknown>;
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'بيانات غير موجودة' };
  return { ok: true, data };
}

// دالة مساعدة بره الـ store للاستخدام في الواجهات (getCurrentZadSubject wrapper)
export function useZadSubject(): string | null {
  const progress = useStore(s => s.progressState.progress);
  return getCurrentZadSubject(progress);
}
