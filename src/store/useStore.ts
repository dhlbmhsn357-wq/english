// ============================================================
// Store رئيسي — Zustand، مقسّم منطقيًا بـ Domains (بند 28)
// كل الحفظ بيمر من هنا؛ باقي الكود ما بيلمسش localStorage مباشرة.
// ============================================================
import { create } from 'zustand';
import type {
  AppState, DailyMode, CarryoverItem,
  VocabWord, WeeklyWinEntry, LearningSession, Difficulty, Theme, FontFamily, BgStyle,
  LearningSource, CustomSourceStatus,
  WeekDayIndex, DayTemplate, PlanItem, PlanItemTemplate, DailyPlanInstance, TrackingType, SourceKind, SourcePriority
} from '../types';
import { storage, STORAGE_KEY, LEGACY_KEY_V5, LEGACY_KEY_V4 } from '../lib/storage';
import { defaultState, migrateState } from '../lib/migration';
import { todayKey, yesterdayKey, getWeekStartKey } from '../lib/dateUtils';
import { PHASE_SOURCES, TOTALS } from '../lib/staticData';
import { materializeInstance } from '../lib/planEngine';
import { genId } from '../lib/utils';

interface ActiveReadingSession {
  sourceId: string;
  sourceTitle: string;
  startPage: number;
  startedAt: number;
  wordsSaved: number;
  highlightsAdded: number;
  notesAdded: number;
}

interface ActiveSession {
  date: string | null;        // تاريخ اليوم في الخطة، أو null لمتابعة حرة من المكتبة
  itemId: string | null;      // PlanItem.id، أو null لمتابعة حرة
  sourceId: string;
  sourceKind: SourceKind;
  sourceName: string;
  trackingType: TrackingType;
  targetAmount: number;
  episodeNumber: number | null; // للعرض + حساب stopped-position (مصادر ثابتة)
  isCarryover: boolean;
  carryId?: string;
}

interface UIState {
  lastSaveOk: boolean;
  safeMode: boolean; // لو حصل init error، بنشتغل بحالة آمنة من غير مسح بيانات
  toast: { msg: string; key: number } | null;
  activeSession: ActiveSession | null;
  phaseModal: { open: boolean; phase: number; allComplete: boolean };
  activeReadingSession: ActiveReadingSession | null;
  lastReadingSummary: LearningSession | null;
}

interface Store extends AppState, UIState {
  // ---- persistence ----
  hydrate: () => void;
  save: () => boolean;

  // ---- daily plan ----
  setMode: (mode: DailyMode) => void;
  checkAndProcessNewDay: () => void;

  // ---- plan-driven sessions (بند 41-42، 59) ----
  startPlanSession: (date: string, itemId: string, isCarryover?: boolean, carryId?: string) => void;
  startFreeSession: (sourceKind: SourceKind, sourceId: string, sourceName: string) => void;
  endSession: (result: {
    completed: boolean;
    stoppedAt?: string;
    note?: string;
    newWord?: { word: string; meaning: string };
    difficulty?: Difficulty;
    durationMinutes?: number;
  }) => void;
  cancelSession: () => void;

  // ---- carryover ----
  dismissCarryover: (carryId: string) => void;

  // ---- plan builder (بند 13-38) ----
  ensureDailyInstance: (date: string) => DailyPlanInstance;
  updateDayTemplate: (day: WeekDayIndex, patch: Partial<Pick<DayTemplate, 'enabled' | 'mode' | 'windows' | 'durationMinutes'>>) => void;
  addTemplateItem: (day: WeekDayIndex, item: Omit<PlanItemTemplate, 'id' | 'order'>) => void;
  removeTemplateItem: (day: WeekDayIndex, itemId: string) => void;
  reorderTemplateItems: (day: WeekDayIndex, orderedIds: string[]) => void;
  updateTemplateItem: (day: WeekDayIndex, itemId: string, patch: Partial<Pick<PlanItemTemplate, 'targetAmount' | 'estimatedMinutes' | 'priority'>>) => void;
  addInstanceItem: (date: string, item: { sourceId: string; sourceKind: SourceKind; sourceName: string; trackingType: TrackingType; targetAmount: number; estimatedMinutes: number; priority: SourcePriority }) => void;
  removeInstanceItem: (date: string, itemId: string) => void;
  reorderInstanceItems: (date: string, orderedIds: string[]) => void;
  splitInstanceItem: (date: string, itemId: string, parts: number[]) => void;
  moveInstanceItem: (fromDate: string, itemId: string, toDate: string) => void;
  skipInstanceItem: (date: string, itemId: string) => void;
  unskipInstanceItem: (date: string, itemId: string) => void;

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

