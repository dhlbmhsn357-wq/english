import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { CarryoverItem } from '../../types';
import styles from './CarryoverSection.module.css';

interface CarryoverSectionProps {
  onStart: (taskId: string, sourceName: string, episode: number, isCarryover: boolean, carryId: string) => void;
}

const VISIBLE_LIMIT = 2;

export function CarryoverSection({ onStart }: CarryoverSectionProps) {
  const carryover = useStore(s => s.carryoverState.carryover);
  const dismissCarryover = useStore(s => s.dismissCarryover);
  const [expanded, setExpanded] = useState(false);

  if (!carryover.length) return null;

  const visible = expanded ? carryover : carryover.slice(0, VISIBLE_LIMIT);
  const remaining = carryover.length - VISIBLE_LIMIT;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>⏩ متأخرات تحتاج حسم</div>
      <div className={styles.list}>
        {visible.map(item => (
          <CarryoverRow key={item.id} item={item} onStart={onStart} onDismiss={() => dismissCarryover(item.id)} />
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <button className={styles.showMore} onClick={() => setExpanded(true)}>
          عرض كل المتأخرات ({carryover.length})
        </button>
      )}
    </div>
  );
}

function CarryoverRow({ item, onStart, onDismiss }: { item: CarryoverItem; onStart: CarryoverSectionProps['onStart']; onDismiss: () => void }) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <div className={styles.source}>{item.sourceName}</div>
        <div className={styles.meta}>الحلقة {item.episode} • متبقي {item.remainMinutes} دقيقة • من {item.fromDate}</div>
      </div>
      <div className={styles.actions}>
        <button className={styles.completeBtn} onClick={() => onStart(item.originalTaskId, item.sourceName, item.episode, true, item.id)}>
          أكمل الآن
        </button>
        <button className={styles.dismissBtn} onClick={onDismiss} title="اعتبرها ملغاة" aria-label="اعتبر هذه المهمة ملغاة">
          ✕
        </button>
      </div>
    </div>
  );
}
