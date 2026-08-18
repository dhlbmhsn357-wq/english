import { ContentTypeIcons, ActionIcons } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import type { DisplaySource } from './sourceState';
import styles from './SourceCard.module.css';

interface SourceCardProps {
  source: DisplaySource;
  onContinue?: () => void;
  onOpenDetails?: () => void;
}

/** Card نظيف جدًا: أيقونة النوع + الاسم + التصنيف + الحالة + Progress + Next Action فقط */
export function SourceCard({ source, onContinue, onOpenDetails }: SourceCardProps) {
  const Icon = ContentTypeIcons[source.icon];
  const nextLabel = source.total
    ? `${source.done}/${source.total}`
    : source.kind === 'custom' && source.done > 0
      ? `${source.done} منجز`
      : null;

  return (
    <div className={styles.card} onClick={onOpenDetails} role={onOpenDetails ? 'button' : undefined}>
      <div className={styles.top}>
        <span className={styles.iconWrap}><Icon size={18} strokeWidth={1.8} /></span>
        <div className={styles.info}>
          <div className={styles.name}>{source.title}</div>
          {source.subtitle && <div className={styles.subtitle}>{source.subtitle}</div>}
        </div>
        <span className={styles.stateBadge} style={{ color: source.statusColor, borderColor: source.statusColor }}>
          {source.statusLabel}
        </span>
      </div>

      {source.total ? (
        <>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${source.pct}%`, background: source.isCompleted ? 'var(--success)' : 'var(--primary)' }} />
          </div>
          <div className={styles.metaRow}>
            <span>{nextLabel}</span>
            <span>{source.pct}%</span>
          </div>
        </>
      ) : source.kind === 'custom' && nextLabel ? (
        <div className={styles.metaRow}><span>{nextLabel}</span></div>
      ) : null}

      {!source.isCompleted && onContinue && (
        <Button
          variant="secondary"
          size="sm"
          icon={ActionIcons.start}
          full
          onClick={e => { e.stopPropagation(); onContinue(); }}
        >
          {source.done === 0 ? 'ابدأ' : 'متابعة'}{source.total ? ` — الحلقة ${source.done + 1}` : ''}
        </Button>
      )}
    </div>
  );
}
