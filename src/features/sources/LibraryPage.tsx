import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { TOTALS, SOURCE_META, PDF_BOOKS } from '../../lib/staticData';
import { SourceCard } from './SourceCard';
import { getSourceState } from './sourceState';
import { EmptyState } from '../../components/EmptyState';
import type { SourceState } from '../../types';
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
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const allSourceNames = Object.keys(TOTALS);

  const filtered = useMemo(() => {
    return allSourceNames.filter(name => {
      const meta = SOURCE_META[name];
      const state: SourceState = getSourceState(name, progress, !!stopped[name] && Object.keys(stopped[name]).length > 0);

      if (filter === 'in-progress' && state !== 'in-progress' && state !== 'stopped') return false;
      if (filter === 'completed' && state !== 'completed') return false;
      if (filter === 'zad' && !name.startsWith('Zad:')) return false;
      if (filter === 'english' && !['Listening Time Podcast', 'Speak English With Class'].includes(name)) return false;
      if (filter === 'islamic' && (name.startsWith('Zad:') || ['Listening Time Podcast', 'Speak English With Class'].includes(name))) return false;

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${name} ${meta?.presenter || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, progress, stopped]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>📺 مكتبة التعلم</div>

      <input
        className={styles.search}
        placeholder="ابحث عن مصدر، شيخ، أو مادة..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="بحث في المصادر"
      />

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

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="مفيش نتائج" subtitle="جرب فلتر مختلف أو كلمة بحث تانية." />
      ) : (
        <div className={styles.grid}>
          {filtered.map(name => (
            <SourceCard
              key={name}
              sourceName={name}
              progress={progress[name] || 0}
              hasStopped={!!stopped[name] && Object.keys(stopped[name]).length > 0}
              onContinue={() => onContinueSource(name)}
            />
          ))}
        </div>
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
    </div>
  );
}

function PdfLink({ name, url }: { name: string; url: string }) {
  return (
    <a className={styles.pdfLink} href={url} target="_blank" rel="noopener noreferrer">
      📄 {name}
    </a>
  );
}
