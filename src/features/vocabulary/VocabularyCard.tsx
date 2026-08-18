import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { VocabCapture } from './VocabCapture';
import { VocabStats } from './VocabStats';
import { VocabReviewSheet } from './VocabReviewSheet';
import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
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
        <span className={styles.title}><ContentTypeIcons.vocabulary size={15} strokeWidth={2} /> كلمات الأسبوع</span>
        <span className={styles.count}>{vocab.length} كلمة</span>
      </div>

      <VocabCapture />
      <VocabStats />

      <div className={styles.actionsRow}>
        <Button variant="secondary" size="sm" icon={ActionIcons.book} disabled={dueCount === 0} onClick={() => openReview('due')} full>
          راجع المستحقة {dueCount > 0 ? `(${dueCount})` : ''}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openReview('all')} full>راجع الكل</Button>
      </div>

      <VocabReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} mode={reviewMode} />
    </div>
  );
}
