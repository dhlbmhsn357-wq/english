import { useStore } from '../../store/useStore';
import { todayKey } from '../../lib/dateUtils';
import { ActionIcons } from '../../components/icons';
import type { DailyMode } from '../../types';
import styles from './DailyModeSelector.module.css';

export function DailyModeSelector() {
  const dailyModes = useStore(s => s.dailyPlan.dailyModes);
  const setMode = useStore(s => s.setMode);
  const t = todayKey();
  const currentMode = dailyModes[t] || null;

  function handleSelect(mode: DailyMode) {
    setMode(mode);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>النهارده إيه؟</div>
      <div className={styles.grid}>
        <button
          className={`${styles.option} ${styles.busy} ${currentMode === 'busy' ? styles.active : ''}`}
          onClick={() => handleSelect('busy')}
        >
          <ActionIcons.busy size={20} strokeWidth={1.8} className={styles.icon} />
          <span className={styles.name}>مضغوط</span>
          <span className={styles.desc}>نركز على أهم 2–3 مهام فقط</span>
        </button>
        <button
          className={`${styles.option} ${styles.free} ${currentMode === 'free' ? styles.active : ''}`}
          onClick={() => handleSelect('free')}
        >
          <ActionIcons.free size={20} strokeWidth={1.8} className={styles.icon} />
          <span className={styles.name}>مفضي</span>
          <span className={styles.desc}>الخطة الكاملة لليوم</span>
        </button>
      </div>
    </div>
  );
}