  // ---- reading (Study Reader) ----
  updateReadingPosition: (sourceId: string, page: number, totalPages: number | null) => void;
  startReadingSession: (sourceId: string, sourceTitle: string, startPage: number) => void;
  bumpReadingStat: (kind: 'word' | 'highlight' | 'note') => void;
  endReadingSession: (endPage: number) => LearningSession | null;
  cancelReadingSession: () => void;
  clearReadingSummary: () => void;

  // ---- vocabulary with context ----
  addWordWithContext: (
    word: string,
    meaning: string,
    context?: { sourceId?: string; sourceTitle?: string; page?: number; sentence?: string }
  ) => { status: 'added' | 'duplicate'; existing?: VocabWord };
  updateWordContext: (id: string, context: { sourceId?: string; sourceTitle?: string; page?: number; sentence?: string }, mode: 'replace' | 'append') => void;

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
    wins: s.wins,
    plan: s.plan
  };
}

export const useStore = create<Store>((set, get) => ({
  ...defaultState(),
  lastSaveOk: true,
  safeMode: false,
  toast: null,
  activeSession: null,
  phaseModal: { open: false, phase: 1, allComplete: false },
  activeReadingSession: null,
  lastReadingSummary: null,

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
    if (!ok) get().showToast('تعذر حفظ البيانات. قد تكون مساحة التخزين ممتلئة.');
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
    get().showToast(mode === 'busy' ? 'مضغوط — الأهم فقط' : 'مفضي — خطة كاملة');
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

  // ---------------- Learning Session Flow — مبني على PlanItem بدل Hardcoded Tasks (بند 41-42، 59) ----------------
  startPlanSession: (date, itemId, isCarryover = false, carryId) => {
    const instance = get().ensureDailyInstance(date);
    const item = instance.items.find(i => i.id === itemId);
    if (!item) { get().showToast('المهمة دي مش موجودة في خطة هذا اليوم'); return; }
    const episodeNumber = item.sourceKind === 'static' ? (get().progressState.progress[item.sourceName] || 0) + 1 : null;
    set({
      activeSession: {
        date, itemId, sourceId: item.sourceId, sourceKind: item.sourceKind, sourceName: item.sourceName,
        trackingType: item.trackingType, targetAmount: item.targetAmount, episodeNumber, isCarryover, carryId
      }
    });
  },

  startFreeSession: (sourceKind, sourceId, sourceName) => {
    const s = get();
    let trackingType: TrackingType = 'episodes';
    let episodeNumber: number | null = null;
    if (sourceKind === 'static') {
      episodeNumber = (s.progressState.progress[sourceName] || 0) + 1;
    } else {
      const src = s.library.customSources.find(x => x.id === sourceId);
      trackingType = src?.trackingType || 'manual';
    }
    set({
      activeSession: {
        date: null, itemId: null, sourceId, sourceKind, sourceName,
        trackingType, targetAmount: 1, episodeNumber, isCarryover: false
      }
    });
  },

  cancelSession: () => set({ activeSession: null }),

  endSession: (result) => {
    const s = get();
    const session = s.activeSession;
    if (!session) return;
    const { date, itemId, sourceId, sourceKind, sourceName, targetAmount, episodeNumber, isCarryover, carryId } = session;
    const t = todayKey();

    // 1) سجّل LearningSession (بند 29، 59)
    const learningSession: LearningSession = {
      id: genId(), date: t, taskId: itemId || 'free', sourceId: sourceKind === 'static' ? sourceName : sourceId,
      episodeNumber, startedAt: Date.now(), endedAt: Date.now(),
      durationMinutes: result.durationMinutes ?? null,
      completed: result.completed,
      stoppedAt: result.completed ? null : (result.stoppedAt || null),
      note: result.note || '', difficulty: result.difficulty || null, isCarryover
    };
    set(st => ({ sessions: { sessions: [...st.sessions.sessions, learningSession] } }));

    if (result.completed) {
      // 2) تحديث Source Progress — مستقل عن Plan Completion (بند 58)
      applySourceProgressDelta(sourceKind, sourceId, sourceName, targetAmount, set, get);

      // 3) تحديث الـ PlanItem نفسه لو الجلسة دي جزء من خطة يوم
      if (date && itemId) {
        set(st => {
          const inst = st.plan.instances[date];
          if (!inst) return {};
          return {
            plan: {
              ...st.plan,
              instances: {
                ...st.plan.instances,
                [date]: { ...inst, items: inst.items.map(i => (i.id === itemId ? { ...i, status: 'done', completedAmount: i.targetAmount } : i)) }
              }
            }
          };
        });
      }

      // 4) لو الجلسة دي كانت بتحسم Carryover — امسحها بعد ما خلصت فعليًا
      if (isCarryover && carryId) {
        set(st => ({ carryoverState: { carryover: st.carryoverState.carryover.filter(c => c.id !== carryId) } }));
      }
    } else if (result.stoppedAt && sourceKind === 'static') {
      // 5) موضع التوقف — للمصادر الثابتة بس (نفس آلية "افتح من هنا" القديمة)
      set(st => {
        const map = { ...(st.tasksState.stopped[sourceName] || {}) };
        map[String(episodeNumber ?? 1)] = { url: '', time: result.stoppedAt!, savedAt: t };
        return { tasksState: { ...st.tasksState, stopped: { ...st.tasksState.stopped, [sourceName]: map } } };
      });
    }

    // 6) كلمة جديدة لو موجودة
    if (result.newWord && result.newWord.word.trim()) {
      get().addWord(result.newWord.word.trim(), result.newWord.meaning.trim());
    }

    set({ activeSession: null });
    get().save();
    if (result.completed) {
      get().showToast('ممتاز! المهمة خلصت');
      checkPhaseComplete(get, set);
    } else {
      get().showToast('اتسجل مكانك. كمّل من هنا المرة الجاية');
    }
  },

  // ---------------- Carryover ----------------
  dismissCarryover: (carryId) => {
    set(st => ({ carryoverState: { carryover: st.carryoverState.carryover.filter(c => c.id !== carryId) } }));
    get().save();
    get().showToast('تم إلغاء المهمة المترحلة');
  },

  // ---------------- Plan Builder (بند 13-38) ----------------
  ensureDailyInstance: (date) => {
    const existing = get().plan.instances[date];
    if (existing) return existing;
    const inst = materializeInstance(get().plan.template, date);
    set(st => ({ plan: { ...st.plan, instances: { ...st.plan.instances, [date]: inst } } }));
    get().save();
    return inst;
  },

  updateDayTemplate: (day, patch) => {
    set(st => ({
      plan: {
        ...st.plan,
        template: {
          ...st.plan.template,
          version: st.plan.template.version + 1,
          updatedAt: Date.now(),
          days: st.plan.template.days.map(d => (d.day === day ? { ...d, ...patch } : d))
        }
      }
    }));
    get().save();
  },

  addTemplateItem: (day, item) => {
    set(st => ({
      plan: {
        ...st.plan,
        template: {
          ...st.plan.template,
          version: st.plan.template.version + 1,
          updatedAt: Date.now(),
          days: st.plan.template.days.map(d => {
            if (d.day !== day) return d;
            const newItem: PlanItemTemplate = { ...item, id: genId(), order: d.items.length };
            return { ...d, enabled: true, items: [...d.items, newItem] };
          })
        }
      }
    }));
    get().save();
    get().showToast('تمت الإضافة للخطة');
  },

  removeTemplateItem: (day, itemId) => {
    set(st => ({
      plan: {
        ...st.plan,
        template: {
          ...st.plan.template,
          version: st.plan.template.version + 1,
          updatedAt: Date.now(),
          days: st.plan.template.days.map(d => (d.day === day ? { ...d, items: d.items.filter(i => i.id !== itemId) } : d))
        }
      }
    }));
    get().save();
  },

  reorderTemplateItems: (day, orderedIds) => {
    set(st => ({
      plan: {
        ...st.plan,
        template: {
          ...st.plan.template,
          version: st.plan.template.version + 1,
          updatedAt: Date.now(),
          days: st.plan.template.days.map(d => {
            if (d.day !== day) return d;
            const byId = new Map(d.items.map(i => [i.id, i]));
            const items = orderedIds.map((id, idx) => { const it = byId.get(id); return it ? { ...it, order: idx } : null; }).filter((i): i is PlanItemTemplate => !!i);
            return { ...d, items };
          })
        }
      }
    }));
    get().save();
  },

  updateTemplateItem: (day, itemId, patch) => {
    set(st => ({
      plan: {
        ...st.plan,
        template: {
          ...st.plan.template,
          version: st.plan.template.version + 1,
          updatedAt: Date.now(),
          days: st.plan.template.days.map(d => (d.day === day ? { ...d, items: d.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)) } : d))
        }
      }
    }));
    get().save();
  },

  addInstanceItem: (date, item) => {
    get().ensureDailyInstance(date);
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      const newItem: PlanItem = {
        id: genId(), date, sourceId: item.sourceId, sourceKind: item.sourceKind, sourceName: item.sourceName,
        trackingType: item.trackingType, targetAmount: item.targetAmount, completedAmount: 0,
        estimatedMinutes: item.estimatedMinutes, order: inst.items.length, status: 'pending', priority: item.priority
      };
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items: [...inst.items, newItem] } } } };
    });
    get().save();
    get().showToast('تمت الإضافة لخطة اليوم');
  },

  removeInstanceItem: (date, itemId) => {
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items: inst.items.filter(i => i.id !== itemId) } } } };
    });
    get().save();
    get().showToast('اتشالت من الخطة (المصدر لسه موجود في مكتبتك)');
  },

  reorderInstanceItems: (date, orderedIds) => {
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      const byId = new Map(inst.items.map(i => [i.id, i]));
      const items = orderedIds.map((id, idx) => { const it = byId.get(id); return it ? { ...it, order: idx } : null; }).filter((i): i is PlanItem => !!i);
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items } } } };
    });
    get().save();
  },

  splitInstanceItem: (date, itemId, parts) => {
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      const original = inst.items.find(i => i.id === itemId);
      if (!original || parts.length < 2) return {};
      const totalParts = parts.reduce((a, b) => a + b, 0);
      const newItems: PlanItem[] = parts.map((amount, idx) => ({
        ...original,
        id: genId(),
        targetAmount: amount,
        completedAmount: 0,
        estimatedMinutes: Math.round((original.estimatedMinutes * amount) / (totalParts || 1)),
        order: original.order + idx * 0.01,
        status: 'pending',
        parentItemId: original.id
      }));
      const items = inst.items.filter(i => i.id !== itemId).concat(newItems).sort((a, b) => a.order - b.order);
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items } } } };
    });
    get().save();
    get().showToast('تم تقسيم المهمة');
  },

  moveInstanceItem: (fromDate, itemId, toDate) => {
    get().ensureDailyInstance(toDate);
    set(st => {
      const from = st.plan.instances[fromDate];
      const to = st.plan.instances[toDate];
      if (!from || !to) return {};
      const item = from.items.find(i => i.id === itemId);
      if (!item) return {};
      return {
        plan: {
          ...st.plan,
          instances: {
            ...st.plan.instances,
            [fromDate]: { ...from, items: from.items.filter(i => i.id !== itemId) },
            [toDate]: { ...to, items: [...to.items, { ...item, date: toDate, order: to.items.length }] }
          }
        }
      };
    });
    get().save();
    get().showToast('اتنقلت المهمة');
  },

  skipInstanceItem: (date, itemId) => {
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items: inst.items.map(i => (i.id === itemId ? { ...i, status: 'skipped' } : i)) } } } };
    });
    get().save();
  },

  unskipInstanceItem: (date, itemId) => {
    set(st => {
      const inst = st.plan.instances[date];
      if (!inst) return {};
      return { plan: { ...st.plan, instances: { ...st.plan.instances, [date]: { ...inst, items: inst.items.map(i => (i.id === itemId ? { ...i, status: 'pending' } : i)) } } } };
    });
    get().save();
  },

  // ---------------- Progress ----------------
  updateProgress: (sourceName, value) => {
    const total = TOTALS[sourceName] || 0;
    if (isNaN(value)) { get().showToast('رقم غير صالح'); return false; }
    if (value < 0) { get().showToast('الرقم لا يمكن أن يكون سالبًا'); return false; }
    if (value > total) { get().showToast(`العدد أكبر من الإجمالي (${total})`); return false; }
    set(st => ({ progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: value } } }));
    get().save();
    get().showToast('تم التحديث');
    checkPhaseComplete(get, set);
    return true;
  },

  advancePhase: () => {
    set(st => ({ progressState: { ...st.progressState, islamicPhase: Math.min((st.progressState.islamicPhase + 1), 3) as 1 | 2 | 3 } }));
    set(st => ({ phaseModal: { ...st.phaseModal, open: false } }));
    get().save();
    get().showToast('انتقلت للمرحلة ' + get().progressState.islamicPhase + '!');
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
    get().showToast('أضفت: ' + word);
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
    get().showToast('محفوظ! كمّل بنفس الروح');
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
      updatedAt: now,
      fileType: input.fileType ?? null,
      fileRef: input.fileRef ?? null,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      currentPage: input.currentPage ?? 1,
      lastOpenedPage: input.lastOpenedPage ?? 1,
      readingMinutesTotal: 0
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

  // ---------------- Reading (Study Reader) ----------------
  updateReadingPosition: (sourceId, page, totalPages) => {
    set(st => ({
      library: {
        customSources: st.library.customSources.map(src => {
          if (src.id !== sourceId) return src;
          const highest = Math.max(src.completedUnits || 0, page);
          const clampedHighest = totalPages ? Math.min(highest, totalPages) : highest;
          const status: CustomSourceStatus =
            totalPages && clampedHighest >= totalPages ? 'completed' : 'in-progress';
          return {
            ...src,
            currentPage: page,
            lastOpenedPage: page,
            completedUnits: clampedHighest,
            status,
            lastActivityAt: Date.now(),
            updatedAt: Date.now()
          };
        })
      }
    }));
    get().save();
  },

  startReadingSession: (sourceId, sourceTitle, startPage) => {
    set({ activeReadingSession: { sourceId, sourceTitle, startPage, startedAt: Date.now(), wordsSaved: 0, highlightsAdded: 0, notesAdded: 0 } });
  },

  bumpReadingStat: (kind) => {
    set(st => {
      if (!st.activeReadingSession) return {};
      const key = kind === 'word' ? 'wordsSaved' : kind === 'highlight' ? 'highlightsAdded' : 'notesAdded';
      return { activeReadingSession: { ...st.activeReadingSession, [key]: st.activeReadingSession[key] + 1 } };
    });
  },

  endReadingSession: (endPage) => {
    const s = get();
    const rs = s.activeReadingSession;
    if (!rs) return null;
    const durationMinutes = Math.max(0, Math.round((Date.now() - rs.startedAt) / 60000));
    const pagesRead = Math.max(0, endPage - rs.startPage + 1);

    const session: LearningSession = {
      id: genId(), date: todayKey(), taskId: 'reading', sourceId: rs.sourceId,
      episodeNumber: null, startedAt: rs.startedAt, endedAt: Date.now(),
      durationMinutes, completed: true, stoppedAt: null, note: '', difficulty: null, isCarryover: false,
      type: 'reading', startPage: rs.startPage, endPage, pagesRead,
      wordsSaved: rs.wordsSaved, highlightsAdded: rs.highlightsAdded, notesAdded: rs.notesAdded
    };

    set(st => ({
      sessions: { sessions: [...st.sessions.sessions, session] },
      activeReadingSession: null,
      lastReadingSummary: session
    }));
    get().save();
    return session;
  },

  cancelReadingSession: () => set({ activeReadingSession: null }),
  clearReadingSummary: () => set({ lastReadingSummary: null }),

  // ---------------- Vocabulary with context (بند 13-14) ----------------
  addWordWithContext: (word, meaning, context) => {
    const w = word.trim();
    if (!w) return { status: 'added' };
    const s = get();
    const existing = s.vocabulary.vocab.find(x => x.word.toLowerCase() === w.toLowerCase());
    if (existing) {
      return { status: 'duplicate', existing };
    }
    const entry: VocabWord = {
      id: genId(), word: w, meaning: meaning.trim(), addedAt: Date.now(), nextReview: Date.now(),
      reviewCount: 0, difficulty: '', lastReviewedAt: null,
      sourceId: context?.sourceId, sourceTitle: context?.sourceTitle, page: context?.page, sentence: context?.sentence
    };
    set(st => ({ vocabulary: { vocab: [...st.vocabulary.vocab, entry] } }));
    get().save();
    get().showToast('أضفت: ' + w);
    if (s.activeReadingSession) get().bumpReadingStat('word');
    return { status: 'added' };
  },

  updateWordContext: (id, context, mode) => {
    set(st => ({
      vocabulary: {
        vocab: st.vocabulary.vocab.map(v => {
          if (v.id !== id) return v;
          if (mode === 'replace') {
            return { ...v, sourceId: context.sourceId ?? v.sourceId, sourceTitle: context.sourceTitle ?? v.sourceTitle, page: context.page ?? v.page, sentence: context.sentence ?? v.sentence };
          }
          const combinedSentence = v.sentence && context.sentence && v.sentence !== context.sentence
            ? `${v.sentence}\n---\n${context.sentence}`
            : (context.sentence ?? v.sentence);
          return { ...v, sourceId: context.sourceId ?? v.sourceId, sourceTitle: context.sourceTitle ?? v.sourceTitle, page: context.page ?? v.page, sentence: combinedSentence };
        })
      }
    }));
    get().save();
    get().showToast('تم تحديث سياق الكلمة');
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
    if (saved) get().showToast('تم استيراد البيانات!');
    else get().showToast('استُورد لكن تعذر حفظه');
    return { ok: true };
  },

  // ---------------- UI ----------------
  showToast: (msg) => set({ toast: { msg, key: Date.now() } }),
  clearToast: () => set({ toast: null })
}));

