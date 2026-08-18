import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui/Button';
import { ActionIcons } from '../../components/icons';
import { PHASE_SOURCES, TOTALS } from '../../lib/staticData';
import styles from './PhaseCompleteModal.module.css';

export function PhaseCompleteModal() {
  const phaseModal = useStore(s => s.phaseModal);
  const progress = useStore(s => s.progressState.progress);
  const sessions = useStore(s => s.sessions.sessions);
  const advancePhase = useStore(s => s.advancePhase);
  const closePhaseModal = useStore(s => s.closePhaseModal);

  const completedSources = PHASE_SOURCES[phaseModal.phase] || [];

  const stats = useMemo(() => {
    const totalEpisodes = completedSources.reduce((sum, name) => sum + (TOTALS[name] || 0), 0);
    const totalMinutes = sessions
      .filter(s => completedSources.includes(s.sourceId) && s.completed)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return { totalEpisodes, hours: Math.round(totalMinutes / 60) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, phaseModal.phase]);

  if (!phaseModal.open) return null;

  if (phaseModal.allComplete) {
    return (
      <Modal open={phaseModal.open} onClose={closePhaseModal}>
        <div className={styles.iconWrap}><ActionIcons.award size={40} strokeWidth={1.6} /></div>
        <div className={styles.title}>ماشاء الله!</div>
        <div className={styles.subtitle}>أتممت كل المراحل الإسلامية المحددة في المسار.</div>
        <div className={styles.statsRow}>
          <Stat num={Object.keys(progress).filter(n => (progress[n] || 0) >= (TOTALS[n] || Infinity)).length} label="مصدر مكتمل" />
        </div>
        <Button variant="primary" full onClick={closePhaseModal}>تمام</Button>
      </Modal>
    );
  }

  const nextPhase = phaseModal.phase + 1;
  const nextSources = PHASE_SOURCES[nextPhase] || [];

  return (
    <Modal open={phaseModal.open} onClose={closePhaseModal}>
      <div className={styles.iconWrap}><ActionIcons.celebrate size={40} strokeWidth={1.6} /></div>
      <div className={styles.title}>خلّصت المرحلة {phaseModal.phase}!</div>
      <div className={styles.subtitle}>{completedSources.join(' + ')}</div>

      <div className={styles.statsRow}>
        <Stat num={completedSources.length} label="مصدر" />
        <Stat num={stats.totalEpisodes} label="حلقة" />
        {stats.hours > 0 && <Stat num={stats.hours} label="ساعة" />}
      </div>

      <div className={styles.nextBox}>
        <div className={styles.nextLabel}>جاهز تنتقل للمرحلة {nextPhase}؟</div>
        <div className={styles.nextSources}>{nextSources.join(' + ')}</div>
      </div>

      <div className={styles.btnRow}>
        <Button variant="secondary" full onClick={closePhaseModal}>لسه بكمّل</Button>
        <Button variant="primary" full onClick={advancePhase}>انتقل</Button>
      </div>
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
