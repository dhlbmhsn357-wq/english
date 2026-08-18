import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { DAY_LABELS_SAT_FIRST, computeAvailableMinutes } from '../../lib/planEngine';
import { PlanIcons, NavIcons } from '../../components/icons';
import { DayEditorSheet } from './DayEditorSheet';
import type { WeekDayIndex } from '../../types';
import styles from './PlannerPage.module.css';

/**
 * بند 13، 28، 65 — Weekly Planner: أسبوعك بالكامل تحت تحكّمك. مفيش خطة
 * ثابتة، كل يوم بإعداداته الخاصة (وقت/مدة/راحة) ومهامه الخاصة.
 */
export function PlannerPage() {
  const template = useStore(s => s.plan.template);
  const [editDay, setEditDay] = useState<WeekDayIndex | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>خطة التعلم</div>
      <div className={styles.subtitle}>حدد أيامك وساعاتك ومحتواك — التطبيق يهتم بالباقي</div>

      <div className={styles.weekGrid}>
        {DAY_LABELS_SAT_FIRST.map(({ index, label }) => {
          const dayTpl = template.days.find(d => d.day === index);
          if (!dayTpl) return null;
          const isRest = dayTpl.mode === 'rest' || !dayTpl.enabled;
          const available = computeAvailableMinutes(dayTpl);
          const planned = dayTpl.items.reduce((s, i) => s + i.estimatedMinutes, 0);
          const over = available > 0 && planned > available;
          const pct = available > 0 ? Math.min(100, Math.round((planned / available) * 100)) : 0;

          return (
            <button key={index} className={`${styles.dayCard} ${isRest ? styles.dayCardRest : ''}`} onClick={() => setEditDay(index)}>
              <span className={styles.dayIconWrap}>
                {isRest ? <PlanIcons.rest size={18} strokeWidth={1.8} /> : <NavIcons.plan size={18} strokeWidth={1.8} />}
              </span>
              <div className={styles.dayBody}>
                <div className={styles.dayName}>{label}</div>
                <div className={styles.dayMeta}>
                  {isRest ? 'راحة' : dayTpl.items.length > 0 ? `${dayTpl.items.length} ${dayTpl.items.length === 1 ? 'مهمة' : 'مهام'}` : 'مفيش مهام بعد'}
                </div>
              </div>
              {!isRest && planned > 0 && (
                <div className={styles.dayCapacity}>
                  <div className={styles.dayCapacityValue}>{planned}{available ? `/${available}` : ''}د</div>
                  {available > 0 && (
                    <div className={styles.dayCapacityBar}>
                      <div className={`${styles.dayCapacityFill} ${over ? styles.dayCapacityOver : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <DayEditorSheet day={editDay} onClose={() => setEditDay(null)} />
    </div>
  );
}
