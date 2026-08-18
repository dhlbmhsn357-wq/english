import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { getWeekStartKey } from '../../lib/dateUtils';
import { EmptyState } from '../../components/EmptyState';
import styles from './WeeklyReviewCard.module.css';

export function WeeklyReviewCard() {
  const attendance = useStore(s => s.attendance.attendance);
  const sessions = useStore(s => s.sessions.sessions);
  const vocab = useStore(s => s.vocabulary.vocab);
  const carryover = useStore(s => s.carryoverState.carryover);

  const review = useMemo(() => {
    const weekStart = getWeekStartKey(new Date());
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const daysStudied = new Set(weekSessions.map(s => s.date)).size;
    const totalSessions = weekSessions.length;

    // أكتر مصدر اتعمل فيه progress الأسبوع ده
    const completedBySource: Record<string, number> = {};
    weekSessions.forEach(s => {
      if (s.completed) completedBySource[s.sourceId] = (completedBySource[s.sourceId] || 0) + 1;
    });
    const topSource = Object.entries(completedBySource).sort((a, b) => b[1] - a[1])[0];

    const reviewedWords = vocab.filter(w => w.lastReviewedAt && w.lastReviewedAt >= new Date(weekStart).getTime()).length;

    const suggestion = buildSuggestion(daysStudied, carryover.length);

    return { daysStudied, totalSessions, topSource, reviewedWords, suggestion, weekStart };
  }, [sessions, vocab, carryover, attendance]);

  if (review.totalSessions === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>مراجعة الأسبوع</div>
        <EmptyState title="لسه بداية الأسبوع" subtitle="اعمل أول جلسة وهتلاقي هنا ملخص أسبوعي حقيقي." />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>مراجعة الأسبوع</div>
      <ul className={styles.list}>
        <li>درست <strong>{review.daysStudied}</strong> أيام</li>
        <li>أنجزت <strong>{review.totalSessions}</strong> جلسات</li>
        {review.topSource && <li>أكملت <strong>{review.topSource[1]}</strong> حلقات في {review.topSource[0]}</li>}
        {review.reviewedWords > 0 && <li>راجعت <strong>{review.reviewedWords}</strong> كلمة</li>}
        {carryover.length > 0 && <li>لديك <strong>{carryover.length}</strong> {carryover.length === 1 ? 'مهمة متأخرة' : 'مهام متأخرة'}</li>}
      </ul>
      <div className={styles.suggestionBox}>
        <div className={styles.suggestionLabel}>اقتراح الأسبوع القادم</div>
        <div className={styles.suggestionText}>{review.suggestion}</div>
      </div>
    </div>
  );
}

// منطق Rule-based بسيط (بند 8 — مفيش AI خارجي)
function buildSuggestion(daysStudied: number, carryoverCount: number): string {
  if (carryoverCount >= 3) {
    return 'المتأخرات بدأت تزيد. اجعل أول جلسة في اليوم للمتأخرات قبل أي حاجة تانية.';
  }
  if (daysStudied >= 5) {
    return 'معدل التزام ممتاز! حافظ على نفس الوتيرة، وحاول تزود جلسة مراجعة كلمات إضافية.';
  }
  if (daysStudied >= 3) {
    return 'معدل الالتزام جيد. حاول تضيف يوم أو يومين إضافيين الأسبوع الجاي لو قدرت.';
  }
  if (daysStudied > 0) {
    return 'بداية كويسة. جرب تحدد وقت ثابت كل يوم عشان الاستمرارية تبقى أسهل.';
  }
  return 'ابدأ بخطوة صغيرة كل يوم — حتى لو 15 دقيقة، الاستمرارية أهم من الكمية.';
}
