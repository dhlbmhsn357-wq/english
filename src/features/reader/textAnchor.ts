// ============================================================
// Text Anchoring — الأساس اللي بيخلي Highlights/Notes ثابتة مع
// الـ Zoom وإعادة فتح الملف (بند 7-8).
// الفكرة: بدل إحداثيات x/y، بنخزّن "موضع حرفي" (character offset)
// جوه نص الصفحة الكامل المستخرج من PDF.js TextLayer. النص نفسه
// ثابت دايمًا مهما اتغيّر الـ scale، فالـ offsets تفضل صحيحة.
// ============================================================

export const HIGHLIGHT_CLASS = 'msr-highlight';

/** يبني نص الصفحة الكامل بترتيب الـ textDivs (نفس ترتيب المحتوى الأصلي) */
export function buildPageText(textDivs: HTMLElement[]): string {
  return textDivs.map(d => d.textContent || '').join('');
}

/**
 * يحسب موضع التحديد الحالي (window selection) كـ character offsets
 * جوه نص الصفحة الكامل — بيرجع null لو التحديد مش جوه الـ container.
 */
export function getSelectionAnchor(
  container: HTMLElement,
  textDivs: HTMLElement[]
): { charStart: number; charEnd: number; text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const text = selection.toString();
  if (!text.trim()) return null;

  let offset = 0;
  let charStart = -1;
  let charEnd = -1;

  for (const div of textDivs) {
    const divLen = (div.textContent || '').length;
    const intersects = range.intersectsNode(div);
    if (intersects) {
      if (charStart === -1) {
        // موضع بداية التحديد جوه الـ div ده تحديدًا
        const localStart = nodeOffsetWithin(div, range.startContainer, range.startOffset);
        charStart = offset + localStart;
      }
      const localEnd = nodeOffsetWithin(div, range.endContainer, range.endOffset);
      charEnd = offset + localEnd;
    }
    offset += divLen;
  }

  if (charStart === -1 || charEnd === -1 || charEnd <= charStart) return null;
  return { charStart, charEnd, text };
}

function nodeOffsetWithin(root: HTMLElement, node: Node, offset: number): number {
  if (node === root) return offset;
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length || 0;
    current = walker.nextNode();
  }
  return total;
}

/**
 * يلوّن نطاق [charStart, charEnd) جوه الـ textDivs بلون معيّن —
 * بيشتغل حتى لو النطاق ممتد على أكتر من div واحد.
 */
export function wrapRange(textDivs: HTMLElement[], charStart: number, charEnd: number, className: string, style: Partial<CSSStyleDeclaration>) {
  let offset = 0;
  for (const div of textDivs) {
    const divLen = (div.textContent || '').length;
    const divStart = offset;
    const divEnd = offset + divLen;
    offset = divEnd;

    const start = Math.max(charStart, divStart) - divStart;
    const end = Math.min(charEnd, divEnd) - divStart;
    if (end <= start) continue;

    wrapWithinNode(div, start, end, className, style);
  }
}

function wrapWithinNode(root: HTMLElement, start: number, end: number, className: string, style: Partial<CSSStyleDeclaration>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n = walker.nextNode();
  while (n) { textNodes.push(n as Text); n = walker.nextNode(); }

  let pos = 0;
  for (const textNode of textNodes) {
    const len = textNode.textContent?.length || 0;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    pos = nodeEnd;
    if (end <= nodeStart || start >= nodeEnd) continue;

    const localStart = Math.max(0, start - nodeStart);
    const localEnd = Math.min(len, end - nodeStart);
    if (localEnd <= localStart) continue;

    try {
      const range = document.createRange();
      range.setStart(textNode, localStart);
      range.setEnd(textNode, localEnd);
      const mark = document.createElement('span');
      mark.className = className;
      Object.assign(mark.style, style);
      range.surroundContents(mark);
    } catch {
      // لو range عبر أكتر من text node (نادر بعد الـ split) — تجاهل بأمان
    }
  }
}

/** يشيل كل الـ highlight spans من صفحة معيّنة قبل إعادة رسمها */
export function clearHighlightSpans(container: HTMLElement, className: string) {
  const spans = container.querySelectorAll(`.${className}`);
  spans.forEach(span => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  });
}
