import { useEffect, useState } from 'react';
import styles from './OfflineBadge.module.css';

export function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (online) return null;
  return <div className={styles.badge} role="status">📴 تعمل الآن بدون إنترنت</div>;
}

// نسخة صغيرة للاستخدام جوه الـ Header (بند 1-A: حالة الاتصال)
export function ConnectionDot() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return (
    <span className={styles.dotWrap} title={online ? 'متصل' : 'بدون إنترنت'}>
      <span className={online ? styles.dotOnline : styles.dotOffline} />
    </span>
  );
}
