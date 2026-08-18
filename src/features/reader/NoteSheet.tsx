import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import styles from './NoteSheet.module.css';

interface NoteSheetProps {
  open: boolean;
  selectedText: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

/** بند 9 — إضافة ملاحظة على نص محدد */
export function NoteSheet({ open, selectedText, onClose, onSave }: NoteSheetProps) {
  const [note, setNote] = useState('');

  function handleSave() {
    if (!note.trim()) return;
    onSave(note.trim());
    setNote('');
  }

  return (
    <BottomSheet open={open} onClose={() => { setNote(''); onClose(); }} title="إضافة ملاحظة">
      <div className={styles.quoted}>{selectedText}</div>
      <textarea
        autoFocus
        className={styles.textarea}
        placeholder="اكتب ملاحظتك هنا..."
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <Button variant="primary" full disabled={!note.trim()} onClick={handleSave}>حفظ الملاحظة</Button>
    </BottomSheet>
  );
}
