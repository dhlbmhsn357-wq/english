import { ActionIcons } from './icons';
import { Button } from './ui/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = ActionIcons.sparkle, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.iconWrap} aria-hidden="true"><Icon size={26} strokeWidth={1.6} /></div>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className={styles.actionBtn}>{action.label}</Button>
      )}
    </div>
  );
}
