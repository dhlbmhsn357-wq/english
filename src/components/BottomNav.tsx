import styles from './BottomNav.module.css';

export type PageKey = 'today' | 'library' | 'progress';

interface BottomNavProps {
  active: PageKey;
  onChange: (page: PageKey) => void;
}

const NAV_ITEMS: { key: PageKey; icon: string; label: string }[] = [
  { key: 'today', icon: '🏠', label: 'اليوم' },
  { key: 'library', icon: '📚', label: 'المكتبة' },
  { key: 'progress', icon: '📊', label: 'التقدم' }
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map(item => (
        <button
          key={item.key}
          className={`${styles.btn} ${active === item.key ? styles.active : ''}`}
          onClick={() => onChange(item.key)}
          aria-current={active === item.key ? 'page' : undefined}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
