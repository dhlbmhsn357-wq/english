// ============================================================
// Task Engine — بناء مهام أي يوم بمعزل عن "اليوم الحالي"
// (أساسي عشان Carryover يحسب أيام سابقة صح)
// ============================================================
import type { TaskDef, ProgressState } from '../types';
import { PHASE1, PHASE2, PHASE3, SOURCES_MAP, ZAD_ORDER, TOTALS } from './staticData';
import { getDayOfWeek, todayKey } from './dateUtils';

export function getCurrentZadSubject(progress: Record<string, number>): string | null {
  for (const subj of ZAD_ORDER) {
    const name = 'Zad: ' + subj;
    const total = TOTALS[name] || 0;
    const done = progress[name] || 0;
    if (done < total) return subj;
  }
  return null;
}

export function getTasks(
  mode: 'busy' | 'free' | null,
  date: string | undefined,
  islamicPhase: 1 | 2 | 3,
  progress: Record<string, number>
): TaskDef[] {
  const dateKey = date || todayKey();
  const d = getDayOfWeek(dateKey);
  const isFri = d === 5;
  const isVocabDay = d === 1 || d === 4;
  const isEnglishDay = d === 2 || d === 6;
  const tasks: TaskDef[] = [];

  const pool = islamicPhase === 1 ? PHASE1 : islamicPhase === 2 ? PHASE2 : PHASE3;
  const islamicName = pool[d % pool.length];
  tasks.push({ id: 'islamic', type: 'listening', name: islamicName, meta: 'وقت الأكل أو الراحة' });

  if (!isFri) {
    const subj = getCurrentZadSubject(progress);
    if (subj) tasks.push({ id: 'zad', type: 'zad', name: 'Zad: ' + subj, meta: '45-50 دقيقة • سماع + مراجعة' });
  }

  if (mode === 'busy') return tasks;

  if (isVocabDay) {
    tasks.push({
      id: 'vocab', type: 'vocab', name: 'إبراهيم عادل — مفردات', meta: '45 دقيقة • تركيز كامل',
      url: SOURCES_MAP['إبراهيم عادل — مفردات'] || null
    });
  }
  if (isEnglishDay) {
    const en = d === 2 ? 'Listening Time Podcast' : 'Speak English With Class';
    tasks.push({ id: 'english', type: 'listening', name: en, meta: '20-28 دقيقة' });
  }
  return tasks;
}

export function getNextEpisodeNumber(sourceName: string, progress: Record<string, number>): number {
  return (progress[sourceName] || 0) + 1;
}

export function getNextEpisodeLabel(sourceName: string, progress: ProgressState['progress']): { next: number; total: number } | null {
  const total = TOTALS[sourceName];
  if (!total) return null;
  const done = Math.min(progress[sourceName] || 0, total);
  if (done >= total) return null;
  return { next: done + 1, total };
}
