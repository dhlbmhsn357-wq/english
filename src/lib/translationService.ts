// ============================================================
// Translation Provider Abstraction (بند 11)
// الـ Business logic (UI/الحفظ في المفردات) ما بتعرفش حاجة عن
// مزود الترجمة الفعلي — لو حبينا نغيّره لاحقًا (Google/DeepL/...)
// بنغيّر جوه الملف ده بس.
// ============================================================

export interface TranslationResult {
  translation: string;
  ok: true;
}

export interface TranslationError {
  ok: false;
  reason: 'offline' | 'failed';
  message: string;
}

export type TranslationOutcome = TranslationResult | TranslationError;

const cache = new Map<string, string>();

/**
 * المزود الحالي: MyMemory (مجاني، بدون API key، مناسب لتطبيق شخصي).
 * التبديل لمزود تاني مستقبلًا = تغيير الدالة دي بس، من غير ما نلمس
 * أي كود تاني في الـ Reader أو الـ Vocabulary.
 */
async function myMemoryProvider(text: string, from: string, to: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || typeof translated !== 'string') throw new Error('empty translation');
  return translated;
}

export const translationService = {
  async translate(text: string, from: string = 'en', to: string = 'ar'): Promise<TranslationOutcome> {
    const clean = text.trim();
    if (!clean) return { ok: false, reason: 'failed', message: 'نص فارغ' };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, reason: 'offline', message: 'الترجمة تحتاج اتصالًا بالإنترنت' };
    }

    const key = `${from}|${to}|${clean.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return { ok: true, translation: cached };

    try {
      const translation = await myMemoryProvider(clean, from, to);
      cache.set(key, translation);
      return { ok: true, translation };
    } catch (e) {
      console.error('translationService.translate failed:', e);
      return { ok: false, reason: 'failed', message: 'تعذّرت الترجمة، حاول تاني' };
    }
  }
};
