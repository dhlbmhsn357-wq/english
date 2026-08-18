import { type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={e => { if (onClose && e.target === e.currentTarget) onClose(); }}>
      <div className={styles.card} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
