import { useStore } from '../../store/useStore';
import { TOPICS } from '../../lib/staticData';
import styles from './SpeakingChallengeCard.module.css';

export function SpeakingChallengeCard() {
  const topicIndex = useStore(s => s.progressState.topicIndex);
  const newTopic = useStore(s => s.newTopic);
  const topic = TOPICS[topicIndex % TOPICS.length];

  function openChat() {
    const prompt = `Let's have a 10-minute English conversation about: "${topic}". Start naturally, ask questions, correct mistakes gently. Speak at B2-C1 level.`;
    window.open('https://chatgpt.com/?q=' + encodeURIComponent(prompt), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>💬 Speaking Challenge</div>
      <div className={styles.topicBox}>
        <div className={styles.topicLabel}>الموضوع:</div>
        <div className={styles.topicText}>{topic}</div>
      </div>
      <button className={styles.startBtn} onClick={openChat}>🎙️ ابدأ المحادثة</button>
      <button className={styles.skipBtn} onClick={newTopic}>🔄 موضوع تاني</button>
    </div>
  );
}
