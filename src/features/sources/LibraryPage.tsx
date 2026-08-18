import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { TOTALS, SOURCE_META, PDF_BOOKS } from '../../lib/staticData';
import { SourceCard } from './SourceCard';
import { AddSourceSheet } from './AddSourceSheet';
import { SourceDetailSheet } from './SourceDetailSheet';
import { staticToDisplay, customToDisplay, type DisplaySource } from './sourceState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/Button';
import { ActionIcons } from '../../components/icons';
import type { LearningSource } from '../../types';
import styles from './LibraryPage.module.css';

type FilterKey = 'all' | 'in-progress' | 'completed' | 'islamic' | 'english' | 'zad';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'in-progress', label: 'جاري' },
  { key: 'completed', label: 'مكتمل' },
  { key: 'islamic', label: 'إسلامي' },
  { key: 'english', label: 'إنجليزي' },
  { key: 'zad', label: 'زاد' }
];

interface LibraryPageProps {
  onContinueSource: (sourceName: string) => void;
}

export function LibraryPage({ onContinueSource }: LibraryPageProps) {
  const progress = useStore(s => s.progressState.progress);
  const stopped = useStore(s => s.tasksState.stopped);
  const customSources = useStore(s => s.library.customSources);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const allSourceNames = Object.keys(TOTALS);
  const activeCustom = customSources.filter(c => c.status !== 'archived');

  const staticDisplays = useMemo(() => {
    return allSourceNames
      .filter(name => {
        const meta = SOURCE_META[name];
        if (filter === 'zad' && !name.startsWith('Zad:')) return false;
        if (filter === 'english' && !['Listening Time Podcast', 'Speak English With Class'].includes(name)) return false;
        if (filter === 'islamic' && (name.startsWith('Zad:') || ['Listening Time Podcast', 'Speak English With Class'].includes(name))) return false;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          if (!`${name} ${meta?.presenter || ''}`.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map(name => staticToDisplay(name, progress, !!stopped[name] && Object.keys(stopped[name]).length > 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, progress, stopped]);

  const customDisplays = useMemo(() => {
    return activeCustom
      .filter(src => {
        if (query.trim() && !src.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
        return true;
      })
      .map(customToDisplay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustom, query]);

  const all = [...staticDisplays, ...customDisplays];
  const inProgress = all.filter(d => d.isActive);
  const completed = all.filter(d => d.isCompleted);
  const restList = all.filter(d => !d.isActive && !d.isCompleted);

  const filteredByStatus = filter === 'in-progress' ? all.filter(d => d.isActive) : filter === 'completed' ? all.filter(d => d.isCompleted) : null;

  const detailSource: LearningSource | null = customSources.find(c => c.id === detailId) || null;

  function handleCardAction(d: DisplaySource) {
    if (d.kind === 'static') onContinueSource(d.id);
    else setDetailId(d.id);
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.header}>مكتبة التعلم</div>
        <Button variant="primary" size="sm" icon={ActionIcons.add} onClick={() => setAddOpen(true)}>إضافة مصدر</Button>
      </div>

      <div className={styles.searchWrap}>
        <ActionIcons.search size={16} strokeWidth={1.8} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="ابحث عن مصدر، شيخ، أو مادة..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="بحث في المصادر"
        />
      </div>

      <div className={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterChip} ${filter === f.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <EmptyState title="مكتبتك لسه فاضية" subtitle="أضف أول مصدر تتعلم منه." action={{ label: 'إضافة مصدر', onClick: () => setAddOpen(true) }} />
      ) : filteredByStatus !== null ? (
        filteredByStatus.length === 0 ? (
          <EmptyState title="مفيش نتائج" subtitle="جرب فلتر مختلف أو كلمة بحث تانية." />
        ) : (
          <SourceGrid items={filteredByStatus} onAction={handleCardAction} />
        )
      ) : (
        <>
          {inProgress.length > 0 && <Group title="جاري الآن" items={inProgress} onAction={handleCardAction} />}
          {restList.length > 0 && <Group title="باقي المكتبة" items={restList} onAction={handleCardAction} />}
          {completed.length > 0 && <Group title="مكتمل" items={completed} onAction={handleCardAction} />}
        </>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>كتب زاد PDF (إنجليزي)</div>
        <div className={styles.pdfGrid}>
          {PDF_BOOKS.en.map(b => <PdfLink key={b.url} name={b.name} url={b.url} />)}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>كتب زاد PDF (عربي)</div>
        <div className={styles.pdfGrid}>
          {PDF_BOOKS.ar.map(b => <PdfLink key={b.url} name={b.name} url={b.url} />)}
        </div>
      </div>

      <AddSourceSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <SourceDetailSheet source={detailSource} onClose={() => setDetailId(null)} />
    </div>
  );
}

function Group({ title, items, onAction }: { title: string; items: DisplaySource[]; onAction: (d: DisplaySource) => void }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{title}</div>
      <SourceGrid items={items} onAction={onAction} />
    </div>
  );
}

function SourceGrid({ items, onAction }: { items: DisplaySource[]; onAction: (d: DisplaySource) => void }) {
  return (
    <div className={styles.grid}>
      {items.map(d => (
        <SourceCard
          key={d.id}
          source={d}
          onContinue={!d.isCompleted ? () => onAction(d) : undefined}
          onOpenDetails={d.kind === 'custom' ? () => onAction(d) : undefined}
        />
      ))}
    </div>
  );
}

function PdfLink({ name, url }: { name: string; url: string }) {
  return (
    <a className={styles.pdfLink} href={url} target="_blank" rel="noopener noreferrer">
      {name}
    </a>
  );
}
