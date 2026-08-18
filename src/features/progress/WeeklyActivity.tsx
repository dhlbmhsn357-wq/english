import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { getLocalDateKey } from '../../lib/dateUtils';
import styles from './WeeklyActivity.module.css';

const DAY_LABELS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/** آخر 7 أيام فقط — عدد الجلسات في اليوم، بدون Charts معقّدة */
export function WeeklyActivity() {
  const sessions = useStore(s => s.sessions.sessions);

  const days = useMemo(() => {
    const today = new Date();
    const list: { key: string; label: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const count = sessions.filter(s => s.date === key).length;
      list.push({ key, label: DAY_LABELS[d.getDay()], count, isToday: i === 0 });
    }
    return list;
  }, [sessions]);

  const max = Math.max(1, ...days.map(d => d.count));

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>هذا الأسبوع</div>
      <div className={styles.bars}>
        {days.map(d => (
          <div key={d.key} className={styles.col}>
            <div className={styles.track}>
              <div
                className={`${styles.bar} ${d.isToday ? styles.today : ''}`}
                style={{ height: `${d.count === 0 ? 3 : Math.max(10, (d.count / max) * 100)}%` }}
              />
            </div>
            <span className={styles.label}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
