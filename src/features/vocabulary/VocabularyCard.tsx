import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { VocabCapture } from './VocabCapture';
import { VocabStats } from './VocabStats';
import { VocabReviewSheet } from './VocabReviewSheet';
import styles from './VocabularyCard.module.css';

export function VocabularyCard() {
  const vocab = useStore(s => s.vocabulary.vocab);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<'due' | 'all'>('due');

  const dueCount = vocab.filter(w => Date.now() >= w.nextReview).length;

  function openReview(mode: 'due' | 'all') {
    setReviewMode(mode);
    setReviewOpen(true);
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <span className={styles.title}>📝 كلمات الأسبوع</span>
        <span className={styles.count}>{vocab.length} كلمة</span>
      </div>

      <VocabCapture />
      <VocabStats />

      <div className={styles.actionsRow}>
        <button className={styles.primaryAction} disabled={dueCount === 0} onClick={() => openReview('due')}>
          🧠 راجع المستحقة {dueCount > 0 ? `(${dueCount})` : ''}
        </button>
        <button className={styles.secondaryAction} onClick={() => openReview('all')}>
          📖 راجع الكل
        </button>
      </div>

      <VocabReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} mode={reviewMode} />
    </div>
  );
}
