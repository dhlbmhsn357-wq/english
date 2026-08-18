import { TOTALS, DURATIONS, STATIC_CONTENT_TYPE } from '../../lib/staticData';
import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import styles from './SourceProgressCard.module.css';

interface SourceProgressCardProps {
  sourceName: string;
  done: number;
  onEdit: (value: number) => void;
}

export function SourceProgressCard({ sourceName, done, onEdit }: SourceProgressCardProps) {
  const total = TOTALS[sourceName];
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isComplete = total ? done >= total : false;
  const Icon = ContentTypeIcons[STATIC_CONTENT_TYPE[sourceName] || 'other'];

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <span className={styles.iconWrap}><Icon size={16} strokeWidth={1.8} /></span>
        <div className={styles.name}>{sourceName}</div>
        <div className={styles.count}>{done}/{total} <span className={styles.pct}>({pct}%)</span></div>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: isComplete ? 'var(--success)' : 'var(--primary)' }} />
      </div>
      <div className={styles.footerRow}>
        {isComplete ? (
          <span className={styles.completeLabel}><ActionIcons.completeFilled size={13} strokeWidth={2} /> اكتمل</span>
        ) : (
          <span className={styles.nextLabel}>التالي: الحلقة {done + 1}{DURATIONS[sourceName] ? ` • ${DURATIONS[sourceName]} دقيقة` : ''}</span>
        )}
        <EditControl total={total} done={done} onEdit={onEdit} />
      </div>
    </div>
  );
}

function EditControl({ total, done, onEdit }: { total: number; done: number; onEdit: (v: number) => void }) {
  return (
    <div className={styles.editRow}>
      <input
        type="number"
        min={0}
        max={total}
        defaultValue={done}
        className={styles.editInput}
        aria-label="رقم الحلقة"
        onBlur={e => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onEdit(v);
        }}
      />
    </div>
  );
}
