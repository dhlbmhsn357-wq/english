import { TOTALS, SOURCE_META, DURATIONS } from '../../lib/staticData';
import { getSourceState, STATE_LABELS } from './sourceState';
import styles from './SourceCard.module.css';

interface SourceCardProps {
  sourceName: string;
  progress: number;
  hasStopped: boolean;
  onContinue: () => void;
}

export function SourceCard({ sourceName, progress, hasStopped, onContinue }: SourceCardProps) {
  const total = TOTALS[sourceName];
  const meta = SOURCE_META[sourceName];
  const state = getSourceState(sourceName, { [sourceName]: progress }, hasStopped);
  const stateInfo = STATE_LABELS[state];
  const pct = total ? Math.round((progress / total) * 100) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.info}>
          <div className={styles.name}>{sourceName}</div>
          {meta && <div className={styles.presenter}>{meta.presenter}</div>}
        </div>
        <span className={styles.stateBadge} style={{ color: stateInfo.color, borderColor: stateInfo.color }}>
          {stateInfo.label}
        </span>
      </div>

      {total && (
        <>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.metaRow}>
            <span>{progress}/{total} حلقة</span>
            {DURATIONS[sourceName] && <span>{DURATIONS[sourceName]} دقيقة/حلقة</span>}
          </div>
        </>
      )}

      {state !== 'completed' && (
        <button className={styles.continueBtn} onClick={onContinue}>
          {state === 'not-started' ? 'ابدأ' : 'متابعة'} — الحلقة {progress + 1}
        </button>
      )}
    </div>
  );
}
