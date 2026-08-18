import styles from './ProgressHero.module.css';

interface ProgressHeroProps {
  pct: number;
  daysStudied: number;
  sessions: number;
  hours: number;
}

const SIZE = 128;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Hero Summary أعلى صفحة التقدم — Circular Progress + ملخص سريع */
export function ProgressHero({ pct, daysStudied, sessions, hours }: ProgressHeroProps) {
  const offset = C - (Math.min(100, Math.max(0, pct)) / 100) * C;

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke="var(--primary)" strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className={styles.progressCircle}
          />
        </svg>
        <div className={styles.ringLabel}>
          <div className={styles.ringPct}>{pct}%</div>
          <div className={styles.ringSub}>من خطتك</div>
        </div>
      </div>
      <div className={styles.stats}>
        <Stat num={daysStudied} label="أيام تعلّم" />
        <Stat num={sessions} label="جلسة" />
        <Stat num={hours} label="ساعة" />
      </div>
    </div>
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
