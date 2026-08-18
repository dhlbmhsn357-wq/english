import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DailyModeSelector } from '../features/tasks/DailyModeSelector';
import { NextActionCard } from '../features/tasks/NextActionCard';
import { CarryoverSection } from '../features/tasks/CarryoverSection';
import { DailyPlanSummary } from '../features/tasks/DailyPlanSummary';
import { TaskCard } from '../features/tasks/TaskCard';
import { DayCompleteCard } from '../features/tasks/DayCompleteCard';
import { SpeakingChallengeCard } from '../features/session/SpeakingChallengeCard';
import { VocabularyCard } from '../features/vocabulary/VocabularyCard';
import { WeeklyWinCard } from '../features/review/WeeklyWinCard';
import { todayKey } from '../lib/dateUtils';
import styles from './TodayPage.module.css';

interface TodayPageProps {
  onStartSession: (date: string, itemId: string, isCarryover: boolean, carryId?: string) => void;
}

/**
 * بند 41-42 — الصفحة دي مبنتبنيش Tasks من Hardcoded Logic. بتقرأ
 * DailyPlanInstance بتاع النهاردة (لقطة اتاخدت من WeeklyPlanTemplate)
 * وتعرض المهام اللي المستخدم نفسه اختارها.
 */
export function TodayPage({ onStartSession }: TodayPageProps) {
  const dailyModes = useStore(s => s.dailyPlan.dailyModes);
  const carryover = useStore(s => s.carryoverState.carryover);
  const instance = useStore(s => s.plan.instances[todayKey()]);
  const ensureDailyInstance = useStore(s => s.ensureDailyInstance);

  const t = todayKey();
  const dailyMode = dailyModes[t] || null;

  useEffect(() => {
    if (!instance) ensureDailyInstance(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, instance]);

  // بند 46-47 — Busy/Free بقى فلتر أولوية على نفس الخطة، مش مجموعة مهام تانية
  const visibleItems = useMemo(() => {
    if (!instance) return [];
    const pending = instance.items.filter(i => i.status !== 'skipped');
    if (dailyMode === 'busy') return pending.filter(i => i.priority === 'primary');
    return pending;
  }, [instance, dailyMode]);

  const allDone = !!dailyMode && visibleItems.length > 0 && visibleItems.every(i => i.status === 'done') && carryover.length === 0;

  return (
    <>
      <div className={styles.mainColumn}>
        <div className={styles.stack}>
          <DailyModeSelector />

          {dailyMode && instance && <DailyPlanSummary instance={instance} visibleItems={visibleItems} />}

          <CarryoverSection onStart={onStartSession} />

          <NextActionCard visibleItems={visibleItems} onStart={onStartSession} />

          {allDone && <DayCompleteCard />}

          {dailyMode && visibleItems.length > 0 && (
            <div className={styles.tasksBlock}>
              <div className={styles.sectionLabel}>مهام النهارده</div>
              <div className={styles.tasksList}>
                {visibleItems.map(item => (
                  <TaskCard
                    key={item.id}
                    item={item}
                    onStart={() => onStartSession(t, item.id, false)}
                  />
                ))}
              </div>
            </div>
          )}

          <SpeakingChallengeCard />

          {/* على الموبايل/تابلت: الكروت دي بتظهر هنا تحت المحتوى الرئيسي */}
          <div className={styles.mobileSideStack}>
            <VocabularyCard />
            <WeeklyWinCard />
          </div>
        </div>
      </div>

      {/* على الديسكتوب: نفس الكروت بتظهر في الـ sidebar الجانبي */}
      <div className={styles.sideColumn}>
        <VocabularyCard />
        <WeeklyWinCard />
      </div>
    </>
  );
}
