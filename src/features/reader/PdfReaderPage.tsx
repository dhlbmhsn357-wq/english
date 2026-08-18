import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib, type PDFDocumentProxy } from '../../lib/pdfjs';
import { getPdfFile, getHighlightsForSource, getNotesForSource, saveHighlight, saveNote as dbSaveNote } from '../../lib/db';
import { buildPageText, getSelectionAnchor, buildRangeFromOffsets, rangeToRelativeRects, charOffsetOf, type RelativeRect } from './textAnchor';
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
  const [scale, setScale] = useState<number | null>(null); // null = لسه هيتحسب Fit Width
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [highlightBoxes, setHighlightBoxes] = useState<{ id: string; color: HighlightColor; rects: RelativeRect[] }[]>([]);
  const [notes, setNotes] = useState<PdfNote[]>([]);
  const [selectionInfo, setSelectionInfo] = useState<{ rect: { top: number; left: number; width: number }; text: string; anchor: { charStart: number; charEnd: number } } | null>(null);
  const [wordSheet, setWordSheet] = useState<{ word: string; sentence: string } | null>(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingNoteAnchor, setPendingNoteAnchor] = useState<{ text: string; anchor: TextAnchor } | null>(null);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textDivsRef = useRef<HTMLElement[]>([]);
  const pageTextRef = useRef('');
  const renderGenRef = useRef(0);
  const positionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceRef = useRef<LearningSource | undefined>(source);
  sourceRef.current = source;
  const pageRef = useRef(page);
  pageRef.current = page;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  // Pinch-zoom tracking
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const lastTapRef = useRef(0);

  function fitWidthScale(naturalWidth: number): number {
    const container = bodyRef.current;
    const available = (container?.clientWidth || window.innerWidth) - 24; // padding
    const s = available / naturalWidth;
    return Math.min(2.5, Math.max(0.5, s));
  }

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
  // القاعدة الأساسية: الـ Canvas هو الرندر الأصلي لـ PDF.js — مفيش إعادة تكوين
  // للنص المرئي بـ HTML أبدًا. الـ TextLayer شفافة بالكامل، لأغراض التفاعل فقط.
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

      // أول مرة نفتح الملف: نحسب Fit Width بناءً على العرض الطبيعي للصفحة
      if (scaleRef.current === null) {
        const natural = pdfPage.getViewport({ scale: 1 });
        setScale(fitWidthScale(natural.width));
        return; // هيعاد تشغيل الـ effect لما scale يتحدث
      }

      const cssScale = scaleRef.current;
      const viewport = pdfPage.getViewport({ scale: cssScale });

      // بند 5 — High DPI: دقة الـ Canvas الداخلية أعلى من حجم العرض بصريًا،
      // عشان النص (خصوصًا العربي المتصل) يطلع حاد مش Blurry على شاشات الموبايل.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(viewport.width * pixelRatio);
      canvas.height = Math.round(viewport.height * pixelRatio);
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      // نفس الحل الحرج فوق — نضمنه هنا كمان مباشرة على الـ context عشان منعتمدش
      // على وراثة CSS بس (لو DOM اتغيّر مستقبلًا الـ context برضه يفضل LTR).
      ctx.direction = 'ltr';

      // ملاحظة: API الخاص بـ pdfjs-dist v6 بيوصي إن لو استخدمنا canvasContext
      // (عشان نتحكم في الـ DPI transform بنفسنا) لازم canvas: null صراحة، بدل ما
      // نبعت الاتنين مع بعض (سلوك غير موثّق/undefined). السبب الحقيقي لتشوّه
      // النص كان direction الموروث من RTL (شوف ctx.direction فوق) مش ده.
      renderTask = pdfPage.render({ canvasContext: ctx, viewport, canvas: null });
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
      // بند 3 — نضمن شفافية طبقة النص بالـ inline style مباشرة (مش معتمدين على
      // CSS Modules :global() اللي ممكن ميتطبقش صح على DOM بيحقنه PDF.js
      // نفسه). لو الطبقة دي ظهرت فوق الـ Canvas بأي شكل، النص بيتكرر ويتشوّه.
      divs.forEach(div => {
        div.style.color = 'transparent';
        div.style.webkitTextFillColor = 'transparent';
      });
      textDivsRef.current = divs;
      pageTextRef.current = buildPageText(divs);

      // إعادة حساب مستطيلات الـ Highlights المحفوظة لهذه الصفحة — ثابتة مع الـ
      // Zoom لأنها char-offset مش x/y. الحل النهائي: بنرسمها كطبقة overlay
      // منفصلة تمامًا (مش بنلمس Text nodes الحقيقية أبدًا)، عشان النص الأصلي
      // المخفي بتاع PDF.js يفضل سليم 100% ومفيش أي احتمال يتكرر أو يظهر بخط
      // صغير غلط — المشكلة القديمة كانت بالظبط من تقسيم الـ Text nodes دي.
      const boxes = highlights
        .filter(h => h.page === page)
        .map(h => {
          const range = buildRangeFromOffsets(divs, h.anchor.charStart, h.anchor.charEnd);
          if (!range) return null;
          const rects = rangeToRelativeRects(range, textLayerEl);
          if (!rects.length) return null;
          return { id: h.id, color: h.color, rects };
        })
        .filter((b): b is { id: string; color: HighlightColor; rects: RelativeRect[] } => b !== null);
      setHighlightBoxes(boxes);
    }

    renderPage().catch(e => console.error('renderPage failed:', e));
    return () => { renderTask?.cancel(); };
  }, [loadState, page, scale, highlights]);

  // إعادة حساب Fit Width لما الصفحة/المصدر يتغيّر (كتاب جديد ممكن يبقى بمقاس مختلف)
  useEffect(() => {
    setScale(null);
  }, [sourceId]);

  // بند 8 — الـ Controls تختفي تلقائيًا بعد فترة قصيرة من عدم التفاعل
  useEffect(() => {
    if (!controlsVisible || loadState !== 'ready') return;
    const t = setTimeout(() => setControlsVisible(false), 3500);
    return () => clearTimeout(t);
  }, [controlsVisible, loadState, page]);

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

  // ============================================================
  // الحل النهائي للتحديد (بند: "يحدد معظم الصفحة" / "يحدد بعيد هنا") — تبيّن
  // إن تحديد المتصفح الأصلي (native mousedown-drag selection) نفسه مش موثوق
  // فوق طبقة نص PDF.js، لأن كل سطر معمول بـ scaleX منفصل عشان يطابق عرض
  // الحروف الأصلي بالظبط — وده بيكسر خوارزمية "حدود الكلمة/السحب" المدمجة في
  // المتصفح حتى لضغطة واحدة بسيطة من غير سحب. الحل: نبني الـ Range يدويًا
  // بالكامل بنفسنا من إحداثيات pointerdown/pointerup مباشرة (caretRangeFromPoint
  // + الموضع الحرفي الكلي)، ومنعتمدش على نتيجة تحديد المتصفح أبدًا.
  // ============================================================
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  function caretPositionAt(x: number, y: number): { node: Text; offset: number } | null {
    type LegacyDoc = Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    const doc = document as LegacyDoc;
    if (doc.caretRangeFromPoint) {
      const r = doc.caretRangeFromPoint(x, y);
      if (r && r.startContainer.nodeType === Node.TEXT_NODE) return { node: r.startContainer as Text, offset: r.startOffset };
    }
    if (doc.caretPositionFromPoint) {
      const p = doc.caretPositionFromPoint(x, y);
      if (p && p.offsetNode.nodeType === Node.TEXT_NODE) return { node: p.offsetNode as Text, offset: p.offset };
    }
    return null;
  }

  function divBoundsAt(divs: HTMLElement[], globalOffset: number): { start: number; end: number } | null {
    // نفس منطق الحدّ الأعلى exclusive في buildRangeFromOffsets — عشان لو الموضع
    // بالظبط على حدّ مشترك بين عنصرين متلاصقين، نفضّل العنصر التالي (اللي
    // المستخدم ضغط عليه فعليًا) مش العنصر السابق اللي بيخلص عنده بالصدفة.
    let offset = 0;
    for (let i = 0; i < divs.length; i++) {
      const len = (divs[i].textContent || '').length;
      const divEnd = offset + len;
      const isLastDiv = i === divs.length - 1;
      if (globalOffset >= offset && (globalOffset < divEnd || (isLastDiv && globalOffset === divEnd))) {
        return { start: offset, end: divEnd };
      }
      offset = divEnd;
    }
    return null;
  }

  function applyOffsetSelection(charStart: number, charEnd: number) {
    const range = buildRangeFromOffsets(textDivsRef.current, charStart, charEnd);
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function handleTextLayerPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return; // تجاهل لمسات الـ Pinch-Zoom التانية
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleTextLayerPointerUp(e: React.PointerEvent) {
    if (!e.isPrimary) return;
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const startCaret = caretPositionAt(start.x, start.y);
    if (!startCaret) return;
    const startOffset = charOffsetOf(textDivsRef.current, startCaret.node, startCaret.offset);
    if (startOffset === null) return;

    if (moved < 6) {
      // ضغطة بسيطة (Tap) — نحدد الكلمة اللي تحت الإصبع/الماوس بالظبط، مش أكتر.
      // مهم: نص الصفحة الكلي (pageTextRef) مبني بتجميع كل عناصر PDF.js من غير
      // أي فاصل بينهم، فلو عنصرين متجاورين في الترتيب (مش بالضرورة بصريًا
      // جنب بعض) بيخلصوا/يبدأوا بحرف، ممكن يبانوا "كلمة واحدة" غلط في النص
      // المسطّح. الحل: نمنع توسيع حدود الكلمة إنه يعدّي حدود الـ div الأصلي
      // اللي المستخدم ضغط عليه فعليًا — كل عنصر نصي من PDF.js أصلًا كلمة أو
      // عبارة قصيرة قائمة بذاتها، فده الحد الطبيعي والآمن للتحديد بالضغطة.
      const divBounds = divBoundsAt(textDivsRef.current, startOffset);
      const text = pageTextRef.current;
      const isWordChar = (ch: string) => /[\p{L}\p{N}']/u.test(ch);
      const lo = divBounds ? divBounds.start : 0;
      const hi = divBounds ? divBounds.end : text.length;
      let anchor = startOffset;
      if (anchor > lo && !isWordChar(text[anchor] ?? '') && isWordChar(text[anchor - 1] ?? '')) anchor -= 1;
      let s = anchor;
      let en = anchor;
      while (s > lo && isWordChar(text[s - 1])) s--;
      while (en < hi && isWordChar(text[en])) en++;
      if (en <= s) { window.getSelection()?.removeAllRanges(); return; } // ضغط على مسافة/علامة ترقيم
      applyOffsetSelection(s, en);
      return;
    }

    // سحب حقيقي (تحديد عبارة/جملة) — بنبني النطاق يدويًا من نقطتي البداية
    // والنهاية الفعليتين، مش من تحديد المتصفح الأصلي غير الموثوق.
    const endCaret = caretPositionAt(e.clientX, e.clientY);
    if (!endCaret) return;
    const endOffset = charOffsetOf(textDivsRef.current, endCaret.node, endCaret.offset);
    if (endOffset === null) return;

    const from = Math.min(startOffset, endOffset);
    const to = Math.max(startOffset, endOffset);
    if (to <= from) { window.getSelection()?.removeAllRanges(); return; }
    applyOffsetSelection(from, to);
  }

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

  function zoomBy(delta: number) {
    setScale(s => Math.min(2.5, Math.max(0.5, (s ?? 1) + delta)));
  }

  function resetFitWidth() {
    setScale(null);
  }

  // ---- Pinch-to-zoom + double-tap (بند 7) ----
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { startDist: dist, startScale: scaleRef.current ?? 1 };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        zoomBy(scaleRef.current && scaleRef.current > 1.3 ? -0.6 : 0.6);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.startDist;
      const next = Math.min(2.5, Math.max(0.5, pinchRef.current.startScale * ratio));
      setScale(next);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  const pagesWithNotes = new Set(notes.map(n => n.page));

  return (
    <div className={styles.wrap}>
      {controlsVisible && (
        <header className={styles.header}>
          <IconButton icon={ReaderIcons.back} label="رجوع" onClick={handleExit} />
          <div className={styles.headerCenter}>
            <div className={styles.headerTitle}>{source?.title || '...'}</div>
            {loadState === 'ready' && <div className={styles.headerPage} dir="ltr">{page} / {numPages}</div>}
          </div>
          <div className={styles.headerActions}>
            <IconButton icon={ReaderIcons.zoomOut} label="تصغير" size="sm" onClick={() => zoomBy(-0.2)} />
            <IconButton icon={ReaderIcons.zoomIn} label="تكبير" size="sm" onClick={() => zoomBy(0.2)} />
            <IconButton icon={ReaderIcons.fitWidth} label="ملائمة العرض" size="sm" onClick={resetFitWidth} />
            <IconButton icon={fullscreen ? ReaderIcons.exitFullscreen : ReaderIcons.fullscreen} label="ملء الشاشة" size="sm" onClick={toggleFullscreen} />
          </div>
        </header>
      )}

      <div
        ref={bodyRef}
        className={styles.body}
        onClick={() => setControlsVisible(v => !v)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
            {/* بند حرج (الحل النهائي الحقيقي لتشوّه النص) — التطبيق كله RTL (dir على body)،
                والـ direction ده بيتوّرث لـ Canvas 2D context تلقائيًا. لما pdf.js يرسم
                حروف إنجليزية/PDF عادية بـ fillText() على context اتجاهه rtl، المتصفح
                بيعيد ترتيب/تموضع الحروف بمنطق bidi غلط — وده اللي كان بيسبب سقوط أول
                حرف من كل كلمة وظهور فراغات عشوائية، بغض النظر عن الخط أو محتوى الملف.
                لازم dir="ltr" صريح هنا عشان الـ canvas يرسم بإحداثيات pdf.js الطبيعية. */}
            <canvas ref={canvasRef} className={styles.canvas} dir="ltr" />
            {/* طبقة الـ Highlights — منفصلة تمامًا عن نص PDF.js الحقيقي (overlay مستطيلات
                بس، مفيش لمس لأي Text node). كده التظليل بيقع بالظبط مكانه الصح، ومفيش
                احتمال يتكرر النص أو يظهر بخط صغير غلط أبدًا. */}
            <div className={styles.highlightLayer} aria-hidden="true">
              {highlightBoxes.map(box => (
                <div key={box.id}>
                  {box.rects.map((r, i) => (
                    <div
                      key={i}
                      className={styles.highlightRect}
                      style={{ top: r.top, left: r.left, width: r.width, height: r.height, background: HIGHLIGHT_HEX[box.color] }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div
              ref={textLayerRef}
              className={`${styles.textLayer} textLayer`}
              dir="ltr"
              onPointerDown={handleTextLayerPointerDown}
              onPointerUp={handleTextLayerPointerUp}
            />
          </div>
        )}
      </div>

      {controlsVisible && loadState === 'ready' && (
        <footer className={styles.footer} dir="ltr">
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
