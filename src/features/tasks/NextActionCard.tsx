import { useStore } from '../../store/useStore';
import { getTasks, getNextEpisodeLabel, getNextEpisodeNumber } from '../../lib/taskEngine';
import { DURATIONS } from '../../lib/staticData';
import { todayKey } from '../../lib/dateUtils';
import styles from './NextActionCard.module.css';

interface NextActionCardProps {
  onStart: (taskId: string, sourceName: string, episode: number, isCarryover: boolean, carryId?: string) => void;
}

export function NextActionCard({ onStart }: NextActionCardProps) {
  const dailyModes = useStore(s => s.dailyPlan.dailyModes);
  const tasks = useStore(s => s.tasksState.tasks);
  const carryover = useStore(s => s.carryoverState.carryover);
  const islamicPhase = useStore(s => s.progressState.islamicPhase);
  const progress = useStore(s => s.progressState.progress);

  const t = todayKey();
  const todayMode = dailyModes[t] || null;

  // الأولوية للـ carryover (بند 2)
  if (carryover.length > 0) {
    const c = carryover[0];
    return (
      <div className={`${styles.card} ${styles.carryVariant} anim-fade-slide-in`}>
        <div className={styles.label}>🎯 التالي الآن — متأخرة</div>
        <div className={styles.name}>{c.sourceName}</div>
        <div className={styles.meta}>الحلقة {c.episode} • متبقي {c.remainMinutes} دقيقة</div>
        <button className={styles.startBtn} onClick={() => onStart(c.originalTaskId, c.sourceName, c.episode, true, c.id)}>
          ابدأ الآن
        </button>
      </div>
    );
  }

  if (!todayMode) return null;

  const todayTasks = getTasks(todayMode, t, islamicPhase, progress);
  const nextTask = todayTasks.find(task => !(tasks[t + '_' + task.id] || {}).done);

  if (!nextTask) return null;

  const epLabel = getNextEpisodeLabel(nextTask.name, progress);
  const episode = getNextEpisodeNumber(nextTask.name, progress);
  const duration = DURATIONS[nextTask.name];

  return (
    <div className={`${styles.card} anim-fade-slide-in`}>
      <div className={styles.label}>🎯 التالي الآن</div>
      <div className={styles.name}>{nextTask.name}</div>
      <div className={styles.metaRow}>
        {epLabel && <span className={styles.metaChip}>الحلقة {epLabel.next} من {epLabel.total}</span>}
        {duration && <span className={styles.metaChip}>{duration} دقيقة</span>}
      </div>
      <button className={styles.startBtn} onClick={() => onStart(nextTask.id, nextTask.name, episode, false)}>
        ابدأ الآن
      </button>
    </div>
  );
}
