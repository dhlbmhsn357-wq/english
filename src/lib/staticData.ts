// ============================================================
// البيانات الثابتة — نفس المحتوى الدراسي الأصلي بدون أي تغيير
// (زي ما طُلب: عدم تغيير أسماء المصادر، الترتيب، عدد الحلقات)
// ============================================================

export const SOURCES_MAP: Record<string, string> = {
  'NAK — سورة الجمعة': 'https://youtube.com/playlist?list=PLutdSTmJ7bAKglecPu0fVQoz1MndhU1NV',
  'أسماء الله الحسنى': 'https://youtube.com/playlist?list=PLSFZjjKC3qPYGLinbi1XurRSC3izxodtC',
  "Qur'an 30 for 30": 'https://youtube.com/playlist?list=PLQ02IYL5pmhF96-LJ_owwiytXZzObeHdG',
  'السيرة — Mufti Menk': 'https://youtube.com/playlist?list=PLWV9AumpGdP9zadagjK0qHE3y_UWPfG77',
  'عباد الرحمن — Dr. Omar Suleiman': 'https://youtube.com/playlist?list=PLQ02IYL5pmhGAJE52Bz1OZrWi7Xs71kEe',
  'Listening Time Podcast': 'https://youtube.com/playlist?list=PLhNRdHEdUQezqXdGmIbzd7zWu0pxs6s9J',
  'Speak English With Class': 'https://youtube.com/playlist?list=PLtmt_7kKK2jD7hKy-NjeB8mxA-6vwLLIa',
  'Zad: Aqeedah': 'https://youtube.com/playlist?list=PLDOc9rkFwfwA7LVnGN1E9CWhZZ0DL0VWm',
  'Zad: Seerah': 'https://youtube.com/playlist?list=PLDOc9rkFwfwBA0g3JSYqdoQlqw0tum0Fd',
  'Zad: Fiqh': 'https://youtube.com/playlist?list=PLDOc9rkFwfwD4Yxk6qCwcfnUIXiA6iIeU',
  'Zad: Hadith': 'https://youtube.com/playlist?list=PLDOc9rkFwfwAj5xP1D0g8jurZicbk02CW',
  'Zad: Tafsir': 'https://youtube.com/playlist?list=PLDOc9rkFwfwBPa-i6aWJFKo-4Lsy8Ecrx',
  'Zad: Tarbiyah': 'https://youtube.com/playlist?list=PLDOc9rkFwfwDl5V60aZu-qgSRl99lxubI'
  // "إبراهيم عادل — مفردات" ملهاش رابط مؤكد — ما بنخترعش واحد (زي V5)
};

export const SOURCE_META: Record<string, { presenter: string; group: string }> = {
  'NAK — سورة الجمعة': { presenter: 'Nouman Ali Khan • Bayyinah', group: 'م1 — NAK + أسماء الله' },
  'أسماء الله الحسنى': { presenter: 'Ustadh Hisham Abu Yusuf', group: 'م1 — NAK + أسماء الله' },
  'السيرة — Mufti Menk': { presenter: 'soukISLAM', group: 'م2 — Mufti Menk + 30for30' },
  "Qur'an 30 for 30": { presenter: 'Yaqeen • Dr. Omar Suleiman', group: 'م2 — Mufti Menk + 30for30' },
  'عباد الرحمن — Dr. Omar Suleiman': { presenter: 'Dr. Omar Suleiman', group: 'م3 — عباد الرحمن' },
  'Listening Time Podcast': { presenter: 'Podcast', group: 'الإنجليزي العام' },
  'Speak English With Class': { presenter: 'Podcast', group: 'الإنجليزي العام' },
  'Zad: Aqeedah': { presenter: 'Shaykh Ibrahim Zidan', group: 'زاد أكاديمي' },
  'Zad: Seerah': { presenter: 'Shaykh Assim Al-Hakeem', group: 'زاد أكاديمي' },
  'Zad: Fiqh': { presenter: 'Shaykh Assim Al-Hakeem', group: 'زاد أكاديمي' },
  'Zad: Hadith': { presenter: 'Shaykh Dr. Muhammad Salah', group: 'زاد أكاديمي' },
  'Zad: Tafsir': { presenter: 'Shaykh Dr. Ahmad ibn Saifuddin', group: 'زاد أكاديمي' },
  'Zad: Tarbiyah': { presenter: 'Shaykh Ibrahim Zidan', group: 'زاد أكاديمي' }
};

export const TOTALS: Record<string, number> = {
  'NAK — سورة الجمعة': 30, 'أسماء الله الحسنى': 31,
  "Qur'an 30 for 30": 33, 'السيرة — Mufti Menk': 29,
  'عباد الرحمن — Dr. Omar Suleiman': 10,
  'Listening Time Podcast': 54, 'Speak English With Class': 228,
  'Zad: Aqeedah': 25, 'Zad: Seerah': 25, 'Zad: Fiqh': 37,
  'Zad: Hadith': 25, 'Zad: Tafsir': 25, 'Zad: Tarbiyah': 25
};

