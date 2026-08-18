import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { getWeekStartKey } from '../../lib/dateUtils';
import { TOTALS } from '../../lib/staticData';
import styles from './ProgressOverview.module.css';

export function ProgressOverview() {
  const attendance = useStore(s => s.attendance.attendance);
  const sessions = useStore(s => s.sessions.sessions);
  const progress = useStore(s => s.progressState.progress);

  const stats = useMemo(() => {
    const weekStart = getWeekStartKey(new Date());
    const sessionsThisWeek = sessions.filter(s => s.date >= weekStart);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const completedSources = Object.entries(TOTALS).filter(([name, total]) => (progress[name] || 0) >= total).length;

    return {
      totalDays: attendance.length,
      sessionsThisWeek: sessionsThisWeek.length,
      totalMinutes,
      completedSources
    };
  }, [attendance, sessions, progress]);

  return (
    <div className={styles.grid}>
      <StatBox num={stats.totalDays} label="أيام الالتزام" />
      <StatBox num={stats.sessionsThisWeek} label="جلسات الأسبوع" />
      <StatBox num={stats.totalMinutes} label="إجمالي الدقائق" />
      <StatBox num={stats.completedSources} label="مصادر مكتملة" />
    </div>
  );
}

function StatBox({ num, label }: { num: number; label: string }) {
  return (
    <div className={styles.box}>
      <div className={styles.num}>{num}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
