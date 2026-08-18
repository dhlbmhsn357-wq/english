import { useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useStore } from '../store/useStore';
import { ActionIcons } from './icons';
import { Button } from './ui/Button';
import { exportPdfMetadata, importPdfMetadata } from '../lib/db';
import type { Theme, FontFamily } from '../types';
import styles from './SettingsSheet.module.css';

const THEMES: { key: Theme; icon: typeof ActionIcons.themeDark; label: string }[] = [
  { key: 'light', icon: ActionIcons.themeLight, label: 'فاتح' },
  { key: 'dark', icon: ActionIcons.themeDark, label: 'داكن' },
  { key: 'system', icon: ActionIcons.themeSystem, label: 'تلقائي' }
];

const FONTS: { key: FontFamily; label: string }[] = [
  { key: 'Tajawal', label: 'تجوّل' },
  { key: 'Cairo', label: 'كايرو' },
  { key: 'Amiri', label: 'أميري' }
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

  async function handleExport() {
    const data = exportSnapshot();
    // بند 29 — الـ Backup بيشمل Highlights/Notes (Metadata) لكن مش ملفات الـ PDF نفسها
    // (بتفضل محفوظة محليًا في IndexedDB بس — أكبر من ما ينفع يتحط في JSON واحد)
    const pdfMeta = await exportPdfMetadata();
    const payload = {
      app: 'Massar Mohsen', schemaVersion: data.schemaVersion, exportedAt: new Date().toISOString(),
      data, pdfHighlights: pdfMeta.highlights, pdfNotes: pdfMeta.notes, pdfFilesInfo: pdfMeta.files
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'massar_mohsen_backup.json'; a.click();
    URL.revokeObjectURL(url);
    showToast(pdfMeta.files.length > 0 ? 'تم تصدير البيانات (ملفات الـ PDF نفسها لازم ترفعها تاني بعد الاستيراد)' : 'تم تصدير البيانات');
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
        if (!result.ok) { showToast('ملف النسخة الاحتياطية غير صالح أو تالف'); return; }
        if (parsed?.pdfHighlights || parsed?.pdfNotes) {
          importPdfMetadata({ highlights: parsed.pdfHighlights, notes: parsed.pdfNotes });
        }
      } catch {
        showToast('ملف النسخة الاحتياطية غير صالح أو تالف');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(f);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('الملف المختار مش صورة'); e.target.value = ''; return; }
    if (f.size > MAX_BG_SIZE) { showToast('الصورة كبيرة جدًا. اختر صورة أقل من 3MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setCustomBg(ev.target?.result as string);
      showToast('تم رفع الصورة');
    };
    reader.readAsDataURL(f);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="المظهر والإعدادات">
      <div className={styles.section}>
        <div className={styles.sectionLabel}>المظهر</div>
        <div className={styles.themeGrid}>
          {THEMES.map(th => {
            const Icon = th.icon;
            return (
              <button
                key={th.key}
                className={`${styles.themeBtn} ${settings.theme === th.key ? styles.themeActive : ''}`}
                onClick={() => setTheme(th.key)}
              >
                <Icon size={20} strokeWidth={1.8} />
                {th.label}
              </button>
            );
          })}
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
        <div className={styles.sectionLabel}>خلفية مخصّصة (اختياري)</div>
        <button className={styles.uploadBtn} onClick={() => bgInputRef.current?.click()}>
          <ActionIcons.image size={16} strokeWidth={1.8} /> ارفع صورة خلفية خفيفة
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
        {settings.bg === 'custom' && (
          <>
            <div className={styles.opacityRow}>
              <label htmlFor="bg-opacity">الشفافية</label>
              <input
                id="bg-opacity"
                type="range" min={0.1} max={1} step={0.05}
                value={settings.bgOpacity}
                onChange={e => setBgOpacity(parseFloat(e.target.value))}
              />
              <span>{Math.round(settings.bgOpacity * 100)}%</span>
            </div>
            <button className={styles.removeBgBtn} onClick={() => { setBg('none'); setCustomBg(null); }}>إزالة الخلفية</button>
          </>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>البيانات والنسخ الاحتياطي</div>
        <div className={styles.dataRow}>
          <Button variant="secondary" size="sm" icon={ActionIcons.download} onClick={handleExport} full>تصدير بياناتي</Button>
          <Button variant="secondary" size="sm" icon={ActionIcons.upload} onClick={() => importInputRef.current?.click()} full>استيراد backup</Button>
          <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
        </div>
        <div className={styles.hint}>اضغط "تصدير" كل أسبوع عشان تحتفظ ببياناتك</div>
      </div>

      <Button variant="primary" full onClick={onClose}>تم</Button>
    </BottomSheet>
  );
}
