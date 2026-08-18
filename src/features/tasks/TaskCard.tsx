import { useStore } from '../../store/useStore';
import { getNextEpisodeLabel, getNextEpisodeNumber } from '../../lib/taskEngine';
import { DURATIONS, STATIC_CONTENT_TYPE } from '../../lib/staticData';
import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import type { TaskDef } from '../../types';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: TaskDef;
  taskKey: string;
  isDone: boolean;
  onStart: () => void;
}

const TYPE_LABEL: Record<string, string> = { listening: 'استماع', vocab: 'مفردات', zad: 'دراسات إسلامية' };

export function TaskCard({ task, isDone, onStart }: TaskCardProps) {
  const progress = useStore(s => s.progressState.progress);
  const epLabel = getNextEpisodeLabel(task.name, progress);
  const episode = getNextEpisodeNumber(task.name, progress);
  const duration = DURATIONS[task.name];
  const Icon = ContentTypeIcons[STATIC_CONTENT_TYPE[task.name] || 'other'];

  return (
    <div className={`${styles.card} ${styles[task.type]} ${isDone ? styles.done : ''} anim-fade-slide-in`}>
      <span className={styles.iconWrap}><Icon size={16} strokeWidth={1.8} /></span>
      <div className={styles.left}>
        <div className={styles.typeLabel}>{TYPE_LABEL[task.type] || task.type}</div>
        <div className={styles.name}>{task.name}</div>
        <div className={styles.meta}>
          {epLabel ? `الحلقة ${epLabel.next} من ${epLabel.total}` : task.meta}
          {duration ? ` • ${duration} دقيقة` : ''}
        </div>
      </div>
      <div className={styles.right}>
        {isDone ? (
          <div className={styles.doneBadge}><ActionIcons.complete size={16} strokeWidth={2.4} /></div>
        ) : (
          <Button variant="secondary" size="sm" onClick={onStart} aria-label={`ابدأ ${task.name}`}>ابدأ</Button>
        )}
      </div>
      {!episode || !epLabel ? null : null}
    </div>
  );
}
