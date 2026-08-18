import { NavIcons, ICON_STROKE } from './icons';
import styles from './BottomNav.module.css';

export type PageKey = 'today' | 'library' | 'progress';

interface BottomNavProps {
  active: PageKey;
  onChange: (page: PageKey) => void;
}

const NAV_ITEMS: { key: PageKey; icon: keyof typeof NavIcons; label: string }[] = [
  { key: 'today', icon: 'today', label: 'اليوم' },
  { key: 'library', icon: 'library', label: 'المكتبة' },
  { key: 'progress', icon: 'progress', label: 'التقدم' }
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(item => {
        const Icon = NavIcons[item.icon];
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            className={`${styles.btn} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(item.key)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? ICON_STROKE + 0.4 : ICON_STROKE} />
            <span>{item.label}</span>
            <i className={styles.indicator} />
          </button>
        );
      })}
    </nav>
  );
}
