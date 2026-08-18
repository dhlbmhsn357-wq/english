import { ReaderIcons } from '../../components/icons';
import type { HighlightColor } from '../../types';
import styles from './SelectionToolbar.module.css';

interface SelectionToolbarProps {
  rect: { top: number; left: number; width: number };
  selectedText: string;
  onHighlight: (color: HighlightColor) => void;
  onTranslate: () => void;
  onPronounce: () => void;
  onSaveWord: () => void;
  onNote: () => void;
  onCopy: () => void;
}

const COLORS: { key: HighlightColor; hex: string; label: string }[] = [
  { key: 'yellow', hex: '#f5c518', label: 'مهم' },
  { key: 'green', hex: '#22c55e', label: 'مفهوم / قاعدة' },
  { key: 'blue', hex: '#3b82f6', label: 'معلومة' },
  { key: 'red', hex: '#ef4444', label: 'يحتاج مراجعة' }
];

const MAX_SAVE_WORDS = 6;

/** بند 6+39 — Toolbar عائم فوق التحديد: Highlight / Translate / Pronounce / Save / Note / Copy */
export function SelectionToolbar({ rect, selectedText, onHighlight, onTranslate, onPronounce, onSaveWord, onNote, onCopy }: SelectionToolbarProps) {
  const wordCount = selectedText.trim().split(/\s+/).filter(Boolean).length;
  const canSave = wordCount > 0 && wordCount <= MAX_SAVE_WORDS;

  const top = Math.max(8, rect.top - 52);
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 110), window.innerWidth - 228);

  return (
    <div className={styles.toolbar} style={{ top, left }} onMouseDown={e => e.preventDefault()}>
      <div className={styles.colors}>
        {COLORS.map(c => (
          <button
            key={c.key}
            className={styles.colorDot}
            style={{ background: c.hex, ['--dot-color' as string]: c.hex }}
            title={c.label}
            aria-label={c.label}
            onClick={() => onHighlight(c.key)}
          />
        ))}
      </div>
      <div className={styles.divider} />
      <button className={styles.iconBtn} title="ترجمة" onClick={onTranslate}><ReaderIcons.translate size={16} strokeWidth={1.8} /></button>
      <button className={styles.iconBtn} title="نطق" onClick={onPronounce}><ReaderIcons.speak size={16} strokeWidth={1.8} /></button>
      <button className={styles.iconBtn} title="ملاحظة" onClick={onNote}><ReaderIcons.note size={16} strokeWidth={1.8} /></button>
      <button className={styles.iconBtn} title="نسخ" onClick={onCopy}><ReaderIcons.copy size={16} strokeWidth={1.8} /></button>
      <button className={styles.iconBtn} title={canSave ? 'حفظ للمفردات' : 'التحديد طويل — اختار كلمة أو عبارة قصيرة'} disabled={!canSave} onClick={onSaveWord}>
        <ReaderIcons.addToVocab size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}
