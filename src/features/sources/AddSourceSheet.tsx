import { useRef, useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ContentTypeIcons, ActionIcons, type ContentTypeKey } from '../../components/icons';
import { useStore } from '../../store/useStore';
import { savePdfFile } from '../../lib/db';
import { CONTENT_TYPE_LABEL, TRACKING_LABEL, TRACKING_LABEL_PLURAL, TRACKING_SUGGESTIONS } from './sourceState';
import type { SourceFormat, SourceSkill, TrackingType, SourcePriority } from '../../types';
import styles from './AddSourceSheet.module.css';

interface AddSourceSheetProps {
  open: boolean;
  onClose: () => void;
}

const CONTENT_TYPES = Object.keys(ContentTypeIcons) as ContentTypeKey[];
const ALL_TRACKING: TrackingType[] = ['episodes', 'lessons', 'pages', 'chapters', 'minutes', 'sessions', 'manual'];
const FORMATS: { key: SourceFormat; label: string }[] = [
  { key: 'audio', label: 'صوت' }, { key: 'video', label: 'فيديو' }, { key: 'text', label: 'نص' }, { key: 'mixed', label: 'مختلط' }
];
const SKILLS: { key: SourceSkill; label: string }[] = [
  { key: 'listening', label: 'استماع' }, { key: 'speaking', label: 'تحدث' }, { key: 'reading', label: 'قراءة' },
  { key: 'vocabulary', label: 'مفردات' }, { key: 'islamic', label: 'دراسات إسلامية' }, { key: 'general', label: 'تعلّم عام' }
];
const PRIORITIES: { key: SourcePriority; label: string; hint: string }[] = [
  { key: 'primary', label: 'أساسي', hint: 'من أهم أولوياتك دلوقتي' },
  { key: 'secondary', label: 'ثانوي', hint: 'مهم بس مش عاجل' },
  { key: 'optional', label: 'اختياري', hint: 'وقت ما يتيسّر' }
];
const GOAL_PRESETS = ['إنهاؤه كاملًا', '3 مرات أسبوعيًا', '20 دقيقة يوميًا', 'استخدامه عند الحاجة'];

const STEPS = ['الاسم', 'النوع', 'التتبع', 'الأولوية'] as const;
const TOTAL_STEPS = STEPS.length;
const MAX_PDF_SIZE = 150 * 1024 * 1024; // 150MB — سقف معقول لملف محلي في IndexedDB

