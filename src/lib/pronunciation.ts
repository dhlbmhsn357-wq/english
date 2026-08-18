// ============================================================
// Pronunciation — Web Speech API (بند 12)
// زرار واحد يكفي افتراضيًا؛ الواجهة مش محتاجة تتعقّد بخيارات لهجة.
// ============================================================

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  return cachedVoice;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; };
}

export function canPronounce(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function pronounce(text: string): boolean {
  if (!canPronounce() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel(); // منع تراكم أصوات فوق بعض
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = 'en-US';
    utter.rate = 0.9;
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    console.error('pronounce failed:', e);
    return false;
  }
}
