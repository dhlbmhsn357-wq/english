import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ICON_SIZE, ICON_STROKE } from '../icons';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  iconPosition?: 'start' | 'end';
  full?: boolean;
  children?: ReactNode;
}

/** زر موحّد لكل التطبيق — 4 variants × 3 أحجام، بدون تصميم زرار منفصل لكل مكان */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'start',
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [styles.btn, styles[variant], styles[size], full ? styles.full : '', className || ''].join(' ').trim();
  return (
    <button className={cls} {...rest}>
      {Icon && iconPosition === 'start' && <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
      {children}
      {Icon && iconPosition === 'end' && <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
    </button>
  );
}
