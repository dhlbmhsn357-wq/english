import { useMemo } from 'react';
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
import { getTasks } from '../lib/taskEngine';
import { todayKey } from '../lib/dateUtils';
import styles from './TodayPage.module.css';

interface TodayPageProps {
  onStartSession: (taskId: string, sourceName: string, episode: number, isCarryover: boolean, carryId?: string) => void;
}

export function TodayPage({ onStartSession }: TodayPageProps) {
  const dailyModes = useStore(s => s.dailyPlan.dailyModes);
  const tasksState = useStore(s => s.tasksState.tasks);
  const carryover = useStore(s => s.carryoverState.carryover);
  const islamicPhase = useStore(s => s.progressState.islamicPhase);
  const progress = useStore(s => s.progressState.progress);

  const t = todayKey();
  const mode = dailyModes[t] || null;

  const tasks = useMemo(
    () => (mode ? getTasks(mode, t, islamicPhase, progress) : []),
    [mode, t, islamicPhase, progress]
  );

  const allDone = mode && tasks.length > 0 && tasks.every(task => (tasksState[t + '_' + task.id] || {}).done) && carryover.length === 0;
  const islamicDoneToday = tasks.some(task => task.type !== 'vocab' && (tasksState[t + '_' + task.id] || {}).done);

  return (
    <>
      <div className={styles.mainColumn}>
        <div className={styles.stack}>
          <DailyModeSelector />

          {mode && <DailyPlanSummary />}

          <CarryoverSection onStart={onStartSession} />

          <NextActionCard onStart={onStartSession} />

          {allDone && <DayCompleteCard />}

          {mode && tasks.length > 0 && (
            <div className={styles.tasksBlock}>
              <div className={styles.sectionLabel}>مهام النهارده</div>
              <div className={styles.tasksList}>
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    taskKey={`${t}_${task.id}`}
                    isDone={!!(tasksState[t + '_' + task.id] || {}).done}
                    onStart={() => onStartSession(task.id, task.name, (progress[task.name] || 0) + 1, false)}
                  />
                ))}
              </div>
            </div>
          )}

          {islamicDoneToday && <SpeakingChallengeCard />}

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

