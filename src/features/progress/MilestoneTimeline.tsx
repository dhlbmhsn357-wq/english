import { ActionIcons } from '../../components/icons';
import styles from './MilestoneTimeline.module.css';

interface MilestoneTimelineProps {
  done: number;
  total: number;
  unitLabel: string; // "حلقة" / "صفحة" ...
}

/** خط زمني بصري خفيف — بدل رقم 7/25 المجرّد، المستخدم يشوف موقعه على المسار */
export function MilestoneTimeline({ done, total, unitLabel }: MilestoneTimelineProps) {
  if (!total || total <= 0) return null;
  const pct = Math.min(100, Math.max(0, (done / total) * 100));
  const checkpoints = [0, 25, 50, 75, 100];

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
        {checkpoints.map(cp => {
          const reached = pct >= cp;
          const unitAtCp = Math.round((cp / 100) * total);
          return (
            <div key={cp} className={styles.point} style={{ insetInlineStart: `${cp}%` }}>
              <span className={`${styles.dot} ${reached ? styles.dotReached : ''}`}>
                {cp === 100 && reached && <ActionIcons.complete size={9} strokeWidth={3} />}
              </span>
              <span className={styles.pointLabel}>{cp === 0 ? 'بدأت' : cp === 100 ? 'اكتمل' : unitAtCp}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.caption}>{done} من {total} {unitLabel}</div>
    </div>
  );
}
