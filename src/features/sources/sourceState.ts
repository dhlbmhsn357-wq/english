import type { SourceState, LearningSource, CustomSourceStatus } from '../../types';
import { TOTALS, SOURCE_META, STATIC_CONTENT_TYPE } from '../../lib/staticData';
import type { ContentTypeKey } from '../../components/icons';

export function getSourceState(sourceName: string, progress: Record<string, number>, hasStopped: boolean): SourceState {
  const total = TOTALS[sourceName];
  const done = progress[sourceName] || 0;
  if (!total) return 'not-started';
  if (done >= total) return 'completed';
  if (done === 0 && !hasStopped) return 'not-started';
  if (hasStopped) return 'stopped';
  return 'in-progress';
}

export const STATE_LABELS: Record<SourceState, { label: string; color: string }> = {
  'not-started': { label: 'لم يبدأ', color: 'var(--text-faint)' },
  'in-progress': { label: 'جاري', color: 'var(--secondary)' },
  'completed': { label: 'مكتمل', color: 'var(--success)' },
  'stopped': { label: 'متوقف', color: 'var(--warning)' },
  'needs-review': { label: 'يحتاج مراجعة', color: 'var(--primary)' }
};

export const CUSTOM_STATE_LABELS: Record<CustomSourceStatus, { label: string; color: string }> = {
  'not-started': { label: 'لم يبدأ', color: 'var(--text-faint)' },
  'in-progress': { label: 'جاري', color: 'var(--secondary)' },
  'paused': { label: 'متوقف مؤقتًا', color: 'var(--warning)' },
  'completed': { label: 'مكتمل', color: 'var(--success)' },
  'archived': { label: 'مؤرشف', color: 'var(--text-faint)' }
};

/** شكل موحّد يعرضه SourceCard بغض النظر عن مصدر البيانات (ثابت أو مُضاف يدويًا) */
export interface DisplaySource {
  id: string;
  kind: 'static' | 'custom';
  title: string;
  subtitle: string;
  icon: ContentTypeKey;
  total: number | null;
  done: number;
  pct: number;
  statusLabel: string;
  statusColor: string;
  isActive: boolean;
  isCompleted: boolean;
}

export function staticToDisplay(name: string, progress: Record<string, number>, hasStopped: boolean): DisplaySource {
  const total = TOTALS[name] ?? null;
  const done = progress[name] || 0;
  const meta = SOURCE_META[name];
  const state = getSourceState(name, progress, hasStopped);
  const info = STATE_LABELS[state];
  return {
    id: name,
    kind: 'static',
    title: name,
    subtitle: meta?.presenter || meta?.group || '',
    icon: STATIC_CONTENT_TYPE[name] || 'other',
    total,
    done,
    pct: total ? Math.min(100, Math.round((done / total) * 100)) : 0,
    statusLabel: info.label,
    statusColor: info.color,
    isActive: state === 'in-progress' || state === 'stopped',
    isCompleted: state === 'completed'
  };
}

export function customToDisplay(src: LearningSource): DisplaySource {
  const info = CUSTOM_STATE_LABELS[src.status];
  const total = src.totalUnits ?? null;
  return {
    id: src.id,
    kind: 'custom',
    title: src.title,
    subtitle: src.description || TRACKING_LABEL[src.trackingType],
    icon: src.contentType,
    total,
    done: src.completedUnits,
    pct: total ? Math.min(100, Math.round((src.completedUnits / total) * 100)) : src.status === 'completed' ? 100 : 0,
    statusLabel: info.label,
    statusColor: info.color,
    isActive: src.status === 'in-progress' || src.status === 'paused',
    isCompleted: src.status === 'completed'
  };
}

export const TRACKING_LABEL: Record<LearningSource['trackingType'], string> = {
  episodes: 'حلقة', lessons: 'درس', pages: 'صفحة', chapters: 'فصل', minutes: 'دقيقة', sessions: 'جلسة', manual: 'تتبع يدوي'
};

/** صيغة الجمع لكل وحدة تتبع — لاستخدامها في تسميات "إجمالي..." بدل لصق حرفي خاطئ */
export const TRACKING_LABEL_PLURAL: Record<LearningSource['trackingType'], string> = {
  episodes: 'الحلقات', lessons: 'الدروس', pages: 'الصفحات', chapters: 'الفصول', minutes: 'الدقائق', sessions: 'الجلسات', manual: 'الوحدات'
};

export const CONTENT_TYPE_LABEL: Record<ContentTypeKey, string> = {
  listening: 'استماع', speaking: 'تحدث', video: 'مشاهدة', book: 'كتاب', course: 'دورة',
  podcast: 'بودكاست', article: 'مقال', website: 'موقع', vocabulary: 'مفردات', pdf: 'PDF', other: 'مصدر آخر'
};

export const TRACKING_SUGGESTIONS: Record<ContentTypeKey, LearningSource['trackingType'][]> = {
  listening: ['episodes', 'minutes'],
  speaking: ['sessions', 'minutes'],
  video: ['episodes', 'minutes'],
  book: ['pages', 'chapters'],
  course: ['lessons', 'chapters'],
  podcast: ['episodes', 'minutes'],
  article: ['manual'],
  website: ['manual'],
  vocabulary: ['manual'],
  pdf: ['pages'],
  other: ['manual']
};
