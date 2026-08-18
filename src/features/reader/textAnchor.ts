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
 * يحسب الموضع الحرفي الكلي (global char offset) لنقطة معيّنة (Text node +
 * offset محلي) جوه نص الصفحة الكامل. ده الأساس اللي بيخلينا نبني أي Range
 * (تحديد كلمة واحدة أو سحب عبارة) يدويًا وبثقة، من غير ما نعتمد على تحديد
 * المتصفح الأصلي (اللي بيتكسر مع الـ transform اللي PDF.js بيحطه على كل سطر).
 */
export function charOffsetOf(textDivs: HTMLElement[], node: Node, localOffset: number): number | null {
  let offset = 0;
  for (const div of textDivs) {
    if (div.contains(node)) {
      return offset + nodeOffsetWithin(div, node, localOffset);
    }
    offset += (div.textContent || '').length;
  }
  return null;
}

/**
 * يحسب موضع نص فعلي (Text node + offset محلي) داخل عنصر معيّن، من موضع
 * حرفي (character offset) نسبي لبداية العنصر ده.
 */
function locateTextNode(root: HTMLElement, localOffset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let n = walker.nextNode() as Text | null;
  let last: Text | null = null;
  while (n) {
    const len = n.textContent?.length || 0;
    if (localOffset <= pos + len) return { node: n, offset: localOffset - pos };
    pos += len;
    last = n;
    n = walker.nextNode() as Text | null;
  }
  // لو الموضع بعد آخر حرف بالظبط (حافة النهاية) — رجّع آخر نقطة ممكنة
  if (last) return { node: last, offset: last.textContent?.length || 0 };
  return null;
}

/**
 * يبني Range واحد يغطي [charStart, charEnd) عبر عدة textDivs لو احتاج الأمر،
 * من غير ما يلمس/يقسّم أي Text node حقيقي (القراءة فقط — آمن 100%).
 */
export function buildRangeFromOffsets(textDivs: HTMLElement[], charStart: number, charEnd: number): Range | null {
  let offset = 0;
  let start: { node: Text; offset: number } | null = null;
  let end: { node: Text; offset: number } | null = null;

  // ملاحظة مهمة: عناصر نص PDF.js بتتلاصق في الترتيب المسطّح من غير أي فاصل
  // بينها (buildPageText)، فموضع حرفي زي "11" ممكن يبقى بالظبط نهاية العنصر
  // الأول *وكمان* بداية العنصر التاني في نفس الوقت — لازم نفضّل العنصر
  // الصح (اللي المستخدم ضغط عليه فعليًا) مش أول عنصر بيتطابق بالصدفة.
  // start بيفضّل العنصر التالي عند التساوي (حدّه أعلى exclusive)، وend بيفضّل
  // العنصر السابق عند التساوي (حدّه أدنى exclusive) — كده الاتنين بيتفقوا على
  // نفس المنطقة الصح بدل ما يقعوا في عنصر مجاور غلط.
  for (let i = 0; i < textDivs.length; i++) {
    const div = textDivs[i];
    const divLen = (div.textContent || '').length;
    const divStart = offset;
    const divEnd = offset + divLen;
    offset = divEnd;

    if (!start) {
      const isLastDiv = i === textDivs.length - 1;
      if (charStart >= divStart && (charStart < divEnd || (isLastDiv && charStart === divEnd))) {
        start = locateTextNode(div, charStart - divStart);
      }
    }
    if (!end) {
      const isFirstDiv = i === 0;
      if (charEnd <= divEnd && (charEnd > divStart || (isFirstDiv && charEnd === divStart))) {
        end = locateTextNode(div, charEnd - divStart);
      }
    }
    if (start && end) break;
  }
  if (!start || !end) return null;

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch {
    return null;
  }
}

export interface RelativeRect { top: number; left: number; width: number; height: number; }

/**
 * يحوّل Range لمجموعة مستطيلات (سطر بسطر لو التحديد ممتد على أكتر من سطر)
 * بإحداثيات نسبية لعنصر الحاوية — عشان نرسمها كطبقة overlay منفصلة تمامًا
 * عن نص PDF.js الحقيقي (فمفيش أي احتمال إنها تكسر أو تكرر النص الأصلي).
 */
export function rangeToRelativeRects(range: Range, container: HTMLElement): RelativeRect[] {
  const containerRect = container.getBoundingClientRect();
  return Array.from(range.getClientRects())
    .filter(r => r.width > 0.5 && r.height > 0.5)
    .map(r => ({
      top: r.top - containerRect.top,
      left: r.left - containerRect.left,
      width: r.width,
      height: r.height
    }));
}
