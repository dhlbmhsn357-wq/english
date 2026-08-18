import { useStore } from '../../store/useStore';
import { trackingUnitLabel } from '../../lib/planEngine';
import { todayKey } from '../../lib/dateUtils';
import { ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import type { PlanItem } from '../../types';
import styles from './NextActionCard.module.css';

interface NextActionCardProps {
  visibleItems: PlanItem[];
  onStart: (date: string, itemId: string, isCarryover: boolean, carryId?: string) => void;
}

/** بند 42 — Next Action: 1) Carryover العاجل 2) خطة اليوم حسب ترتيب المستخدم */
export function NextActionCard({ visibleItems, onStart }: NextActionCardProps) {
  const carryover = useStore(s => s.carryoverState.carryover);
  const t = todayKey();

  if (carryover.length > 0) {
    const c = carryover[0];
    const unit = c.trackingType ? trackingUnitLabel(c.trackingType) : 'دقيقة';
    return (
      <div className={`${styles.card} ${styles.carryVariant} anim-fade-slide-in`}>
        <div className={styles.label}><ActionIcons.carryover size={13} strokeWidth={2} /> التالي الآن — متأخرة</div>
        <div className={styles.name}>{c.sourceName}</div>
        <div className={styles.meta}>متبقي {c.remainingAmount ?? c.remainMinutes} {c.remainingAmount ? unit : 'دقيقة'} • من {c.fromDate}</div>
        <Button variant="primary" full icon={ActionIcons.start} onClick={() => onStart(c.fromDate, c.originalTaskId, true, c.id)}>
          ابدأ الآن
        </Button>
      </div>
    );
  }

  const nextItem = visibleItems.slice().sort((a, b) => a.order - b.order).find(i => i.status === 'pending');
  if (!nextItem) return null;

  return (
    <div className={`${styles.card} anim-fade-slide-in`}>
      <div className={styles.label}><ActionIcons.trophy size={13} strokeWidth={2} /> التالي الآن</div>
      <div className={styles.name}>{nextItem.sourceName}</div>
      <div className={styles.metaRow}>
        <span className={styles.metaChip}>{nextItem.targetAmount} {trackingUnitLabel(nextItem.trackingType)}</span>
        {nextItem.estimatedMinutes > 0 && <span className={styles.metaChip}>{nextItem.estimatedMinutes} دقيقة</span>}
      </div>

      <Button variant="primary" full icon={ActionIcons.start} onClick={() => onStart(t, nextItem.id, false)}>
        ابدأ الجلسة
      </Button>
    </div>
  );
}
