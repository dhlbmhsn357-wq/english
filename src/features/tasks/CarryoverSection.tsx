import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
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
      <div className={styles.title}><ActionIcons.carryover size={14} strokeWidth={2} /> متأخرات تحتاج حسم</div>
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
        <Button variant="secondary" size="sm" onClick={() => onStart(item.originalTaskId, item.sourceName, item.episode, true, item.id)}>
          أكمل الآن
        </Button>
        <IconButton icon={ActionIcons.close} size="sm" label="اعتبر هذه المهمة ملغاة" onClick={onDismiss} />
      </div>
    </div>
  );
}
