import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { trackingUnitLabel } from '../../lib/planEngine';
import { STATIC_CONTENT_TYPE } from '../../lib/staticData';
import type { PlanItem } from '../../types';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  item: PlanItem;
  onStart: () => void;
}

const PRIORITY_LABEL: Record<PlanItem['priority'], string> = { primary: 'أساسي', secondary: 'ثانوي', optional: 'إضافي' };

export function TaskCard({ item, onStart }: TaskCardProps) {
  const isDone = item.status === 'done';
  const Icon = item.sourceKind === 'static' ? ContentTypeIcons[STATIC_CONTENT_TYPE[item.sourceName] || 'other'] : ContentTypeIcons.other;
  const unit = trackingUnitLabel(item.trackingType);

  return (
    <div className={`${styles.card} ${styles[item.priority]} ${isDone ? styles.done : ''} anim-fade-slide-in`}>
      <span className={styles.iconWrap}><Icon size={16} strokeWidth={1.8} /></span>
      <div className={styles.left}>
        <div className={styles.typeLabel}>{PRIORITY_LABEL[item.priority]}</div>
        <div className={styles.name}>{item.sourceName}</div>
        <div className={styles.meta}>
          {item.targetAmount} {unit}
          {item.estimatedMinutes ? ` • ${item.estimatedMinutes} دقيقة` : ''}
        </div>
      </div>
      <div className={styles.right}>
        {isDone ? (
          <div className={styles.doneBadge}><ActionIcons.complete size={16} strokeWidth={2.4} /></div>
        ) : (
          <Button variant="secondary" size="sm" onClick={onStart} aria-label={`ابدأ ${item.sourceName}`}>ابدأ</Button>
        )}
      </div>
    </div>
  );
}
