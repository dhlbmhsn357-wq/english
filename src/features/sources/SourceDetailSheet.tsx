import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import { ContentTypeIcons, ActionIcons, ReaderIcons } from '../../components/icons';
import { MilestoneTimeline } from '../progress/MilestoneTimeline';
import { useStore } from '../../store/useStore';
import { getHighlightsForSource, getNotesForSource, deleteHighlight, deleteNote, deleteAllPdfDataForSource } from '../../lib/db';
import { CUSTOM_STATE_LABELS, CONTENT_TYPE_LABEL, TRACKING_LABEL } from './sourceState';
import type { LearningSource, CustomSourceStatus, PdfHighlight, PdfNote } from '../../types';
import styles from './SourceDetailSheet.module.css';

interface SourceDetailSheetProps {
  source: LearningSource | null;
  onClose: () => void;
  onOpenReader?: (sourceId: string, page?: number) => void;
}

const STATUS_OPTIONS: CustomSourceStatus[] = ['not-started', 'in-progress', 'paused', 'completed'];
const HIGHLIGHT_HEX: Record<string, string> = { yellow: '#f5c518', green: '#22c55e', blue: '#3b82f6', red: '#ef4444' };

type Tab = 'overview' | 'highlights' | 'notes' | 'vocab';

export function SourceDetailSheet({ source, onClose, onOpenReader }: SourceDetailSheetProps) {
  const updateSourceUnits = useStore(s => s.updateSourceUnits);
  const setSourceStatus = useStore(s => s.setSourceStatus);
  const updateSource = useStore(s => s.updateSource);
  const deleteSource = useStore(s => s.deleteSource);
  const vocab = useStore(s => s.vocabulary.vocab);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [notes, setNotes] = useState<PdfNote[]>([]);

  const isPdf = source?.contentType === 'pdf';

  useEffect(() => {
    setTab('overview');
    if (source && isPdf) {
      getHighlightsForSource(source.id).then(setHighlights);
      getNotesForSource(source.id).then(setNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);

  if (!source) return null;
  const Icon = ContentTypeIcons[source.contentType];
  const total = source.totalUnits ?? null;
  const pct = total ? Math.min(100, Math.round((source.completedUnits / total) * 100)) : source.status === 'completed' ? 100 : 0;
  const sourceVocab = vocab.filter(w => w.sourceId === source.id);

  function step(delta: number) {
    if (!source) return;
    updateSourceUnits(source.id, Math.max(0, source.completedUnits + delta));
  }

  function handleArchive() {
    if (!source) return;
    setSourceStatus(source.id, 'archived');
    onClose();
  }

  async function handleDelete() {
    if (!source) return;
    if (isPdf) await deleteAllPdfDataForSource(source.id);
    deleteSource(source.id);
    onClose();
  }

  async function handleDeleteHighlight(id: string) {
    await deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }

  async function handleDeleteNote(id: string) {
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function jumpTo(page: number) {
    onOpenReader?.(source!.id, page);
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

      {isPdf && (
        <>
          <Button variant="primary" full icon={ReaderIcons.back} onClick={() => onOpenReader?.(source.id)} className={styles.readBtn}>
            {source.currentPage && source.currentPage > 1 ? `متابعة من صفحة ${source.currentPage}` : 'اقرأ الآن'}
          </Button>
          <div className={styles.tabBar}>
            {(['overview', 'highlights', 'notes', 'vocab'] as Tab[]).map(t => (
              <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' ? 'نظرة عامة' : t === 'highlights' ? `Highlights (${highlights.length})` : t === 'notes' ? `ملاحظاتي (${notes.length})` : `كلمات الكتاب (${sourceVocab.length})`}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'highlights' && (
        <div className={styles.listSection}>
          {highlights.length === 0 ? (
            <div className={styles.emptyHint}>لسه مفيش Highlights في الكتاب ده</div>
          ) : highlights.sort((a, b) => a.page - b.page).map(h => (
            <div key={h.id} className={styles.listItem} onClick={() => jumpTo(h.page)}>
              <span className={styles.colorDot} style={{ background: HIGHLIGHT_HEX[h.color] }} />
              <div className={styles.listItemBody}>
                <div className={styles.listItemText}>{h.text}</div>
                <div className={styles.listItemMeta}>صفحة {h.page}</div>
              </div>
              <button className={styles.listItemDelete} onClick={e => { e.stopPropagation(); handleDeleteHighlight(h.id); }} aria-label="حذف">
                <ActionIcons.delete size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className={styles.listSection}>
          {notes.length === 0 ? (
            <div className={styles.emptyHint}>لسه مفيش ملاحظات في الكتاب ده</div>
          ) : notes.sort((a, b) => a.page - b.page).map(n => (
            <div key={n.id} className={styles.listItem} onClick={() => jumpTo(n.page)}>
              <span className={styles.noteIconWrap}><ReaderIcons.note size={14} strokeWidth={1.8} /></span>
              <div className={styles.listItemBody}>
                <div className={styles.listItemQuote}>"{n.selectedText}"</div>
                <div className={styles.listItemText}>{n.note}</div>
                <div className={styles.listItemMeta}>صفحة {n.page}</div>
              </div>
              <button className={styles.listItemDelete} onClick={e => { e.stopPropagation(); handleDeleteNote(n.id); }} aria-label="حذف">
                <ActionIcons.delete size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'vocab' && (
        <div className={styles.listSection}>
          {sourceVocab.length === 0 ? (
            <div className={styles.emptyHint}>لسه مفيش كلمات محفوظة من الكتاب ده</div>
          ) : sourceVocab.map(w => (
            <div key={w.id} className={styles.listItem} onClick={() => w.page && jumpTo(w.page)}>
              <div className={styles.listItemBody}>
                <div className={styles.listItemText}>{w.word} — {w.meaning}</div>
                {w.page && <div className={styles.listItemMeta}>صفحة {w.page}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'overview' && (
        <>
          {source.status === 'completed' && (
            <div className={styles.celebrationBanner}>
              <ActionIcons.award size={22} strokeWidth={1.8} />
              <div>
                <div className={styles.celebrationTitle}>أكملت المصدر</div>
                <div className={styles.celebrationMeta}>
                  {total ? `${total} ${TRACKING_LABEL[source.trackingType]}` : ''}
                  {total && source.updatedAt ? ' • ' : ''}
                  {source.updatedAt ? new Date(source.updatedAt).toLocaleDateString('ar-EG') : ''}
                </div>
              </div>
            </div>
          )}

          {source.trackingType !== 'manual' && (
            <div className={styles.progressSection}>
              <div className={styles.progressRow}>
                <span className={styles.progressPct}>{pct}%</span>
                <span className={styles.progressCount}>{source.completedUnits}{total ? `/${total}` : ''} {TRACKING_LABEL[source.trackingType]}</span>
              </div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
              {!isPdf && (
                <div className={styles.unitControl}>
                  <button className={styles.stepBtn} onClick={() => step(-1)} aria-label="إنقاص">−</button>
                  <div className={styles.unitValue}>{source.completedUnits}</div>
                  <button className={styles.stepBtn} onClick={() => step(1)} aria-label="زيادة">+</button>
                </div>
              )}
              {total && total >= 8 && (
                <MilestoneTimeline done={source.completedUnits} total={total} unitLabel={TRACKING_LABEL[source.trackingType]} />
              )}
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
        </>
      )}
    </BottomSheet>
  );
}
