import { useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useStore } from '../store/useStore';
import type { Theme, FontFamily, BgStyle } from '../types';
import styles from './SettingsSheet.module.css';

const THEMES: { key: Theme; icon: string; label: string; bg: string; fg: string }[] = [
  { key: 'dark', icon: '🌙', label: 'داكن', bg: '#0b1420', fg: '#c9a84c' },
  { key: 'sandy', icon: '🏜️', label: 'رملي', bg: '#201709', fg: '#d4a843' },
  { key: 'sky', icon: '🌊', label: 'سماوي', bg: '#060f1c', fg: '#64b5f6' },
  { key: 'green', icon: '🌿', label: 'أخضر', bg: '#060f09', fg: '#66bb6a' },
  { key: 'rose', icon: '🌸', label: 'وردي', bg: '#140a0e', fg: '#f48fb1' }
];

const FONTS: { key: FontFamily; label: string }[] = [
  { key: 'Tajawal', label: 'تجوّل' },
  { key: 'Cairo', label: 'كايرو' },
  { key: 'Amiri', label: 'أميري' }
];

const BGS: { key: BgStyle; preview: string }[] = [
  { key: 'none', preview: 'linear-gradient(135deg,#0f1923,#1a2535)' },
  { key: 'stars', preview: 'radial-gradient(circle at 30% 50%,#1a2550,#050a15)' },
  { key: 'geo', preview: 'linear-gradient(45deg,#1a1528,#2a1535,#1a2035)' },
  { key: 'warm', preview: 'linear-gradient(135deg,#2c1a0a,#1a2010,#0a1020)' }
];

const FONT_SIZE_LABELS = ['صغير', 'صغير+', 'متوسط', 'كبير', 'كبير+'];

const MAX_BG_SIZE = 3 * 1024 * 1024;

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const settings = useStore(s => s.userSettings);
  const setTheme = useStore(s => s.setTheme);
  const setFont = useStore(s => s.setFont);
  const setFontSize = useStore(s => s.setFontSize);
  const setBg = useStore(s => s.setBg);
  const setCustomBg = useStore(s => s.setCustomBg);
  const setBgOpacity = useStore(s => s.setBgOpacity);
  const exportSnapshot = useStore(s => s.exportSnapshot);
  const importSnapshot = useStore(s => s.importSnapshot);
  const showToast = useStore(s => s.showToast);

  const importInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const data = exportSnapshot();
    const payload = { app: 'Massar Mohsen', schemaVersion: data.schemaVersion, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'massar_mohsen_backup.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('💾 تم تصدير البيانات!');
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!confirm('استيراد النسخة دي هيستبدل بياناتك الحالية بالكامل. متأكد؟')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const result = importSnapshot(parsed);
        if (!result.ok) showToast('❌ ملف النسخة الاحتياطية غير صالح أو تالف');
      } catch {
        showToast('❌ ملف النسخة الاحتياطية غير صالح أو تالف');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(f);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('❌ الملف المختار مش صورة'); e.target.value = ''; return; }
    if (f.size > MAX_BG_SIZE) { showToast('الصورة كبيرة جدًا. اختر صورة أقل من 3MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setCustomBg(ev.target?.result as string);
      showToast('🖼️ تم رفع الصورة');
    };
    reader.readAsDataURL(f);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="🎨 تخصيص المظهر">
      <div className={styles.section}>
        <div className={styles.sectionLabel}>الثيم</div>
        <div className={styles.themeGrid}>
          {THEMES.map(th => (
            <button
              key={th.key}
              className={`${styles.themeBtn} ${settings.theme === th.key ? styles.themeActive : ''}`}
              style={{ background: th.bg, color: th.fg }}
              onClick={() => setTheme(th.key)}
            >
              <span className={styles.themeIcon}>{th.icon}</span>
              {th.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>الخلفية</div>
        <div className={styles.bgGrid}>
          {BGS.map(b => (
            <button
              key={b.key}
              className={`${styles.bgBtn} ${settings.bg === b.key ? styles.bgActive : ''}`}
              style={{ background: b.preview }}
              onClick={() => setBg(b.key)}
              aria-label={`خلفية ${b.key}`}
            />
          ))}
        </div>
        <button className={styles.uploadBtn} onClick={() => bgInputRef.current?.click()}>📷 ارفع صورة من جهازك</button>
        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
        <div className={styles.opacityRow}>
          <label htmlFor="bg-opacity">شفافية الخلفية</label>
          <input
            id="bg-opacity"
            type="range" min={0.1} max={1} step={0.05}
            value={settings.bgOpacity}
            onChange={e => setBgOpacity(parseFloat(e.target.value))}
          />
          <span>{Math.round(settings.bgOpacity * 100)}%</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>الخط</div>
        <div className={styles.fontGrid}>
          {FONTS.map(f => (
            <button
              key={f.key}
              className={`${styles.fontBtn} ${settings.font === f.key ? styles.fontActive : ''}`}
              style={{ fontFamily: f.key }}
              onClick={() => setFont(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>حجم الخط</div>
        <div className={styles.sizeRow}>
          <button className={styles.sizeBtn} onClick={() => setFontSize(-1)} aria-label="تصغير الخط">أ−</button>
          <div className={styles.sizeLabel}>{FONT_SIZE_LABELS[settings.fontSize]}</div>
          <button className={styles.sizeBtn} onClick={() => setFontSize(1)} aria-label="تكبير الخط">أ+</button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>البيانات والنسخ الاحتياطي</div>
        <div className={styles.dataRow}>
          <button className={styles.exportBtn} onClick={handleExport}>💾 تصدير بياناتي</button>
          <button className={styles.importBtn} onClick={() => importInputRef.current?.click()}>📂 استيراد backup</button>
          <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
        </div>
        <div className={styles.hint}>اضغط "تصدير" كل أسبوع عشان تحتفظ ببياناتك</div>
      </div>

      <button className={styles.closeBtn} onClick={onClose}>تم ✓</button>
    </BottomSheet>
  );
}
