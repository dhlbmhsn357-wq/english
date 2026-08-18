import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import styles from './WeeklyWinCard.module.css';

export function WeeklyWinCard() {
  const weeklyWin = useStore(s => s.wins.weeklyWin);
  const wins = useStore(s => s.wins.wins);
  const saveWin = useStore(s => s.saveWin);
  const refreshWeeklyWinField = useStore(s => s.refreshWeeklyWinField);
  const [text, setText] = useState(weeklyWin);

  useEffect(() => { refreshWeeklyWinField(); }, [refreshWeeklyWinField]);
  useEffect(() => { setText(weeklyWin); }, [weeklyWin]);

  const history = [...wins].reverse().slice(0, 5);

  return (
    <div className={styles.card}>
      <div className={styles.title}><ActionIcons.trophy size={15} strokeWidth={2} /> إيه أحسن حاجة تعلمتها؟</div>
      <textarea
        className={styles.textarea}
        placeholder="مثلاً: فهمت محاضرة كاملة بدون ترجمة..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button variant="primary" size="sm" full onClick={() => saveWin(text)}>احفظ</Button>

      {history.length > 0 && (
        <div className={styles.history}>
          <div className={styles.historyLabel}><ActionIcons.book size={13} strokeWidth={2} /> مكاسب سابقة</div>
          {history.map((w, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={styles.historyText}>{w.text}</div>
              <div className={styles.historyDate}>{w.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
