import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import { useStore } from '../../store/useStore';
import { CUSTOM_STATE_LABELS, CONTENT_TYPE_LABEL, TRACKING_LABEL } from './sourceState';
import type { LearningSource, CustomSourceStatus } from '../../types';
import styles from './SourceDetailSheet.module.css';

interface SourceDetailSheetProps {
  source: LearningSource | null;
  onClose: () => void;
}

const STATUS_OPTIONS: CustomSourceStatus[] = ['not-started', 'in-progress', 'paused', 'completed'];

export function SourceDetailSheet({ source, onClose }: SourceDetailSheetProps) {
  const updateSourceUnits = useStore(s => s.updateSourceUnits);
  const setSourceStatus = useStore(s => s.setSourceStatus);
  const updateSource = useStore(s => s.updateSource);
  const deleteSource = useStore(s => s.deleteSource);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!source) return null;
  const Icon = ContentTypeIcons[source.contentType];
  const total = source.totalUnits ?? null;
  const pct = total ? Math.min(100, Math.round((source.completedUnits / total) * 100)) : source.status === 'completed' ? 100 : 0;

  function step(delta: number) {
    if (!source) return;
    updateSourceUnits(source.id, Math.max(0, source.completedUnits + delta));
  }

  function handleArchive() {
    if (!source) return;
    setSourceStatus(source.id, 'archived');
    onClose();
  }

  function handleDelete() {
    if (!source) return;
    deleteSource(source.id);
    onClose();
  }

  return (
    <BottomSheet open={!!source} onClose={onClose}>
      <div className={styles.headerRow}>
        <span className={styles.iconWrap}><Icon size={22} strokeWidth={1.8} /></span>
        <div>
          <div className={styles.title}>{source.title}</div>
          <div className={styles.subtitle}>{CONTENT_TYPE_LABEL[source.contentType]} • {TRACKING_LABEL[source.trackingType]}</div>
        </div>
      </div>

      {source.trackingType !== 'manual' && (
        <div className={styles.progressSection}>
          <div className={styles.progressRow}>
            <span className={styles.progressPct}>{pct}%</span>
            <span className={styles.progressCount}>{source.completedUnits}{total ? `/${total}` : ''} {TRACKING_LABEL[source.trackingType]}</span>
          </div>
          <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
          <div className={styles.unitControl}>
            <button className={styles.stepBtn} onClick={() => step(-1)} aria-label="إنقاص">−</button>
            <div className={styles.unitValue}>{source.completedUnits}</div>
            <button className={styles.stepBtn} onClick={() => step(1)} aria-label="زيادة">+</button>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>الحالة</div>
        <div className={styles.statusGrid}>
          {STATUS_OPTIONS.map(st => (
            <button
              key={st}
              className={`${styles.statusBtn} ${source.status === st ? styles.statusActive : ''}`}
              onClick={() => setSourceStatus(source.id, st)}
            >
              {CUSTOM_STATE_LABELS[st].label}
            </button>
          ))}
        </div>
      </div>

      {source.url && (
        <div className={styles.section}>
          <Button variant="secondary" full onClick={() => window.open(source.url!, '_blank', 'noopener,noreferrer')}>
            فتح الرابط
          </Button>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>ملاحظات</div>
        <textarea
          className={styles.notesBox}
          placeholder="ملاحظاتك على هذا المصدر..."
          defaultValue={source.notes || ''}
          onBlur={e => updateSource(source.id, { notes: e.target.value })}
        />
      </div>

      {!confirmDelete ? (
        <div className={styles.dangerRow}>
          <Button variant="secondary" icon={ActionIcons.archive} onClick={handleArchive} full>أرشفة</Button>
          <Button variant="danger" icon={ActionIcons.delete} onClick={() => setConfirmDelete(true)} full>حذف</Button>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>حذف المصدر؟ هيتحذف تقدمك وملاحظاتك بشكل نهائي — الأرشفة بديل آمن.</div>
          <div className={styles.dangerRow}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} full>تراجع</Button>
            <Button variant="danger" onClick={handleDelete} full>تأكيد الحذف</Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
