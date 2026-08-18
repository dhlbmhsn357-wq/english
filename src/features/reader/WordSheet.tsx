import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import { ReaderIcons } from '../../components/icons';
import { translationService } from '../../lib/translationService';
import { pronounce, canPronounce } from '../../lib/pronunciation';
import { useStore } from '../../store/useStore';
import styles from './WordSheet.module.css';

interface WordSheetProps {
  word: string | null;
  sentence?: string;
  sourceId: string;
  sourceTitle: string;
  page: number;
  onClose: () => void;
}

/** بند 10 — الضغط على كلمة واحدة يفتح Bottom Sheet: ترجمة + نطق + حفظ للمفردات */
export function WordSheet({ word, sentence, sourceId, sourceTitle, page, onClose }: WordSheetProps) {
  const addWordWithContext = useStore(s => s.addWordWithContext);
  const updateWordContext = useStore(s => s.updateWordContext);
  const showToast = useStore(s => s.showToast);

  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (!word) { setTranslation(null); setError(null); setDuplicateOf(null); return; }
    setLoading(true);
    setError(null);
    translationService.translate(word, 'en', 'ar').then(res => {
      setLoading(false);
      if (res.ok) setTranslation(res.translation);
      else setError(res.message);
    });
  }, [word]);

  if (!word) return null;

  function handleSave() {
    const result = addWordWithContext(word!, translation || '', { sourceId, sourceTitle, page, sentence });
    if (result.status === 'duplicate' && result.existing) {
      setDuplicateOf({ id: result.existing.id });
    } else {
      showToast('اتحفظت في المفردات');
      onClose();
    }
  }

  function handleDuplicateChoice(mode: 'replace' | 'append' | 'cancel') {
    if (mode === 'cancel') { setDuplicateOf(null); return; }
    if (duplicateOf) updateWordContext(duplicateOf.id, { sourceId, sourceTitle, page, sentence }, mode === 'replace' ? 'replace' : 'append');
    setDuplicateOf(null);
    onClose();
  }

  return (
    <BottomSheet open={!!word} onClose={onClose}>
      <div className={styles.wordHeader}>
        <span className={styles.word}>{word}</span>
        {canPronounce() && (
          <button className={styles.speakBtn} onClick={() => pronounce(word)} aria-label="استمع للنطق">
            <ReaderIcons.speak size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {loading && <div className={styles.hint}>بنترجم...</div>}
      {error && <div className={styles.error}>{error}</div>}
      {!loading && translation && <div className={styles.translation}>{translation}</div>}

      {sentence && (
        <div className={styles.sentenceBox}>
          <div className={styles.sentenceLabel}>السياق</div>
          <div className={styles.sentence}>{sentence}</div>
        </div>
      )}

      {duplicateOf ? (
        <div className={styles.dupBox}>
          <div className={styles.dupTitle}>الكلمة موجودة بالفعل</div>
          <div className={styles.dupActions}>
            <Button variant="secondary" size="sm" full onClick={() => handleDuplicateChoice('replace')}>تحديث السياق</Button>
            <Button variant="secondary" size="sm" full onClick={() => handleDuplicateChoice('append')}>إضافة سياق جديد</Button>
            <Button variant="ghost" size="sm" full onClick={() => handleDuplicateChoice('cancel')}>إلغاء</Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" full icon={ReaderIcons.addToVocab} onClick={handleSave}>حفظ للمفردات</Button>
      )}
    </BottomSheet>
  );
}
