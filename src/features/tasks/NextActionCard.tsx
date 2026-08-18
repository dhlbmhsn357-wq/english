import { useStore } from '../../store/useStore';
import { getTasks, getNextEpisodeLabel, getNextEpisodeNumber } from '../../lib/taskEngine';
import { DURATIONS, TOTALS } from '../../lib/staticData';
import { todayKey } from '../../lib/dateUtils';
import { ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
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
        <div className={styles.label}><ActionIcons.carryover size={13} strokeWidth={2} /> التالي الآن — متأخرة</div>
        <div className={styles.name}>{c.sourceName}</div>
        <div className={styles.meta}>الحلقة {c.episode} • متبقي {c.remainMinutes} دقيقة</div>
        <Button variant="primary" full icon={ActionIcons.start} onClick={() => onStart(c.originalTaskId, c.sourceName, c.episode, true, c.id)}>
          ابدأ الآن
        </Button>
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
  const total = TOTALS[nextTask.name];
  const done = progress[nextTask.name] || 0;
  const pct = total ? Math.round((done / total) * 100) : null;

  return (
    <div className={`${styles.card} anim-fade-slide-in`}>
      <div className={styles.label}><ActionIcons.trophy size={13} strokeWidth={2} /> التالي الآن</div>
      <div className={styles.name}>{nextTask.name}</div>
      <div className={styles.metaRow}>
        {epLabel && <span className={styles.metaChip}>الحلقة {epLabel.next} من {epLabel.total}</span>}
        {duration && <span className={styles.metaChip}>{duration} دقيقة</span>}
      </div>

      {pct !== null && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBarTrack}><div className={styles.progressBarFill} style={{ width: `${pct}%` }} /></div>
          <span className={styles.progressPct}>{pct}%</span>
        </div>
      )}

      <Button variant="primary" full icon={ActionIcons.start} onClick={() => onStart(nextTask.id, nextTask.name, episode, false)}>
        ابدأ الجلسة
      </Button>
    </div>
  );
}
