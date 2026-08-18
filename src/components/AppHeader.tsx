import { useStore } from '../store/useStore';
import { ConnectionDot } from './OfflineBadge';
import { formatArabicDate, greetingForNow, todayKey } from '../lib/dateUtils';
import { IconButton } from './ui/IconButton';
import { ActionIcons } from './icons';
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
        <div className={styles.greeting}>{greetingForNow()}</div>
        <div className={styles.appName}>Fluently</div>
        <div className={styles.date}>{formatArabicDate()}</div>
      </div>
      <div className={styles.right}>
        <ConnectionDot />
        <div className={`${styles.streak} ${attendedToday ? styles.streakActive : ''}`}>
          <ActionIcons.streak size={15} strokeWidth={2} />
          {streak}
        </div>
        <IconButton icon={ActionIcons.settings} label="الإعدادات والمظهر" onClick={onOpenSettings} />
      </div>
    </header>
  );
}
