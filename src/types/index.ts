// ============================================================
// مسار محسن — Core Types
// ============================================================

export type DailyMode = 'busy' | 'free';
export type Difficulty = 'easy' | 'mid' | 'hard';
export type TaskType = 'listening' | 'vocab' | 'zad';
export type SourceState = 'not-started' | 'in-progress' | 'completed' | 'stopped' | 'needs-review';
export type Theme = 'dark' | 'light' | 'system';
export type FontFamily = 'Tajawal' | 'Cairo' | 'Amiri';
export type BgStyle = 'none' | 'custom';

// ------------------------------------------------------------
// Learning Session — النموذج المحوري (بند 29)
// كل جلسة تعلم فعلية بتتسجل هنا، وهي أساس الـ Progress والـ
// Weekly Review والإحصائيات كلها.
// ------------------------------------------------------------
export interface LearningSession {
  id: string;
  date: string;              // YYYY-MM-DD محلي
  taskId: string;            // 'islamic' | 'zad' | 'vocab' | 'english' | carry id
  sourceId: string;          // اسم المصدر (SourceName) أو LearningSource.id للمصادر المخصصة
  episodeNumber: number | null;
  startedAt: number;         // timestamp
  endedAt: number | null;
  durationMinutes: number | null;
  completed: boolean;
  stoppedAt: string | null;  // "12:34" لو ما خلصش
  note: string;
  difficulty: Difficulty | null;
  isCarryover: boolean;

  // ---- Reading sessions (Study Reader) — كل الحقول دي اختيارية عشان
  // الجلسات القديمة (بدون type) تفضل صالحة بدون Migration ---
  type?: 'reading';
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
  wordsSaved?: number;
  highlightsAdded?: number;
  notesAdded?: number;
}

// ------------------------------------------------------------
// المهام والمصادر
// ------------------------------------------------------------
export interface TaskDef {
  id: string;
  type: TaskType;
  name: string;             // = sourceId في SOURCES
  meta: string;
  url?: string | null;
}

export interface TaskState {
  done: boolean;
  note?: string;
  url?: string;
  time?: string;
  completedEpisode?: boolean;
}

export interface StoppedEntry {
  url: string;
  time: string;
  savedAt: string;
}

// كل حلقة-مترحلة مستقلة (بند 3 من V5 — بنحافظ عليه)
export interface CarryoverItem {
  id: string;
  sourceName: string;
  originalTaskId: string;
  fromDate: string;
  episode: number;
  remainMinutes: number;
  stoppedTime: string | null;
  url: string | null;
  type: TaskType;
  meta: string;
  remainingPages?: number; // مخصص لمهام القراءة (بند 19) — اختياري بالكامل
}

export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  addedAt: number;
  nextReview: number;
  reviewCount: number;
  difficulty: Difficulty | '';
  lastReviewedAt: number | null;

  // ---- سياق الكلمة (بند 13) — من أين اتحفظت الكلمة، اختياري بالكامل
  // عشان الكلمات القديمة (من التطبيق أو من V4/V5) تفضل صالحة ---
  sourceId?: string;
  sourceTitle?: string;
  page?: number;
  sentence?: string;
}

export interface WeeklyWinEntry {
  text: string;
  date: string;
  week: string;
}

// ------------------------------------------------------------
// State Domains (بند 28) — بدل Object واحد ضخم
// ------------------------------------------------------------
export interface UserSettingsState {
  theme: Theme;
  font: FontFamily;
  fontSize: number; // index في FONT_SIZES
  bg: BgStyle;
  bgOpacity: number;
  customBg: string | null;
  notifTimes: string[];
  sentNotifications: Record<string, boolean>;
}

export interface DailyPlanState {
  mode: DailyMode | null;                 // آخر وضع مختار (عرض سريع)
  dailyModes: Record<string, DailyMode>;  // date -> mode (مصدر الحقيقة)
  processedDays: Record<string, boolean>;
}

export interface TasksState {
  tasks: Record<string, TaskState>; // key: date_taskId
  stopped: Record<string, Record<string, StoppedEntry>>; // sourceName -> episode -> entry
}

export interface ProgressState {
  progress: Record<string, number>; // sourceName -> completed episodes
  islamicPhase: 1 | 2 | 3;
  phaseNotified: Record<string, boolean>;
  topicIndex: number;
}

export interface VocabularyState {
  vocab: VocabWord[];
}

