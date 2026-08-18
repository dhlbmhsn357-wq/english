import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui/Button';
import { ActionIcons } from '../../components/icons';
import { useStore } from '../../store/useStore';
import styles from './SessionSummarySheet.module.css';

/** بند 5 — ملخص جلسة القراءة بعد الإنهاء */
export function SessionSummarySheet() {
  const summary = useStore(s => s.lastReadingSummary);
  const clearReadingSummary = useStore(s => s.clearReadingSummary);

  if (!summary) return null;

  return (
    <Modal open={!!summary} onClose={clearReadingSummary}>
      <div className={styles.iconWrap}><ActionIcons.book size={32} strokeWidth={1.6} /></div>
      <div className={styles.title}>ملخص الجلسة</div>
      <div className={styles.statsGrid}>
        <Stat num={summary.pagesRead || 0} label="صفحة" />
        <Stat num={summary.durationMinutes || 0} label="دقيقة" />
        <Stat num={summary.wordsSaved || 0} label="كلمة جديدة" />
        <Stat num={summary.highlightsAdded || 0} label="Highlight" />
      </div>
      <Button variant="primary" full onClick={clearReadingSummary}>تمام</Button>
    </Modal>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statNum}>{num}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