export const DURATIONS: Record<string, number> = {
  'NAK — سورة الجمعة': 35,
  'أسماء الله الحسنى': 45,
  "Qur'an 30 for 30": 30,
  'السيرة — Mufti Menk': 47,
  'عباد الرحمن — Dr. Omar Suleiman': 55,
  'Listening Time Podcast': 28,
  'Speak English With Class': 20,
  'Zad: Aqeedah': 45, 'Zad: Seerah': 45, 'Zad: Fiqh': 45,
  'Zad: Hadith': 45, 'Zad: Tafsir': 45, 'Zad: Tarbiyah': 45,
  'إبراهيم عادل — مفردات': 45
};

export const PDF_BOOKS = {
  en: [
    { name: 'Aqeedah PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_AlAqeedah.pdf' },
    { name: 'Seerah PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_Seerah.pdf' },
    { name: 'Fiqh PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_Fiqh.pdf' },
    { name: 'Hadith PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_AlHadith.pdf' },
    { name: 'Tafsir PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_AlTafsir.pdf' },
    { name: 'Tarbiyah PDF', url: 'https://archive.org/download/zad-academy-semester-1-books/CourseBook_Semester1_AlTarbyiah.pdf' }
  ],
  ar: [
    { name: 'العقيدة PDF', url: 'https://archive.org/download/coursebook-semester-1/01CourseBook_Semester1_AlAqeedah.pdf' },
    { name: 'التفسير PDF', url: 'https://archive.org/download/coursebook-semester-1/02CourseBook_Semester1_AlTafsir.pdf' },
    { name: 'الحديث PDF', url: 'https://archive.org/download/coursebook-semester-1/03CourseBook_Semester1_AlHadith.pdf' },
    { name: 'السيرة PDF', url: 'https://archive.org/download/coursebook-semester-1/04CourseBook_Semester1_AlSeerah.pdf' },
    { name: 'الفقه PDF', url: 'https://archive.org/download/coursebook-semester-1/05CourseBook_Semester1_AlFiqh.pdf' },
    { name: 'التربية الإسلامية PDF', url: 'https://archive.org/download/coursebook-semester-1/06CourseBook_Semester1_AlTarbiyah.pdf' },
    { name: 'اللغة العربية PDF', url: 'https://archive.org/download/coursebook-semester-1/07CourseBook_Semester1_ArabicLanguage.pdf' }
  ]
};

// نوع المحتوى لكل مصدر ثابت (لعرض الأيقونة الصح في المكتبة/التقدم)
export const STATIC_CONTENT_TYPE: Record<string, 'video' | 'podcast' | 'course'> = {
  'NAK — سورة الجمعة': 'video',
  'أسماء الله الحسنى': 'video',
  "Qur'an 30 for 30": 'video',
  'السيرة — Mufti Menk': 'video',
  'عباد الرحمن — Dr. Omar Suleiman': 'video',
  'Listening Time Podcast': 'podcast',
  'Speak English With Class': 'podcast',
  'Zad: Aqeedah': 'course', 'Zad: Seerah': 'course', 'Zad: Fiqh': 'course',
  'Zad: Hadith': 'course', 'Zad: Tafsir': 'course', 'Zad: Tarbiyah': 'course'
};

export const PHASE1 = ['NAK — سورة الجمعة', 'أسماء الله الحسنى'];
export const PHASE2 = ['السيرة — Mufti Menk', "Qur'an 30 for 30"];
export const PHASE3 = ['عباد الرحمن — Dr. Omar Suleiman'];
export const PHASE_SOURCES: Record<number, string[]> = { 1: PHASE1, 2: PHASE2, 3: PHASE3 };

export const ZAD_ORDER = ['Aqeedah', 'Seerah', 'Fiqh', 'Hadith', 'Tafsir', 'Tarbiyah'];

export const TOPICS = [
  "Talk about your daily routine and what you enjoy most",
  "Describe someone who has influenced your life greatly",
  "What are the most important qualities of a good Muslim?",
  "Talk about a book or lecture that changed how you think",
  "Describe your city and what you love about it",
  "What does success mean to you personally?",
  "Talk about a challenge you faced and how you overcame it",
  "What are your goals for the next 6 months?",
  "Describe the Prophet's character and why it inspires you",
  "Talk about the importance of seeking knowledge in Islam",
  "What habits do you want to build this year?",
  "Describe a meaningful spiritual experience you've had",
  "Talk about the role of family in your life",
  "What is your favorite surah and why does it move you?",
  "Describe what tarbiyah means to you in practice",
  "Talk about balancing religious life and daily responsibilities",
  "What does da'wah look like in everyday life?",
  "Describe a moment when you felt truly close to Allah",
  "Talk about your journey learning English",
  "What advice would you give someone starting to learn Islam?",
  "Describe the concept of tawakkul in your own words",
  "Talk about how you manage your time effectively",
  "What does an ideal Islamic community look like?",
  "Describe the importance of Quran in your daily life",
  "Talk about a lesson from Seerah you apply today",
  "What does patience mean in the context of modern life?",
  "Describe your ideal learning environment",
  "Talk about the Names of Allah and their effect on your heart",
  "What are common misconceptions about Islam?",
  "How does gratitude (shukr) change your perspective?"
];

export const NOTIF_TIME_LABELS: Record<string, string> = {
  '07:00': '7 صبح', '09:00': '9 صبح', '12:00': '12 ظهر',
  '17:00': '5 مساء', '20:00': '8 بالليل', '22:00': '10 بالليل'
};
