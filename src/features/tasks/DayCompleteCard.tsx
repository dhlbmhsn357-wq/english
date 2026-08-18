import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { todayKey } from '../../lib/dateUtils';
import styles from './DayCompleteCard.module.css';

export function DayCompleteCard() {
  const sessions = useStore(s => s.sessions.sessions);
  const t = todayKey();

  const todaySessions = useMemo(() => sessions.filter(s => s.date === t), [sessions, t]);
  const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const bestNote = [...todaySessions].reverse().find(s => s.note)?.note;

  if (todaySessions.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.emoji}>🎉</div>
      <div className={styles.title}>أنهيت خطة اليوم</div>
      <div className={styles.stats}>
        <span>{todaySessions.length} جلسات</span>
        {totalMinutes > 0 && <span>{totalMinutes} دقيقة</span>}
      </div>
      {bestNote && <div className={styles.note}>"{bestNote}"</div>}
    </div>
  );
}
