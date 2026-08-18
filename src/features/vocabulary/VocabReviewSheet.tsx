import { useState, useMemo } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { useStore } from '../../store/useStore';
import type { Difficulty } from '../../types';
import styles from './VocabReviewSheet.module.css';

interface VocabReviewSheetProps {
  open: boolean;
  onClose: () => void;
  mode: 'due' | 'all';
}

export function VocabReviewSheet({ open, onClose, mode }: VocabReviewSheetProps) {
  const vocab = useStore(s => s.vocabulary.vocab);
  const reviewWord = useStore(s => s.reviewWord);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ easy: 0, mid: 0, hard: 0 });

  const words = useMemo(() => {
    const now = Date.now();
    const pool = mode === 'due' ? vocab.filter(w => now >= w.nextReview) : vocab;
    // نرتبها مرة واحدة بس وقت الفتح (مش على كل render) — نستخدم seed ثابت بسيط
    return mode === 'all' ? [...pool].sort(() => Math.random() - 0.5) : pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  if (words.length === 0) {
    return (
      <BottomSheet open={open} onClose={onClose} title="مراجعة المفردات">
        <EmptyState icon="🌤️" title="لا توجد كلمات للمراجعة اليوم" subtitle="ارجع بكرة أو راجع كل الكلمات." />
      </BottomSheet>
    );
  }

  if (index >= words.length) {
    return (
      <BottomSheet open={open} onClose={handleClose} title="خلصت المراجعة">
        <div className={styles.finishBox}>
          <div className={styles.finishIcon}>🎉</div>
          <div className={styles.finishText}>سهلة: {results.easy} · متوسطة: {results.mid} · صعبة: {results.hard}</div>
          <button className={styles.doneBtn} onClick={handleClose}>تمام</button>
        </div>
      </BottomSheet>
    );
  }

  const current = words[index];

  function handleAnswer(diff: Difficulty) {
    reviewWord(current.id, diff);
    setResults(r => ({ ...r, [diff]: r[diff] + 1 }));
    setRevealed(false);
    setIndex(i => i + 1);
  }

  function handleClose() {
    setIndex(0); setRevealed(false); setResults({ easy: 0, mid: 0, hard: 0 });
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`مراجعة (${index + 1}/${words.length})`}>
      <div className={styles.reviewBox}>
        <div className={styles.word}>{current.word}</div>
        {!revealed ? (
          <button className={styles.revealBtn} onClick={() => setRevealed(true)}>👁 اعرض المعنى</button>
        ) : (
          <div className={styles.meaning}>{current.meaning || '(مفيش معنى مسجّل)'}</div>
        )}
        <div className={styles.diffLabel}>صعوبة الكلمة؟</div>
        <div className={styles.diffRow}>
          <button className={styles.diffEasy} onClick={() => handleAnswer('easy')}>😊 سهلة</button>
          <button className={styles.diffMid} onClick={() => handleAnswer('mid')}>🤔 متوسطة</button>
          <button className={styles.diffHard} onClick={() => handleAnswer('hard')}>😓 صعبة</button>
        </div>
      </div>
    </BottomSheet>
  );
}
