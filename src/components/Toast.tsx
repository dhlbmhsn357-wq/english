import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import styles from './Toast.module.css';

export function Toast() {
  const toast = useStore(s => s.toast);
  const clearToast = useStore(s => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 2500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className={styles.toast} key={toast.key} role="status" aria-live="polite">
      {toast.msg}
    </div>
  );
}
