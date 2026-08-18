import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import styles from './VocabStats.module.css';

export function VocabStats() {
  const vocab = useStore(s => s.vocabulary.vocab);

  const stats = useMemo(() => {
    const now = Date.now();
    const newWords = vocab.filter(w => w.reviewCount === 0).length;
    const due = vocab.filter(w => now >= w.nextReview).length;
    const mastered = vocab.filter(w => w.difficulty === 'easy' && w.reviewCount >= 2).length;
    return { newWords, due, mastered };
  }, [vocab]);

  return (
    <div className={styles.row}>
      <StatChip num={stats.newWords} label="جديدة" />
      <StatChip num={stats.due} label="مستحقة اليوم" highlight={stats.due > 0} />
      <StatChip num={stats.mastered} label="محفوظة" />
    </div>
  );
}

function StatChip({ num, label, highlight }: { num: number; label: string; highlight?: boolean }) {
  return (
    <div className={`${styles.chip} ${highlight ? styles.highlight : ''}`}>
      <div className={styles.num}>{num}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