function isValidHttpUrl(str: string): boolean {
  try { const u = new URL(str.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

/** إضافة مصدر تعلّم — Wizard من 4 خطوات قصيرة بدل نموذج طويل واحد */
export function AddSourceSheet({ open, onClose }: AddSourceSheetProps) {
  const addSource = useStore(s => s.addSource);
  const updateSource = useStore(s => s.updateSource);
  const showToast = useStore(s => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [contentType, setContentType] = useState<ContentTypeKey>('video');
  const [format, setFormat] = useState<SourceFormat>('mixed');
  const [trackingType, setTrackingType] = useState<TrackingType>('episodes');
  const [totalUnits, setTotalUnits] = useState('');
  const [skills, setSkills] = useState<SourceSkill[]>([]);
  const [priority, setPriority] = useState<SourcePriority>('secondary');
  const [goal, setGoal] = useState('');

  // ---- PDF-specific ----
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLoadingPages, setPdfLoadingPages] = useState(false);
  const [pdfError, setPdfError] = useState('');

  function reset() {
    setStep(0); setTitle(''); setDescription(''); setUrl(''); setContentType('video'); setFormat('mixed');
    setTrackingType('episodes'); setTotalUnits(''); setSkills([]); setPriority('secondary'); setGoal('');
    setPdfFile(null); setPdfUrl(''); setPdfLoadingPages(false); setPdfError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleContentType(ct: ContentTypeKey) {
    setContentType(ct);
    setTrackingType(TRACKING_SUGGESTIONS[ct][0]);
    setFormat(ct === 'pdf' ? 'text' : format);
  }

  function toggleSkill(k: SourceSkill) {
    setSkills(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));
  }

  async function detectPageCount(file: File) {
    setPdfLoadingPages(true);
    setPdfError('');
    try {
      const { pdfjsLib } = await import('../../lib/pdfjs');
      const buf = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buf });
      const doc = await loadingTask.promise;
      setTotalUnits(String(doc.numPages));
      await loadingTask.destroy();
    } catch (e) {
      console.error('detectPageCount failed:', e);
      setPdfError('تعذّرت قراءة الملف — تأكد إنه PDF سليم');
    } finally {
      setPdfLoadingPages(false);
    }
  }

  function handlePickPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isPdfMime = f.type === 'application/pdf';
    const isPdfExt = f.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfExt) {
      setPdfError('الملف المختار مش PDF');
      e.target.value = '';
      return;
    }
    if (f.size > MAX_PDF_SIZE) {
      setPdfError(`الملف كبير جدًا (الحد الأقصى ${Math.round(MAX_PDF_SIZE / 1024 / 1024)}MB)`);
      e.target.value = '';
      return;
    }
    setPdfError('');
    setPdfFile(f);
    setPdfUrl('');
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ''));
    detectPageCount(f);
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    if (contentType === 'pdf' && !pdfFile && pdfUrl && !isValidHttpUrl(pdfUrl)) {
      setPdfError('رابط PDF غير صالح');
      return;
    }

    const source = addSource({
      title,
      description: description || undefined,
      url: url || undefined,
      contentType,
      format,
      trackingType,
      totalUnits: totalUnits ? Number(totalUnits) : null,
      skills,
      priority,
      goal: goal || undefined,
      fileType: contentType === 'pdf' ? 'pdf' : undefined,
      fileUrl: contentType === 'pdf' && pdfUrl ? pdfUrl : undefined,
      currentPage: 1,
      lastOpenedPage: 1
    });

    if (contentType === 'pdf' && pdfFile) {
      const ok = await savePdfFile(source.id, pdfFile, pdfFile.name);
      if (ok) {
        updateSource(source.id, { fileRef: source.id, fileName: pdfFile.name, fileSize: pdfFile.size });
      } else {
        showToast('اتحفظ المصدر لكن تعذّر حفظ ملف الـ PDF — جرب ترفعه تاني من تفاصيل المصدر');
      }
    }

    handleClose();
  }

  const canNext = step !== 0 || title.trim().length > 0;

  return (
    <BottomSheet open={open} onClose={handleClose} title="إضافة مصدر جديد">
      <div className={styles.stepper}>
        {STEPS.map((label, i) => (
          <div key={label} className={styles.stepDotWrap}>
            <span className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ''}`}>
              {i < step ? <ActionIcons.complete size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={styles.stepLabel}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className={styles.section}>
            <Input label="اسم المصدر" placeholder="مثال: Aqeedah — Zad Academy" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className={styles.section}>
            <Input label="وصف مختصر (اختياري)" placeholder="عن إيه المصدر ده؟" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {contentType !== 'pdf' && (
            <div className={styles.section}>
              <Input label="الرابط (اختياري)" placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} />
            </div>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>نوع المحتوى</div>
            <div className={styles.typeGrid}>
              {CONTENT_TYPES.map(ct => {
                const Icon = ContentTypeIcons[ct];
                return (
                  <button key={ct} className={`${styles.typeBtn} ${contentType === ct ? styles.typeActive : ''}`} onClick={() => handleContentType(ct)}>
                    <Icon size={20} strokeWidth={1.8} />
                    {CONTENT_TYPE_LABEL[ct]}
                  </button>
                );
              })}
            </div>
          </div>

          {contentType === 'pdf' ? (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>ملف الـ PDF</div>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handlePickPdf} />
              <Button variant="secondary" icon={ActionIcons.upload} full onClick={() => fileInputRef.current?.click()}>
                {pdfFile ? pdfFile.name : 'ارفع ملف PDF من جهازك'}
              </Button>
              {pdfLoadingPages && <div className={styles.hint}>بنقرأ عدد الصفحات...</div>}
              {!pdfFile && (
                <>
                  <div className={styles.hint}>أو الصق رابط PDF مباشر</div>
                  <Input placeholder="https://.../file.pdf" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} />
                </>
              )}
              {pdfError && <div className={styles.pdfError}>{pdfError}</div>}
            </div>
          ) : (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>صيغة المحتوى</div>
              <div className={styles.segmented}>
                {FORMATS.map(f => (
                  <button key={f.key} className={`${styles.segBtn} ${format === f.key ? styles.segActive : ''}`} onClick={() => setFormat(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className={styles.hint}>المصدر ممكن يكون فيديو بس تستخدمه للاستماع بس — اختار اللي بيوصف استخدامك الفعلي</div>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>كيف تريد تتبع هذا المصدر؟</div>
            <div className={styles.chipsRow}>
              {ALL_TRACKING.map(tt => (
                <button key={tt} className={`${styles.chip} ${trackingType === tt ? styles.chipActive : ''}`} onClick={() => setTrackingType(tt)}>
                  {TRACKING_LABEL[tt]}
                </button>
              ))}
            </div>
          </div>
          {trackingType !== 'manual' && (
            <div className={styles.section}>
              <Input
                label={`إجمالي ${TRACKING_LABEL_PLURAL[trackingType]} ${contentType === 'pdf' && totalUnits ? '(اتحسبت تلقائيًا من الملف)' : '(اختياري)'}`}
                type="number" min={0} placeholder="مثال: 25"
                value={totalUnits} onChange={e => setTotalUnits(e.target.value)}
              />
            </div>
          )}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>هذا المصدر يطوّر ماذا؟ (اختياري)</div>
            <div className={styles.chipsRow}>
              {SKILLS.map(sk => (
                <button key={sk.key} className={`${styles.chip} ${skills.includes(sk.key) ? styles.chipActive : ''}`} onClick={() => toggleSkill(sk.key)}>
                  {sk.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>الأولوية</div>
            <div className={styles.priorityGrid}>
              {PRIORITIES.map(p => (
                <button key={p.key} className={`${styles.priorityBtn} ${priority === p.key ? styles.priorityActive : ''}`} onClick={() => setPriority(p.key)}>
                  <span className={styles.priorityLabel}>{p.label}</span>
                  <span className={styles.priorityHint}>{p.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>هدفك من المصدر (اختياري)</div>
            <div className={styles.chipsRow}>
              {GOAL_PRESETS.map(g => (
                <button key={g} className={`${styles.chip} ${goal === g ? styles.chipActive : ''}`} onClick={() => setGoal(goal === g ? '' : g)}>{g}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.footer}>
        {step > 0 ? (
          <Button variant="secondary" icon={ActionIcons.prev} onClick={() => setStep(s => s - 1)} full>رجوع</Button>
        ) : (
          <Button variant="secondary" onClick={handleClose} full>إلغاء</Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button variant="primary" icon={ActionIcons.next} iconPosition="end" disabled={!canNext} onClick={() => setStep(s => s + 1)} full>التالي</Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit} disabled={!title.trim()} full>إضافة المصدر</Button>
        )}
      </div>
    </BottomSheet>
  );
}
