import type { SourceState } from '../../types';
import { TOTALS } from '../../lib/staticData';

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
  'in-progress': { label: 'جاري', color: 'var(--teal)' },
  'completed': { label: 'مكتمل', color: 'var(--green)' },
  'stopped': { label: 'متوقف', color: 'var(--orange)' },
  'needs-review': { label: 'يحتاج مراجعة', color: 'var(--gold)' }
};