// ------------------------------------------------------------
// Learning Library — مصادر يضيفها المستخدم بنفسه (بجانب مصادر
// الخطة الثابتة SOURCES). contentType و trackingType منفصلين
// عن قصد: بودكاست ممكن يتتابع بالحلقات أو بالدقايق، كتاب ممكن
// يتتابع بالصفحات أو الفصول... إلخ.
// ------------------------------------------------------------
export type SourceContentType =
  | 'listening' | 'speaking' | 'video' | 'book' | 'course'
  | 'podcast' | 'article' | 'website' | 'vocabulary' | 'pdf' | 'other';

export type SourceFormat = 'audio' | 'video' | 'text' | 'mixed';

export type SourceSkill = 'listening' | 'speaking' | 'reading' | 'vocabulary' | 'islamic' | 'general';

export type TrackingType = 'episodes' | 'lessons' | 'pages' | 'chapters' | 'minutes' | 'sessions' | 'manual';

export type SourcePriority = 'primary' | 'secondary' | 'optional';

export type CustomSourceStatus = 'not-started' | 'in-progress' | 'paused' | 'completed' | 'archived';

export interface LearningSource {
  id: string;
  title: string;
  description?: string;
  url?: string | null;
  coverImage?: string | null;
  contentType: SourceContentType;
  format: SourceFormat;
  skills: SourceSkill[];
  trackingType: TrackingType;
  totalUnits?: number | null;   // = totalPages للـ PDF (بند 1)
  completedUnits: number;       // = highestReachedPage للـ PDF
  goal?: string;
  priority: SourcePriority;
  status: CustomSourceStatus;
  notes?: string;
  lastActivityAt: number | null;
  createdAt: number;
  updatedAt: number;

  // ---- PDF / Study Reader (بند 1) — كل الحقول اختيارية، متفعّلة بس
  // لما contentType === 'pdf' ---
  fileType?: 'pdf' | null;
  fileRef?: string | null;   // مفتاح الـ Blob في IndexedDB (pdfFiles store)
  fileUrl?: string | null;   // بديل: رابط PDF خارجي
  fileName?: string | null;
  fileSize?: number | null;
  currentPage?: number;      // آخر صفحة كان فيها فعليًا (تتحدث لحظيًا)
  lastOpenedPage?: number;   // آخر صفحة اتحفظت عليها الجلسة (بند 4)
  readingMinutesTotal?: number;
}

export interface LibraryState {
  customSources: LearningSource[];
}

// ------------------------------------------------------------
// Study Reader — Highlights + Notes (بند 6-9)
// النص + الصفحة + الموضع الحرفي (char offset) هو الـ Anchor —
// مش x/y coordinates — عشان يفضل ثابت مع الـ Zoom وإعادة الفتح.
// ------------------------------------------------------------
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'red';

export interface TextAnchor {
  page: number;
  text: string;       // النص المحدد بالظبط (للتحقق ولإعادة البحث)
  charStart: number;  // موضع البداية جوه نص الصفحة المستخرج بالكامل
  charEnd: number;
}

export interface PdfHighlight {
  id: string;
  sourceId: string;
  page: number;
  text: string;
  color: HighlightColor;
  anchor: TextAnchor;
  createdAt: number;
}

export interface PdfNote {
  id: string;
  sourceId: string;
  page: number;
  selectedText: string;
  note: string;
  anchor: TextAnchor;
  createdAt: number;
  updatedAt: number;
}

export interface CarryoverState {
  carryover: CarryoverItem[];
}

export interface SessionsState {
  sessions: LearningSession[];
}

export interface AttendanceState {
  attendance: string[];
  streak: number;
  lastActiveDate: string | null;
  lastStreakDate: string | null;
}

export interface WinsState {
  wins: WeeklyWinEntry[];
  weeklyWin: string;
  weeklyWinWeek: string | null;
}

// ------------------------------------------------------------
// الحالة الكاملة (للحفظ والاستيراد/التصدير فقط — الـ store الفعلي
// مقسم لـ slices منفصلة زي ما بند 28 طلب)
// ------------------------------------------------------------
export interface AppState {
  schemaVersion: number;
  userSettings: UserSettingsState;
  dailyPlan: DailyPlanState;
  tasksState: TasksState;
  progressState: ProgressState;
  vocabulary: VocabularyState;
  carryoverState: CarryoverState;
  library: LibraryState;
  sessions: SessionsState;
  attendance: AttendanceState;
  wins: WinsState;
}
