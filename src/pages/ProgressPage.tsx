import { useStore } from '../store/useStore';
import { ProgressOverview } from '../features/progress/ProgressOverview';
import { SourceProgressCard } from '../features/progress/SourceProgressCard';
import { WeeklyReviewCard } from '../features/review/WeeklyReviewCard';
import { TOTALS } from '../lib/staticData';
import styles from './ProgressPage.module.css';

export function ProgressPage() {
  const progress = useStore(s => s.progressState.progress);
  const updateProgress = useStore(s => s.updateProgress);

  const sourceNames = Object.keys(TOTALS);

  return (
    <div className={styles.page}>
      <div className={styles.header}>📊 تقدمك</div>

      <ProgressOverview />

      <WeeklyReviewCard />

      <div className={styles.sourcesBlock}>
        <div className={styles.sectionLabel}>المسارات</div>
        <div className={styles.sourcesList}>
          {sourceNames.map(name => (
            <SourceProgressCard
              key={name}
              sourceName={name}
              done={progress[name] || 0}
              onEdit={v => updateProgress(name, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
