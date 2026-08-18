import { useStore } from '../../store/useStore';
import { getTasks } from '../../lib/taskEngine';
import { DURATIONS } from '../../lib/staticData';
import { formatMinutes } from '../../lib/utils';
import { todayKey } from '../../lib/dateUtils';
import { NotesIcon, ActionIcons } from '../../components/icons';
import styles from './DailyPlanSummary.module.css';

export function DailyPlanSummary() {
  const dailyModes = useStore(s => s.dailyPlan.dailyModes);
  const tasksState = useStore(s => s.tasksState.tasks);
  const carryover = useStore(s => s.carryoverState.carryover);
  const islamicPhase = useStore(s => s.progressState.islamicPhase);
  const progress = useStore(s => s.progressState.progress);

  const t = todayKey();
  const mode = dailyModes[t] || null;
  if (!mode) return null;

  const tasks = getTasks(mode, t, islamicPhase, progress);
  const remaining = tasks.filter(task => !(tasksState[t + '_' + task.id] || {}).done);
  const totalMinutes = remaining.reduce((sum, task) => sum + (DURATIONS[task.name] || 0), 0);

  if (remaining.length === 0 && carryover.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <span className={styles.item}><NotesIcon size={13} strokeWidth={2} /> {remaining.length} {remaining.length === 1 ? 'مهمة' : 'مهام'}</span>
      {totalMinutes > 0 && <span className={styles.item}><ActionIcons.carryover size={13} strokeWidth={2} /> {formatMinutes(totalMinutes)}</span>}
      {carryover.length > 0 && <span className={styles.itemWarn}>{carryover.length} متأخرة</span>}
    </div>
  );
}
