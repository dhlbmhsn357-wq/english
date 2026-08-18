import { useStore } from '../../store/useStore';
import { Modal } from '../../components/Modal';
import { PHASE_SOURCES } from '../../lib/staticData';
import styles from './PhaseCompleteModal.module.css';

export function PhaseCompleteModal() {
  const phaseModal = useStore(s => s.phaseModal);
  const advancePhase = useStore(s => s.advancePhase);
  const closePhaseModal = useStore(s => s.closePhaseModal);

  if (!phaseModal.open) return null;

  if (phaseModal.allComplete) {
    return (
      <Modal open={phaseModal.open} onClose={closePhaseModal}>
        <div className={styles.emoji}>🎉</div>
        <div className={styles.title}>ماشاء الله!</div>
        <div className={styles.subtitle}>أتممت كل المراحل الإسلامية المحددة في المسار. 🌟</div>
        <button className={styles.confirmBtn} onClick={closePhaseModal}>تمام</button>
      </Modal>
    );
  }

  const nextPhase = phaseModal.phase + 1;
  const nextSources = PHASE_SOURCES[nextPhase] || [];

  return (
    <Modal open={phaseModal.open} onClose={closePhaseModal}>
      <div className={styles.emoji}>🎉</div>
      <div className={styles.title}>خلّصت المرحلة {phaseModal.phase}!</div>
      <div className={styles.subtitle}>ماشاء الله! جاهز تنتقل للمرحلة {nextPhase}؟<br />{nextSources.join(' + ')}</div>
      <div className={styles.btnRow}>
        <button className={styles.confirmBtn} onClick={advancePhase}>انتقل ✨</button>
        <button className={styles.laterBtn} onClick={closePhaseModal}>لسه بكمّل</button>
      </div>
    </Modal>
  );
}
