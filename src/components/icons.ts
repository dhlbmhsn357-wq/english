// ============================================================
// Icon System — مكتبة واحدة موحّدة (lucide-react) لكل الـ UI.
// نفس Stroke style / الحجم / الـ optical weight في كل مكان.
// الـ Emoji يستخدم فقط جوه المحتوى (زي برومبت المحادثة)، مش
// في الـ Navigation أو الـ Controls.
// ============================================================
import {
  Home,
  Library,
  BarChart3,
  RotateCcw,
  Settings,
  Moon,
  Sun,
  MonitorSmartphone,
  Play,
  Check,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  Video,
  BookOpen,
  GraduationCap,
  AudioLines,
  FileText,
  Globe,
  Languages,
  NotebookPen,
  Flame,
  Plus,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Shapes,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Type,
  Image as ImageIcon,
  Trophy,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  Zap,
  Eye,
  Smile,
  Meh,
  Frown,
  Award,
  Flag,
  PartyPopper,
  BookMarked,
} from 'lucide-react';

/** خصائص افتراضية موحدة لكل الأيقونات — نفس الحجم والسُمك دايمًا */
export const ICON_SIZE = 18;
export const ICON_STROKE = 1.8;

// ---- Navigation ----
export const NavIcons = {
  today: Home,
  library: Library,
  progress: BarChart3,
  review: RotateCcw,
} as const;

// ---- Actions عامة ----
export const ActionIcons = {
  settings: Settings,
  themeDark: Moon,
  themeLight: Sun,
  themeSystem: MonitorSmartphone,
  start: Play,
  complete: Check,
  completeFilled: CheckCircle2,
  carryover: Clock,
  add: Plus,
  search: Search,
  close: X,
  next: ChevronRight,
  prev: ChevronLeft,
  expand: ChevronDown,
  more: MoreHorizontal,
  archive: Archive,
  delete: Trash2,
  edit: Pencil,
  download: Download,
  upload: Upload,
  font: Type,
  image: ImageIcon,
  streak: Flame,
  trophy: Trophy,
  trend: TrendingUp,
  sparkle: Sparkles,
  warning: ShieldAlert,
  busy: Zap,
  free: Moon,
  reveal: Eye,
  celebrate: PartyPopper,
  award: Award,
  milestone: Flag,
  book: BookMarked,
} as const;

export const DifficultyIcons = { easy: Smile, mid: Meh, hard: Frown } as const;

// ---- Connection ----
export const ConnectionIcons = { online: Wifi, offline: WifiOff } as const;

/** أنواع محتوى المصادر — Mapping ثابت، ما فيش أيقونة عشوائية لأي مكان */
export const ContentTypeIcons = {
  listening: Headphones,
  speaking: Mic,
  video: Video,
  book: BookOpen,
  course: GraduationCap,
  podcast: AudioLines,
  article: FileText,
  website: Globe,
  vocabulary: Languages,
  other: Shapes,
} as const;

export type ContentTypeKey = keyof typeof ContentTypeIcons;

export const NotesIcon = NotebookPen;