// ================= Helpers خارج الـ store (منطق مستقل يستخدم get/set) =================

/** تحديث Source Progress — مستقل تمامًا عن Plan Completion (بند 58) */
function applySourceProgressDelta(
  sourceKind: SourceKind, sourceId: string, sourceName: string, amount: number,
  set: (fn: (s: Store) => Partial<Store>) => void, get: () => Store
) {
  if (sourceKind === 'static') {
    const total = TOTALS[sourceName];
    if (!total) return;
    set(st => {
      const before = st.progressState.progress[sourceName] || 0;
      const after = Math.min(total, before + amount);
      return { progressState: { ...st.progressState, progress: { ...st.progressState.progress, [sourceName]: after } } };
    });
  } else {
    const src = get().library.customSources.find(x => x.id === sourceId);
    if (!src) return;
    const total = src.totalUnits ?? null;
    const after = Math.max(0, total != null ? Math.min(total, src.completedUnits + amount) : src.completedUnits + amount);
    get().updateSourceUnits(sourceId, after);
  }
}

/**
 * بند 19-21، 48-49 — Carryover مبني على DailyPlanInstance/PlanItem بدل الخطة
 * الثابتة. الـ id الحتمي (date + itemId) بيمنع أي تكرار حتى لو processedDays
 * اتصفّرت بغلط، وحتى لو فتح المستخدم التطبيق عشرات المرات.
 */
function processEndOfDay(dateKey: string, get: () => Store, set: (fn: (s: Store) => Partial<Store>) => void) {
  const s = get();
  if (s.dailyPlan.processedDays[dateKey]) return;

  const instance = get().ensureDailyInstance(dateKey);
  const newItems: CarryoverItem[] = [];
  const existingIds = new Set(get().carryoverState.carryover.map(c => c.id));

  instance.items.forEach(item => {
    if (item.status !== 'pending') return; // done أو skipped مش محتاجين ترحيل
    const remaining = item.targetAmount - item.completedAmount;
    if (remaining <= 0) return;

    const deterministicId = `${dateKey}_${item.id}`;
    if (existingIds.has(deterministicId)) return;

    const remainMinutes = Math.max(1, Math.round((item.estimatedMinutes * remaining) / (item.targetAmount || 1)));

    newItems.push({
      id: deterministicId, sourceName: item.sourceName, originalTaskId: item.id, fromDate: dateKey,
      episode: item.sourceKind === 'static' ? (s.progressState.progress[item.sourceName] || 0) + 1 : 0,
      remainMinutes, stoppedTime: null, url: null, type: 'listening', meta: '',
      planItemId: item.id, trackingType: item.trackingType, remainingAmount: remaining
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
