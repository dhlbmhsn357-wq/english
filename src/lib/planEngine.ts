// ============================================================
// Plan Engine — منطق خالص (pure) لبناء وحساب الخطة المرنة.
// الخطة الثابتة القديمة (taskEngine.ts) اتحولت لمجرد Seed أولي
// لأول Template — من هنا فصاعدًا كل حاجة بتيجي من WeeklyPlanTemplate.
// ============================================================
import type {
  WeeklyPlanTemplate, DayTemplate, DailyPlanInstance, PlanItem, PlanItemTemplate,
  WeekDayIndex, TrackingType, SourcePriority
} from '../types';
import { getDayOfWeek } from './dateUtils';
import { genId } from './utils';
import { PHASE1, PHASE2, PHASE3, SOURCES_MAP, ZAD_ORDER, TOTALS, DURATIONS } from './staticData';

export const DAY_LABELS_SAT_FIRST: { index: WeekDayIndex; label: string }[] = [
  { index: 6, label: 'السبت' },
  { index: 0, label: 'الأحد' },
  { index: 1, label: 'الإثنين' },
  { index: 2, label: 'الثلاثاء' },
  { index: 3, label: 'الأربعاء' },
  { index: 4, label: 'الخميس' },
  { index: 5, label: 'الجمعة' }
];

export function dayLabel(day: WeekDayIndex): string {
  return DAY_LABELS_SAT_FIRST.find(d => d.index === day)?.label || '';
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function windowsDuration(windows: { start: string; end: string }[]): number {
  return windows.reduce((sum, w) => {
    const mins = timeToMinutes(w.end) - timeToMinutes(w.start);
    return sum + Math.max(0, mins);
  }, 0);
}

export function computeAvailableMinutes(day: DayTemplate): number {
  if (day.mode === 'rest' || !day.enabled) return 0;
  if (day.mode === 'duration') return day.durationMinutes || 0;
  return windowsDuration(day.windows);
}

function emptyDay(day: WeekDayIndex): DayTemplate {
  return { day, enabled: false, mode: 'rest', windows: [], items: [] };
}

/** Template فاضي بالكامل — نقطة بداية لمستخدم جديد يفضّل يبني خطته من الصفر */
export function blankTemplate(): WeeklyPlanTemplate {
  const now = Date.now();
  return {
    id: genId(),
    version: 1,
    days: [0, 1, 2, 3, 4, 5, 6].map(d => emptyDay(d as WeekDayIndex)),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Migration من الخطة الثابتة القديمة (بند 69) — بتبني Template بيعيد إنتاج
 * نفس السلوك بالظبط (تناوب إسلامي، زاد غير الجمعة، مفردات الإثنين/الخميس،
 * إنجليزي الثلاثاء/السبت) عشان المستخدم الحالي محسّش بأي فرق يوم الترحيل،
 * لكن من هنا فصاعدًا كل حاجة قابلة للتعديل بالكامل من الـ Weekly Planner.
 */
export function seedTemplateFromLegacySchedule(islamicPhase: 1 | 2 | 3): WeeklyPlanTemplate {
  const now = Date.now();
  const pool = islamicPhase === 1 ? PHASE1 : islamicPhase === 2 ? PHASE2 : PHASE3;
  const days: DayTemplate[] = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const dow = d as WeekDayIndex;
    const isFri = dow === 5;
    const isVocabDay = dow === 1 || dow === 4;
    const isEnglishDay = dow === 2 || dow === 6;
    const items: PlanItemTemplate[] = [];
    let order = 0;

    const islamicName = pool[dow % pool.length];
    items.push(mkTemplateItem(islamicName, 'episodes', 1, DURATIONS[islamicName] || 45, 'primary', order++));

    if (!isFri) {
      const subj = ZAD_ORDER.find(s => (TOTALS['Zad: ' + s] || 0) > 0) || ZAD_ORDER[0];
      const zadName = 'Zad: ' + subj;
      items.push(mkTemplateItem(zadName, 'episodes', 1, DURATIONS[zadName] || 45, 'primary', order++));
    }

    if (isVocabDay) {
      items.push(mkTemplateItem('إبراهيم عادل — مفردات', 'minutes', 45, 45, 'secondary', order++));
    }
    if (isEnglishDay) {
      const en = dow === 2 ? 'Listening Time Podcast' : 'Speak English With Class';
      items.push(mkTemplateItem(en, 'episodes', 1, DURATIONS[en] || 25, 'secondary', order++));
    }

    return {
      day: dow,
      enabled: items.length > 0,
      mode: 'duration',
      windows: [],
      durationMinutes: items.reduce((s, it) => s + it.estimatedMinutes, 0),
      items
    };
  });

  return { id: genId(), version: 1, days, createdAt: now, updatedAt: now };
}

function mkTemplateItem(sourceName: string, trackingType: TrackingType, targetAmount: number, estimatedMinutes: number, priority: SourcePriority, order: number): PlanItemTemplate {
  return {
    id: genId(), sourceId: sourceName, sourceKind: 'static', sourceName,
    trackingType, targetAmount, estimatedMinutes, priority, order
  };
}

/** يبني PlanItem فعلي من عنصر Template — Snapshot مستقل تمامًا */
function materializeItem(tpl: PlanItemTemplate, date: string): PlanItem {
  return {
    id: genId(),
    date,
    sourceId: tpl.sourceId,
    sourceKind: tpl.sourceKind,
    sourceName: tpl.sourceName,
    trackingType: tpl.trackingType,
    targetAmount: tpl.targetAmount,
    completedAmount: 0,
    estimatedMinutes: tpl.estimatedMinutes,
    order: tpl.order,
    status: 'pending',
    priority: tpl.priority,
    templateItemId: tpl.id
  };
}

/** بند 38 — لقطة مستقلة ليوم بتاريخ معيّن، من غير أي اعتماد لاحق على الـ Template */
export function materializeInstance(template: WeeklyPlanTemplate, date: string): DailyPlanInstance {
  const dow = getDayOfWeek(date) as WeekDayIndex;
  const dayTpl = template.days.find(d => d.day === dow) || emptyDay(dow);
  return {
    date,
    templateVersion: template.version,
    mode: dayTpl.mode,
    windows: dayTpl.windows,
    durationMinutes: dayTpl.durationMinutes,
    availableMinutes: computeAvailableMinutes(dayTpl),
    items: dayTpl.items.slice().sort((a, b) => a.order - b.order).map(tpl => materializeItem(tpl, date)),
    createdAt: Date.now()
  };
}

export function instancePlannedMinutes(instance: DailyPlanInstance): number {
  return instance.items.filter(i => i.status !== 'skipped').reduce((s, i) => s + i.estimatedMinutes, 0);
}

export function trackingUnitLabel(t: TrackingType): string {
  const map: Record<TrackingType, string> = {
    episodes: 'حلقة', lessons: 'درس', pages: 'صفحة', chapters: 'فصل', minutes: 'دقيقة', sessions: 'جلسة', manual: 'وحدة'
  };
  return map[t];
}

/** توزيع مبلغ على أجزاء متساوية تقريبًا (للـ Split — بند 25) */
export function splitAmount(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

export const SOURCES_MAP_REF = SOURCES_MAP; // إعادة تصدير للاستخدام في مكونات الخطة
