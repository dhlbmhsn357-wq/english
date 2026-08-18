import { useStore } from '../store/useStore';
import { ConnectionDot } from './OfflineBadge';
import { formatArabicDate, greetingForNow, todayKey } from '../lib/dateUtils';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  onOpenSettings: () => void;
}

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const streak = useStore(s => s.attendance.streak);
  const attendedToday = useStore(s => s.attendance.attendance.includes(todayKey()));

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.greeting}>{greetingForNow()} 👋</div>
        <div className={styles.appName}>مسار محسن</div>
        <div className={styles.date}>{formatArabicDate()}</div>
      </div>
      <div className={styles.right}>
        <ConnectionDot />
        <div className={`${styles.streak} ${attendedToday ? styles.streakActive : ''}`}>
          🔥 {streak}
        </div>
        <button className={styles.settingsBtn} onClick={onOpenSettings} aria-label="تخصيص المظهر">
          🎨
        </button>
      </div>
    </header>
  );
}
