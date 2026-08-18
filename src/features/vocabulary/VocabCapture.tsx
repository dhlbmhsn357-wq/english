import { useState } from 'react';
import { useStore } from '../../store/useStore';
import styles from './VocabCapture.module.css';

export function VocabCapture() {
  const addWord = useStore(s => s.addWord);
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');

  function handleAdd() {
    if (!word.trim()) return;
    addWord(word.trim(), meaning.trim());
    setWord(''); setMeaning('');
  }

  return (
    <div className={styles.row}>
      <input
        className={styles.input}
        placeholder="الكلمة..."
        dir="ltr"
        value={word}
        onChange={e => setWord(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('vocab-meaning-input')?.focus(); }}
        aria-label="الكلمة الجديدة"
      />
      <input
        id="vocab-meaning-input"
        className={styles.input}
        placeholder="المعنى..."
        value={meaning}
        onChange={e => setMeaning(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        aria-label="معنى الكلمة"
      />
      <button className={styles.addBtn} onClick={handleAdd} aria-label="إضافة كلمة">+</button>
    </div>
  );
}
