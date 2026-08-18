import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ContentTypeIcons, type ContentTypeKey } from '../../components/icons';
import { useStore } from '../../store/useStore';
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
const PRIORITIES: { key: SourcePriority; label: string }[] = [
  { key: 'primary', label: 'أساسي' }, { key: 'secondary', label: 'ثانوي' }, { key: 'optional', label: 'اختياري' }
];

/** إضافة مصدر تعلّم — نموذج واحد بسيط، بدون خطوات معقّدة */
export function AddSourceSheet({ open, onClose }: AddSourceSheetProps) {
  const addSource = useStore(s => s.addSource);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [contentType, setContentType] = useState<ContentTypeKey>('video');
  const [format, setFormat] = useState<SourceFormat>('mixed');
  const [trackingType, setTrackingType] = useState<TrackingType>('episodes');
  const [totalUnits, setTotalUnits] = useState('');
  const [priority, setPriority] = useState<SourcePriority>('secondary');
  const [skills, setSkills] = useState<SourceSkill[]>([]);
  const [expanded, setExpanded] = useState(false);

  function reset() {
    setTitle(''); setUrl(''); setContentType('video'); setFormat('mixed');
    setTrackingType('episodes'); setTotalUnits(''); setPriority('secondary'); setSkills([]); setExpanded(false);
  }

  function handleContentType(ct: ContentTypeKey) {
    setContentType(ct);
    setTrackingType(TRACKING_SUGGESTIONS[ct][0]);
  }

  function toggleSkill(k: SourceSkill) {
    setSkills(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));
  }

  function handleSubmit() {
    if (!title.trim()) return;
    addSource({
      title,
      url: url || undefined,
      contentType,
      format,
      trackingType,
      totalUnits: totalUnits ? Number(totalUnits) : null,
      priority,
      skills
    });
    reset();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose(); }} title="إضافة مصدر جديد">
      <div className={styles.section}>
        <Input label="اسم المصدر" placeholder="مثال: Aqeedah — Zad Academy" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

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

      <div className={styles.section}>
        <div className={styles.sectionLabel}>صيغة المحتوى</div>
        <div className={styles.segmented}>
          {FORMATS.map(f => (
            <button key={f.key} className={`${styles.segBtn} ${format === f.key ? styles.segActive : ''}`} onClick={() => setFormat(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.section} style={{ marginBottom: 0 }}>
          <div className={styles.sectionLabel}>طريقة التتبع</div>
          <div className={styles.chipsRow}>
            {ALL_TRACKING.map(tt => (
              <button key={tt} className={`${styles.chip} ${trackingType === tt ? styles.chipActive : ''}`} onClick={() => setTrackingType(tt)}>
                {TRACKING_LABEL[tt]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {trackingType !== 'manual' && (
        <div className={styles.section}>
          <Input
            label={`إجمالي ${TRACKING_LABEL_PLURAL[trackingType]} (اختياري)`}
            type="number" min={0} placeholder="مثال: 25"
            value={totalUnits} onChange={e => setTotalUnits(e.target.value)}
          />
        </div>
      )}

      {!expanded ? (
        <button className={styles.hint} onClick={() => setExpanded(true)} style={{ textDecoration: 'underline', marginBottom: 16 }}>
          + تفاصيل إضافية (رابط، أولوية، مهارات)
        </button>
      ) : (
        <>
          <div className={styles.section}>
            <Input label="الرابط (اختياري)" placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>الأولوية</div>
            <div className={styles.segmented}>
              {PRIORITIES.map(p => (
                <button key={p.key} className={`${styles.segBtn} ${priority === p.key ? styles.segActive : ''}`} onClick={() => setPriority(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

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

      <div className={styles.footer}>
        <Button variant="secondary" onClick={() => { reset(); onClose(); }} full>إلغاء</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!title.trim()} full>إضافة المصدر</Button>
      </div>
    </BottomSheet>
  );
}
