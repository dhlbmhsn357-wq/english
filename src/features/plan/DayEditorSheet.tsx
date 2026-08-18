import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { ActionIcons, ContentTypeIcons, PlanIcons } from '../../components/icons';
import { AddPlanItemSheet } from './AddPlanItemSheet';
import { useStore } from '../../store/useStore';
import { computeAvailableMinutes, dayLabel, trackingUnitLabel } from '../../lib/planEngine';
import { STATIC_CONTENT_TYPE } from '../../lib/staticData';
import type { WeekDayIndex, DayScheduleMode, SourcePriority } from '../../types';
import styles from './DayEditorSheet.module.css';

interface DayEditorSheetProps {
  day: WeekDayIndex | null;
  onClose: () => void;
}

const MODES: { key: DayScheduleMode; label: string }[] = [
  { key: 'fixed', label: 'وقت محدد' }, { key: 'duration', label: 'مدة فقط' }, { key: 'rest', label: 'راحة' }
];

const PRIORITY_CYCLE: Record<SourcePriority, SourcePriority> = { primary: 'secondary', secondary: 'optional', optional: 'primary' };
const PRIORITY_LABEL: Record<SourcePriority, string> = { primary: 'أساسي', secondary: 'ثانوي', optional: 'إضافي' };

export function DayEditorSheet({ day, onClose }: DayEditorSheetProps) {
  const template = useStore(s => s.plan.template);
  const updateDayTemplate = useStore(s => s.updateDayTemplate);
  const addTemplateItem = useStore(s => s.addTemplateItem);
  const removeTemplateItem = useStore(s => s.removeTemplateItem);
  const updateTemplateItem = useStore(s => s.updateTemplateItem);
  const reorderTemplateItems = useStore(s => s.reorderTemplateItems);
  const [addOpen, setAddOpen] = useState(false);

  const dayTpl = day !== null ? template.days.find(d => d.day === day) : null;

  if (day === null || !dayTpl) return null;
  const dayIndex: WeekDayIndex = day;

  const available = computeAvailableMinutes(dayTpl);
  const planned = dayTpl.items.reduce((s, i) => s + i.estimatedMinutes, 0);
  const over = available > 0 && planned > available;
  const pct = available > 0 ? Math.min(100, Math.round((planned / available) * 100)) : 0;

  function moveItem(idx: number, dir: -1 | 1) {
    const ids = dayTpl!.items.slice().sort((a, b) => a.order - b.order).map(i => i.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    reorderTemplateItems(dayIndex, ids);
  }

  return (
    <BottomSheet open={day !== null} onClose={onClose} title={dayLabel(day)}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>نوع اليوم</div>
        <div className={styles.modeGrid}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={`${styles.modeBtn} ${dayTpl.mode === m.key ? styles.modeActive : ''}`}
              onClick={() => updateDayTemplate(day, { mode: m.key, enabled: m.key !== 'rest' })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {dayTpl.mode === 'fixed' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>فترات التعلّم</div>
          {dayTpl.windows.map((w, i) => (
            <div key={i} className={styles.windowRow} dir="ltr">
              <input
                type="time" className={styles.timeInput} value={w.start}
                onChange={e => {
                  const windows = dayTpl.windows.map((x, xi) => (xi === i ? { ...x, start: e.target.value } : x));
                  updateDayTemplate(day, { windows });
                }}
              />
              <ActionIcons.next size={14} className={styles.arrow} />
              <input
                type="time" className={styles.timeInput} value={w.end}
                onChange={e => {
                  const windows = dayTpl.windows.map((x, xi) => (xi === i ? { ...x, end: e.target.value } : x));
                  updateDayTemplate(day, { windows });
                }}
              />
              <button className={styles.removeWindowBtn} onClick={() => updateDayTemplate(day, { windows: dayTpl.windows.filter((_, xi) => xi !== i) })}>
                <ActionIcons.delete size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}
          <button className={styles.addWindowBtn} onClick={() => updateDayTemplate(day, { windows: [...dayTpl.windows, { start: '20:00', end: '21:00' }] })}>
            + إضافة فترة أخرى
          </button>
        </div>
      )}

      {dayTpl.mode === 'duration' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>هدف اليوم (دقيقة)</div>
          <input
            type="number" min={0} className={styles.timeInput} style={{ width: '100%' }}
            value={dayTpl.durationMinutes ?? 0}
            onChange={e => updateDayTemplate(day, { durationMinutes: Number(e.target.value) || 0 })}
          />
        </div>
      )}

      {dayTpl.mode !== 'rest' && (
        <>
          <div className={styles.section}>
            <div className={styles.capacityRow}>
              <span className={styles.capacityLabel}>الوقت المخطط</span>
              <span className={styles.capacityValue}>{planned} / {available || '—'} دقيقة</span>
            </div>
            {available > 0 && (
              <div className={styles.capacityTrack}>
                <div className={`${styles.capacityFill} ${over ? styles.capacityOver : ''}`} style={{ width: `${pct}%` }} />
              </div>
            )}
            {over && <div className={styles.capacityLabel} style={{ color: 'var(--warning)', marginTop: 4 }}>الخطة تتجاوز وقتك بـ{planned - available} دقيقة</div>}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>المهام</div>
            <div className={styles.itemsList}>
              {dayTpl.items.length === 0 ? (
                <div className={styles.emptyHint}>مفيش مهام في اليوم ده لسه</div>
              ) : dayTpl.items.slice().sort((a, b) => a.order - b.order).map((item, idx) => {
                const Icon = item.sourceKind === 'static' ? ContentTypeIcons[STATIC_CONTENT_TYPE[item.sourceName] || 'other'] : ContentTypeIcons.other;
                return (
                  <div key={item.id} className={styles.itemRow}>
                    <Icon size={16} strokeWidth={1.8} />
                    <div className={styles.itemBody}>
                      <div className={styles.itemName}>{item.sourceName}</div>
                      <div className={styles.itemMeta}>{item.targetAmount} {trackingUnitLabel(item.trackingType)} • {item.estimatedMinutes} دقيقة</div>
                    </div>
                    <button
                      className={`${styles.priorityPill} ${item.priority === 'primary' ? styles.priorityPrimary : ''}`}
                      onClick={() => updateTemplateItem(day, item.id, { priority: PRIORITY_CYCLE[item.priority] })}
                    >
                      {PRIORITY_LABEL[item.priority]}
                    </button>
                    <IconButton icon={PlanIcons.moveUp} label="لأعلى" size="sm" onClick={() => moveItem(idx, -1)} />
                    <IconButton icon={PlanIcons.moveDown} label="لأسفل" size="sm" onClick={() => moveItem(idx, 1)} />
                    <button className={styles.priorityDanger} onClick={() => removeTemplateItem(day, item.id)}>
                      <ActionIcons.delete size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <Button variant="secondary" full icon={ActionIcons.add} onClick={() => setAddOpen(true)}>إضافة من المكتبة</Button>
        </>
      )}

      <AddPlanItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={item => { addTemplateItem(day, item); setAddOpen(false); }}
      />
    </BottomSheet>
  );
}
