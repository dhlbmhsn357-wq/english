import { useStore } from '../../store/useStore';
import { formatMinutes } from '../../lib/utils';
import { NotesIcon, ActionIcons } from '../../components/icons';
import type { DailyPlanInstance, PlanItem } from '../../types';
import styles from './DailyPlanSummary.module.css';

interface DailyPlanSummaryProps {
  instance: DailyPlanInstance;
  visibleItems: PlanItem[];
}

/** بند 29-30 — Capacity Indicator: مقارنة وقت الخطة بالوقت المتاح، بدون منع المستخدم */
export function DailyPlanSummary({ instance, visibleItems }: DailyPlanSummaryProps) {
  const carryover = useStore(s => s.carryoverState.carryover);

  const remaining = visibleItems.filter(i => i.status === 'pending');
  const plannedMinutes = visibleItems.filter(i => i.status !== 'skipped').reduce((s, i) => s + i.estimatedMinutes, 0);
  const available = instance.availableMinutes;

  if (remaining.length === 0 && carryover.length === 0 && plannedMinutes === 0) return null;

  const over = available > 0 && plannedMinutes > available;
  const pct = available > 0 ? Math.min(100, Math.round((plannedMinutes / available) * 100)) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.item}><NotesIcon size={13} strokeWidth={2} /> {remaining.length} {remaining.length === 1 ? 'مهمة' : 'مهام'}</span>
        {plannedMinutes > 0 && <span className={styles.item}><ActionIcons.carryover size={13} strokeWidth={2} /> {formatMinutes(plannedMinutes)}</span>}
        {carryover.length > 0 && <span className={styles.itemWarn}>{carryover.length} متأخرة</span>}
      </div>

      {available > 0 && (
        <>
          <div className={styles.capacityTrack}>
            <div className={`${styles.capacityFill} ${over ? styles.capacityOver : ''}`} style={{ width: `${pct}%` }} />
          </div>
          {over ? (
            <div className={styles.warnText}>الخطة تتجاوز وقتك بـ{plannedMinutes - available} دقيقة</div>
          ) : (
            <div className={styles.capacityText}>{plannedMinutes} / {available} دقيقة</div>
          )}
        </>
      )}
    </div>
  );
}
