import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { useStore } from '../../store/useStore';
import { SOURCES_MAP, DURATIONS, TOTALS } from '../../lib/staticData';
import { buildYtUrl } from '../../lib/utils';
import type { Difficulty } from '../../types';
import styles from './SessionSheet.module.css';

type Step = 'session' | 'wrapup';

export function SessionSheet() {
  const activeSession = useStore(s => s.activeSession);
  const cancelSession = useStore(s => s.cancelSession);
  const endSession = useStore(s => s.endSession);
  const tasksStopped = useStore(s => s.tasksState.stopped);

  const [step, setStep] = useState<Step>('session');
  const [finishedEpisode, setFinishedEpisode] = useState<boolean | null>(null);
  const [stoppedAt, setStoppedAt] = useState('');
  const [note, setNote] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newWordMeaning, setNewWordMeaning] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [sessionStart] = useState(Date.now());

  const open = !!activeSession;

  function resetLocal() {
    setStep('session'); setFinishedEpisode(null); setStoppedAt(''); setNote('');
    setNewWord(''); setNewWordMeaning(''); setDifficulty(null);
  }

  function handleClose() {
    cancelSession();
    resetLocal();
  }

  if (!activeSession) return <BottomSheet open={false} onClose={handleClose}><div /></BottomSheet>;

  const { sourceName, episode } = activeSession;
  const defaultUrl = SOURCES_MAP[sourceName] || null;
  const savedStop = tasksStopped[sourceName]?.[String(episode)];
  const openUrl = savedStop?.url ? buildYtUrl(savedStop.url, savedStop.time) : defaultUrl;
  const total = TOTALS[sourceName];
  const duration = DURATIONS[sourceName];

  function handleFinishSession() {
    setStep('wrapup');
  }

  function handleSubmitWrapup() {
    const durationMinutes = Math.round((Date.now() - sessionStart) / 60000) || null;
    endSession({
      completed: !!finishedEpisode,
      stoppedAt: finishedEpisode ? undefined : (stoppedAt || undefined),
      note,
      newWord: newWord.trim() ? { word: newWord.trim(), meaning: newWordMeaning.trim() } : undefined,
      difficulty: difficulty || undefined,
      durationMinutes: durationMinutes || undefined
    });
    resetLocal();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={step === 'session' ? sourceName : 'كيف كانت الجلسة؟'}>
      {step === 'session' && (
        <div className={styles.sessionBody}>
          <div className={styles.metaRow}>
            {total && <span className={styles.chip}>الحلقة {episode} من {total}</span>}
            {duration && <span className={styles.chip}>{duration} دقيقة</span>}
          </div>

          {savedStop?.time && (
            <div className={styles.lastStop}>📍 آخر مكان توقفت فيه: {savedStop.time}</div>
          )}

          {openUrl ? (
            <a className={styles.openBtn} href={openUrl} target="_blank" rel="noopener noreferrer">
              ▶ افتح المصدر
            </a>
          ) : (
            <div className={styles.noUrl}>مفيش رابط متاح لهذا المصدر</div>
          )}

          <button className={styles.primaryBtn} onClick={handleFinishSession}>
            أنهيت الجلسة
          </button>
          <button className={styles.ghostBtn} onClick={handleClose}>إلغاء</button>
        </div>
      )}

      {step === 'wrapup' && (
        <div className={styles.wrapupBody}>
          <div className={styles.qBlock}>
            <div className={styles.qLabel}>هل أنهيت الحلقة؟</div>
            <div className={styles.twoBtn}>
              <button className={finishedEpisode === true ? styles.selectedYes : styles.optBtn} onClick={() => setFinishedEpisode(true)}>✅ آه خلصتها</button>
              <button className={finishedEpisode === false ? styles.selectedNo : styles.optBtn} onClick={() => setFinishedEpisode(false)}>⏸ لسه</button>
            </div>
          </div>

          {finishedEpisode === false && (
            <div className={styles.qBlock}>
              <div className={styles.qLabel}>أين توقفت؟ (دقيقة:ثانية)</div>
              <input
                className={styles.input}
                placeholder="12:34"
                dir="ltr"
                value={stoppedAt}
                onChange={e => setStoppedAt(e.target.value)}
              />
            </div>
          )}

          <div className={styles.qBlock}>
            <div className={styles.qLabel}>أهم فائدة في سطر واحد (اختياري)</div>
            <textarea
              className={styles.textarea}
              placeholder="فكرة أو ملاحظة سريعة..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className={styles.qBlock}>
            <div className={styles.qLabel}>كلمة جديدة؟ (اختياري)</div>
            <div className={styles.wordRow}>
              <input className={styles.input} placeholder="الكلمة" dir="ltr" value={newWord} onChange={e => setNewWord(e.target.value)} />
              <input className={styles.input} placeholder="المعنى" value={newWordMeaning} onChange={e => setNewWordMeaning(e.target.value)} />
            </div>
          </div>

          <div className={styles.qBlock}>
            <div className={styles.qLabel}>صعوبة الجلسة</div>
            <div className={styles.diffRow}>
              <button className={difficulty === 'easy' ? styles.diffSelectedEasy : styles.diffBtn} onClick={() => setDifficulty('easy')}>😊 سهلة</button>
              <button className={difficulty === 'mid' ? styles.diffSelectedMid : styles.diffBtn} onClick={() => setDifficulty('mid')}>🤔 متوسطة</button>
              <button className={difficulty === 'hard' ? styles.diffSelectedHard : styles.diffBtn} onClick={() => setDifficulty('hard')}>😓 صعبة</button>
            </div>
          </div>

          <button
            className={styles.primaryBtn}
            disabled={finishedEpisode === null}
            onClick={handleSubmitWrapup}
          >
            حفظ وإنهاء
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
