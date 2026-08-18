import type { ButtonHTMLAttributes } from 'react';
import { ICON_SIZE, ICON_STROKE } from '../icons';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  active?: boolean;
  size?: 'sm' | 'md';
  label: string; // aria-label إجباري — أيقونة بدون نص مرئي لازم توصيف
}

export function IconButton({ icon: Icon, active, size = 'md', label, className, ...rest }: IconButtonProps) {
  const cls = [styles.btn, active ? styles.active : '', size === 'sm' ? styles.sm : '', className || ''].join(' ').trim();
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      <Icon size={size === 'sm' ? ICON_SIZE - 2 : ICON_SIZE} strokeWidth={ICON_STROKE} />
    </button>
  );
}
