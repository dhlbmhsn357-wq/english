import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = '✨', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon} aria-hidden="true">{icon}</div>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {action && (
        <button className={styles.action} onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
