import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { ProgressHero } from '../features/progress/ProgressHero';
import { WeeklyActivity } from '../features/progress/WeeklyActivity';
import { SourceProgressCard } from '../features/progress/SourceProgressCard';
import { WeeklyReviewCard } from '../features/review/WeeklyReviewCard';
import { SourceCard } from '../features/sources/SourceCard';
import { SourceDetailSheet } from '../features/sources/SourceDetailSheet';
import { customToDisplay } from '../features/sources/sourceState';
import { TOTALS } from '../lib/staticData';
import { getWeekStartKey } from '../lib/dateUtils';
import type { LearningSource } from '../types';
import styles from './ProgressPage.module.css';

export function ProgressPage() {
  const progress = useStore(s => s.progressState.progress);
  const updateProgress = useStore(s => s.updateProgress);
  const sessions = useStore(s => s.sessions.sessions);
  const customSources = useStore(s => s.library.customSources);
  const [detailId, setDetailId] = useState<string | null>(null);

  const sourceNames = Object.keys(TOTALS);

  const stats = useMemo(() => {
    const weekStart = getWeekStartKey(new Date());
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const daysStudied = new Set(weekSessions.map(s => s.date)).size;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    const activeNames = sourceNames.filter(name => (progress[name] || 0) > 0 && TOTALS[name]);
    const overallPct = activeNames.length
      ? Math.round(
          activeNames.reduce((sum, name) => sum + Math.min(1, (progress[name] || 0) / TOTALS[name]), 0) / activeNames.length * 100
        )
      : 0;

    return { daysStudied, sessions: weekSessions.length, hours: Math.round(totalMinutes / 60), overallPct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, progress]);

  const activeStatic = sourceNames.filter(name => {
    const done = progress[name] || 0;
    return done > 0 && done < (TOTALS[name] || Infinity);
  });
  const completedStatic = sourceNames.filter(name => (progress[name] || 0) >= (TOTALS[name] || Infinity));
  const notStartedStatic = sourceNames.filter(name => !(progress[name] || 0));

  const activeCustom = customSources.filter(c => c.status === 'in-progress' || c.status === 'paused');
  const completedCustom = customSources.filter(c => c.status === 'completed');

  const detailSource: LearningSource | null = customSources.find(c => c.id === detailId) || null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>تقدّمك</div>

      <ProgressHero pct={stats.overallPct} daysStudied={stats.daysStudied} sessions={stats.sessions} hours={stats.hours} />

      <WeeklyActivity />

      <WeeklyReviewCard />

      {(activeStatic.length > 0 || activeCustom.length > 0) && (
        <div className={styles.sourcesBlock}>
          <div className={styles.sectionLabel}>المسارات النشطة</div>
          <div className={styles.sourcesList}>
            {activeStatic.map(name => (
              <SourceProgressCard key={name} sourceName={name} done={progress[name] || 0} onEdit={v => updateProgress(name, v)} />
            ))}
            {activeCustom.map(src => (
              <SourceCard key={src.id} source={customToDisplay(src)} onOpenDetails={() => setDetailId(src.id)} />
            ))}
          </div>
        </div>
      )}

      {notStartedStatic.length > 0 && (
        <div className={styles.sourcesBlock}>
          <div className={styles.sectionLabel}>لم تبدأ بعد</div>
          <div className={styles.sourcesList}>
            {notStartedStatic.map(name => (
              <SourceProgressCard key={name} sourceName={name} done={progress[name] || 0} onEdit={v => updateProgress(name, v)} />
            ))}
          </div>
        </div>
      )}

      {(completedStatic.length > 0 || completedCustom.length > 0) && (
        <div className={styles.sourcesBlock}>
          <div className={styles.sectionLabel}>مكتمل</div>
          <div className={styles.sourcesList}>
            {completedStatic.map(name => (
              <SourceProgressCard key={name} sourceName={name} done={progress[name] || 0} onEdit={v => updateProgress(name, v)} />
            ))}
            {completedCustom.map(src => (
              <SourceCard key={src.id} source={customToDisplay(src)} onOpenDetails={() => setDetailId(src.id)} />
            ))}
          </div>
        </div>
      )}

      <SourceDetailSheet source={detailSource} onClose={() => setDetailId(null)} />
    </div>
  );
}
