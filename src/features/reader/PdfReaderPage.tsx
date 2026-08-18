import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib, type PDFDocumentProxy } from '../../lib/pdfjs';
import { getPdfFile, getHighlightsForSource, getNotesForSource, saveHighlight, saveNote as dbSaveNote } from '../../lib/db';
import { buildPageText, getSelectionAnchor, wrapRange, clearHighlightSpans, HIGHLIGHT_CLASS } from './textAnchor';
import { SelectionToolbar } from './SelectionToolbar';
import { WordSheet } from './WordSheet';
import { NoteSheet } from './NoteSheet';
import { ReaderIcons } from '../../components/icons';
import { IconButton } from '../../components/ui/IconButton';
import { useStore } from '../../store/useStore';
import { genId } from '../../lib/utils';
import { pronounce } from '../../lib/pronunciation';
import type { HighlightColor, PdfHighlight, PdfNote, LearningSource, TextAnchor } from '../../types';
import styles from './PdfReaderPage.module.css';

const HIGHLIGHT_HEX: Record<HighlightColor, string> = { yellow: '#f5c518', green: '#22c55e', blue: '#3b82f6', red: '#ef4444' };

interface PdfReaderPageProps {
  sourceId: string;
  jumpToPage?: number;
  onExit: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

export function PdfReaderPage({ sourceId, jumpToPage, onExit }: PdfReaderPageProps) {
  const source = useStore(s => s.library.customSources.find(src => src.id === sourceId));
  const updateReadingPosition = useStore(s => s.updateReadingPosition);
  const startReadingSession = useStore(s => s.startReadingSession);
  const endReadingSession = useStore(s => s.endReadingSession);
  const bumpReadingStat = useStore(s => s.bumpReadingStat);
  const showToast = useStore(s => s.showToast);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [notes, setNotes] = useState<PdfNote[]>([]);
  const [selectionInfo, setSelectionInfo] = useState<{ rect: { top: number; left: number; width: number }; text: string; anchor: { charStart: number; charEnd: number } } | null>(null);
  const [wordSheet, setWordSheet] = useState<{ word: string; sentence: string } | null>(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingNoteAnchor, setPendingNoteAnchor] = useState<{ text: string; anchor: TextAnchor } | null>(null);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const textDivsRef = useRef<HTMLElement[]>([]);
  const pageTextRef = useRef('');
  const renderGenRef = useRef(0);
  const positionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceRef = useRef<LearningSource | undefined>(source);
  sourceRef.current = source;
  const pageRef = useRef(page);
  pageRef.current = page;

  // ---------------- تحميل الملف + بدء جلسة القراءة (بند 2، 5) ----------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const src = sourceRef.current;
      if (!src) { setLoadState('error'); setErrorMsg('المصدر غير موجود'); return; }
      setLoadState('loading');
      try {
        let data: ArrayBuffer;
        if (src.fileRef) {
          const stored = await getPdfFile(src.fileRef);
          if (!stored) throw new Error('الملف غير موجود على الجهاز — جرب ترفعه تاني من تفاصيل المصدر');
          data = await stored.blob.arrayBuffer();
        } else if (src.fileUrl) {
          if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline-url');
          const res = await fetch(src.fileUrl);
          if (!res.ok) throw new Error('تعذّر تحميل الملف من الرابط');
          data = await res.arrayBuffer();
        } else {
          throw new Error('لا يوجد ملف مرتبط بهذا المصدر');
        }

        const loadingTask = pdfjsLib.getDocument({ data });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) { loadingTask.destroy(); return; }

        docRef.current = doc;
        setNumPages(doc.numPages);

        const [hl, nt] = await Promise.all([getHighlightsForSource(sourceId), getNotesForSource(sourceId)]);
        if (cancelled) return;
        setHighlights(hl);
        setNotes(nt);

        const startPage = Math.min(Math.max(1, jumpToPage || src.lastOpenedPage || 1), doc.numPages);
        setPage(startPage);
        setPageInput(String(startPage));
        setLoadState('ready');
        startReadingSession(sourceId, src.title, startPage);
      } catch (e) {
        if (cancelled) return;
        console.error('PDF load failed:', e);
        const msg = e instanceof Error ? e.message : 'تعذّر فتح الملف';
        setErrorMsg(msg === 'offline-url' ? 'محتاج اتصال بالإنترنت أول مرة لفتح هذا الملف' : msg);
        setLoadState('error');
      }
    }

    load();
    return () => {
      cancelled = true;
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  // ---------------- إنهاء الجلسة + الحفظ الأخير عند الخروج (بند 4، 26) ----------------
  const flushPosition = useCallback(() => {
    const src = sourceRef.current;
    if (!src) return;
    if (positionDebounceRef.current) { clearTimeout(positionDebounceRef.current); positionDebounceRef.current = null; }
    updateReadingPosition(sourceId, pageRef.current, src.totalUnits ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  useEffect(() => {
    function onVisibility() { if (document.visibilityState === 'hidden') flushPosition(); }
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', flushPosition);
    return () => {
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', flushPosition);
      flushPosition();
      endReadingSession(pageRef.current);
      loadingTaskRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- رسم الصفحة الحالية (Canvas + TextLayer) (بند 32-33: صفحة واحدة بس في الذاكرة) ----------------
  useEffect(() => {
    if (loadState !== 'ready' || !docRef.current) return;
    const doc = docRef.current;
    const myGen = ++renderGenRef.current;
    let renderTask: { promise: Promise<unknown>; cancel: () => void } | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      const textLayerEl = textLayerRef.current;
      if (!canvas || !textLayerEl) return;

      const pdfPage = await doc.getPage(page);
      if (myGen !== renderGenRef.current) return;
      const viewport = pdfPage.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderTask = pdfPage.render({ canvasContext: ctx, viewport, canvas });
      await renderTask.promise;
      if (myGen !== renderGenRef.current) return;

      textLayerEl.innerHTML = '';
      textLayerEl.style.width = viewport.width + 'px';
      textLayerEl.style.height = viewport.height + 'px';

      const textContent = await pdfPage.getTextContent();
      if (myGen !== renderGenRef.current) return;

      const textLayer = new pdfjsLib.TextLayer({ textContentSource: textContent, container: textLayerEl, viewport });
      await textLayer.render();
      if (myGen !== renderGenRef.current) return;

      const divs = textLayer.textDivs as HTMLElement[];
      textDivsRef.current = divs;
      pageTextRef.current = buildPageText(divs);

      // إعادة رسم الـ Highlights المحفوظة لهذه الصفحة — ثابتة مع الـ Zoom لأنها char-offset مش x/y
      clearHighlightSpans(textLayerEl, HIGHLIGHT_CLASS);
      highlights.filter(h => h.page === page).forEach(h => {
        wrapRange(divs, h.anchor.charStart, h.anchor.charEnd, HIGHLIGHT_CLASS, {
          backgroundColor: HIGHLIGHT_HEX[h.color] + '55',
          borderRadius: '2px'
        });
      });
    }

    renderPage().catch(e => console.error('renderPage failed:', e));
    return () => { renderTask?.cancel(); };
  }, [loadState, page, scale, highlights]);

  // ---------------- تتبع موضع القراءة (Autosave مؤجّل قصير) (بند 4، 18، 26) ----------------
  useEffect(() => {
    if (loadState !== 'ready') return;
    setPageInput(String(page));
    if (positionDebounceRef.current) clearTimeout(positionDebounceRef.current);
    positionDebounceRef.current = setTimeout(() => {
      updateReadingPosition(sourceId, page, sourceRef.current?.totalUnits ?? null);
    }, 400);
    return () => { if (positionDebounceRef.current) clearTimeout(positionDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loadState]);

  // ---------------- تحديد النص (بند 6-7) ----------------
  useEffect(() => {
    function onSelectionChange() {
      const container = textLayerRef.current;
      if (!container) return;
      const anchor = getSelectionAnchor(container, textDivsRef.current);
      if (!anchor) { setSelectionInfo(null); return; }
      const sel = window.getSelection();
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { setSelectionInfo(null); return; }
      setSelectionInfo({ rect: { top: rect.top, left: rect.left, width: rect.width }, text: anchor.text, anchor: { charStart: anchor.charStart, charEnd: anchor.charEnd } });
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  function surroundingSentence(charStart: number, charEnd: number): string {
    const text = pageTextRef.current;
    const from = Math.max(0, charStart - 80);
    const to = Math.min(text.length, charEnd + 80);
    return text.slice(from, to).trim();
  }

  async function handleHighlight(color: HighlightColor) {
    if (!selectionInfo) return;
    const anchor: TextAnchor = { page, text: selectionInfo.text, charStart: selectionInfo.anchor.charStart, charEnd: selectionInfo.anchor.charEnd };
    const h: PdfHighlight = { id: genId(), sourceId, page, text: selectionInfo.text, color, anchor, createdAt: Date.now() };
    const ok = await saveHighlight(h);
    if (ok) {
      setHighlights(prev => [...prev, h]);
      bumpReadingStat('highlight');
      showToast('اتحفظ التحديد');
    } else {
      showToast('تعذّر حفظ التحديد — البيانات التانية لسه محفوظة بأمان');
    }
    window.getSelection()?.removeAllRanges();
    setSelectionInfo(null);
  }

  function handleTranslate() {
    if (!selectionInfo) return;
    setWordSheet({ word: selectionInfo.text, sentence: surroundingSentence(selectionInfo.anchor.charStart, selectionInfo.anchor.charEnd) });
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }

  function handlePronounce() {
    if (!selectionInfo) return;
    pronounce(selectionInfo.text);
  }

  function handleSaveWord() {
    if (!selectionInfo) return;
    setWordSheet({ word: selectionInfo.text, sentence: surroundingSentence(selectionInfo.anchor.charStart, selectionInfo.anchor.charEnd) });
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleCopy() {
    if (!selectionInfo) return;
    navigator.clipboard?.writeText(selectionInfo.text).then(() => showToast('اتنسخ')).catch(() => {});
  }

  function handleOpenNote() {
    if (!selectionInfo) return;
    setPendingNoteAnchor({ text: selectionInfo.text, anchor: { page, text: selectionInfo.text, charStart: selectionInfo.anchor.charStart, charEnd: selectionInfo.anchor.charEnd } });
    setNoteSheetOpen(true);
    setSelectionInfo(null);
  }

  async function handleSaveNote(noteText: string) {
    if (!pendingNoteAnchor) return;
    const n: PdfNote = {
      id: genId(), sourceId, page, selectedText: pendingNoteAnchor.text, note: noteText,
      anchor: pendingNoteAnchor.anchor, createdAt: Date.now(), updatedAt: Date.now()
    };
    const ok = await dbSaveNote(n);
    if (ok) {
      setNotes(prev => [...prev, n]);
      bumpReadingStat('note');
      showToast('اتحفظت الملاحظة');
    } else {
      showToast('تعذّر حفظ الملاحظة');
    }
    setNoteSheetOpen(false);
    setPendingNoteAnchor(null);
    window.getSelection()?.removeAllRanges();
  }

  function goToPage(n: number) {
    const clamped = Math.min(Math.max(1, n), numPages || 1);
    setPage(clamped);
  }

  function handleExit() {
    flushPosition();
    onExit();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }

  const pagesWithNotes = new Set(notes.map(n => n.page));

  return (
    <div className={styles.wrap}>
      {controlsVisible && (
        <header className={styles.header}>
          <IconButton icon={ReaderIcons.back} label="رجوع" onClick={handleExit} />
          <div className={styles.headerCenter}>
            <div className={styles.headerTitle}>{source?.title || '...'}</div>
            {loadState === 'ready' && <div className={styles.headerPage}>{page} / {numPages}</div>}
          </div>
          <div className={styles.headerActions}>
            <IconButton icon={ReaderIcons.zoomOut} label="تصغير" size="sm" onClick={() => setScale(s => Math.max(0.6, s - 0.15))} />
            <IconButton icon={ReaderIcons.zoomIn} label="تكبير" size="sm" onClick={() => setScale(s => Math.min(2.5, s + 0.15))} />
            <IconButton icon={fullscreen ? ReaderIcons.exitFullscreen : ReaderIcons.fullscreen} label="ملء الشاشة" size="sm" onClick={toggleFullscreen} />
          </div>
        </header>
      )}

      <div className={styles.body} onClick={() => setControlsVisible(v => !v)}>
        {loadState === 'loading' && (
          <div className={styles.centerMsg}>
            <ReaderIcons.loading size={28} strokeWidth={2} className={styles.spin} />
            <span>جاري فتح الملف...</span>
          </div>
        )}
        {loadState === 'error' && (
          <div className={styles.centerMsg}>
            <ReaderIcons.offline size={28} strokeWidth={1.8} />
            <span>{errorMsg}</span>
            <IconButton icon={ReaderIcons.back} label="رجوع" onClick={handleExit} />
          </div>
        )}
        {loadState === 'ready' && (
          <div className={styles.pageWrap} onClick={e => e.stopPropagation()}>
            <canvas ref={canvasRef} className={styles.canvas} />
            <div ref={textLayerRef} className={`${styles.textLayer} textLayer`} />
          </div>
        )}
      </div>

      {controlsVisible && loadState === 'ready' && (
        <footer className={styles.footer}>
          <IconButton icon={ReaderIcons.prev} label="السابقة" onClick={() => goToPage(page - 1)} disabled={page <= 1} />
          <input
            className={styles.pageInput}
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onBlur={() => goToPage(parseInt(pageInput, 10) || page)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            inputMode="numeric"
          />
          <span className={styles.pageOf}>/ {numPages}</span>
          <IconButton icon={ReaderIcons.next} label="التالية" onClick={() => goToPage(page + 1)} disabled={page >= numPages} />
          {pagesWithNotes.has(page) && <span className={styles.notePill}><ReaderIcons.note size={12} strokeWidth={2} /></span>}
        </footer>
      )}

      {selectionInfo && (
        <SelectionToolbar
          rect={selectionInfo.rect}
          selectedText={selectionInfo.text}
          onHighlight={handleHighlight}
          onTranslate={handleTranslate}
          onPronounce={handlePronounce}
          onSaveWord={handleSaveWord}
          onNote={handleOpenNote}
          onCopy={handleCopy}
        />
      )}

      {wordSheet && (
        <WordSheet
          word={wordSheet.word}
          sentence={wordSheet.sentence}
          sourceId={sourceId}
          sourceTitle={source?.title || ''}
          page={page}
          onClose={() => setWordSheet(null)}
        />
      )}

      <NoteSheet
        open={noteSheetOpen}
        selectedText={pendingNoteAnchor?.text || ''}
        onClose={() => { setNoteSheetOpen(false); setPendingNoteAnchor(null); }}
        onSave={handleSaveNote}
      />
    </div>
  );
}
