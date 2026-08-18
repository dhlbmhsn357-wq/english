import { useMemo, useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ContentTypeIcons } from '../../components/icons';
import { useStore } from '../../store/useStore';
import { TOTALS, SOURCE_META, DURATIONS, STATIC_CONTENT_TYPE } from '../../lib/staticData';
import { trackingUnitLabel } from '../../lib/planEngine';
import type { SourceKind, SourcePriority, TrackingType } from '../../types';
import styles from './AddPlanItemSheet.module.css';

interface AddPlanItemSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: { sourceId: string; sourceKind: SourceKind; sourceName: string; trackingType: TrackingType; targetAmount: number; estimatedMinutes: number; priority: SourcePriority }) => void;
}

const PRIORITIES: { key: SourcePriority; label: string }[] = [
  { key: 'primary', label: 'أساسي' }, { key: 'secondary', label: 'ثانوي' }, { key: 'optional', label: 'إضافي' }
];

/** بند 21-22 — أي مصدر من المكتبة (ثابت أو مضاف حديثًا) ممكن يدخل الخطة فورًا */
export function AddPlanItemSheet({ open, onClose, onAdd }: AddPlanItemSheetProps) {
  const allCustomSources = useStore(s => s.library.customSources);
  const customSources = useMemo(() => allCustomSources.filter(c => c.status !== 'archived'), [allCustomSources]);
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ id: string; kind: SourceKind; name: string; trackingType: TrackingType; defaultAmount: number; defaultMinutes: number } | null>(null);
  const [amount, setAmount] = useState('1');
  const [minutes, setMinutes] = useState('30');
  const [priority, setPriority] = useState<SourcePriority>('secondary');

  const staticList = useMemo(() => Object.keys(TOTALS).filter(n => n.toLowerCase().includes(query.toLowerCase())), [query]);
  const customList = useMemo(() => customSources.filter(c => c.title.toLowerCase().includes(query.toLowerCase())), [customSources, query]);

  function reset() {
    setStep('pick'); setQuery(''); setPicked(null); setAmount('1'); setMinutes('30'); setPriority('secondary');
  }

  function handleClose() { reset(); onClose(); }

  function pickStatic(name: string) {
    setPicked({ id: name, kind: 'static', name, trackingType: 'episodes', defaultAmount: 1, defaultMinutes: DURATIONS[name] || 30 });
    setAmount('1');
    setMinutes(String(DURATIONS[name] || 30));
    setStep('configure');
  }

  function pickCustom(src: (typeof customSources)[number]) {
    setPicked({ id: src.id, kind: 'custom', name: src.title, trackingType: src.trackingType, defaultAmount: 1, defaultMinutes: 20 });
    setAmount('1');
    setMinutes('20');
    setStep('configure');
  }

  function handleAdd() {
    if (!picked) return;
    onAdd({
      sourceId: picked.id, sourceKind: picked.kind, sourceName: picked.name,
      trackingType: picked.trackingType, targetAmount: Number(amount) || 1,
      estimatedMinutes: Number(minutes) || 0, priority
    });
    reset();
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={step === 'pick' ? 'إضافة من المكتبة' : picked?.name}>
      {step === 'pick' && (
        <>
          <Input placeholder="ابحث عن مصدر..." value={query} onChange={e => setQuery(e.target.value)} />
          <div className={styles.list}>
            {customList.length > 0 && (
              <>
                <div className={styles.groupLabel}>مصادرك</div>
                {customList.map(src => {
                  const Icon = ContentTypeIcons[src.contentType];
                  return (
                    <button key={src.id} className={styles.row} onClick={() => pickCustom(src)}>
                      <span className={styles.iconWrap}><Icon size={16} strokeWidth={1.8} /></span>
                      <span className={styles.rowName}>{src.title}</span>
                    </button>
                  );
                })}
              </>
            )}
            <div className={styles.groupLabel}>مكتبة الخطة الأساسية</div>
            {staticList.map(name => {
              const Icon = ContentTypeIcons[STATIC_CONTENT_TYPE[name] || 'other'];
              return (
                <button key={name} className={styles.row} onClick={() => pickStatic(name)}>
                  <span className={styles.iconWrap}><Icon size={16} strokeWidth={1.8} /></span>
                  <div>
                    <div className={styles.rowName}>{name}</div>
                    {SOURCE_META[name] && <div className={styles.rowSub}>{SOURCE_META[name].presenter}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 'configure' && picked && (
        <>
          <div className={styles.section}>
            <Input label={`الكمية (${trackingUnitLabel(picked.trackingType)})`} type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className={styles.section}>
            <Input label="الوقت المقدّر (دقيقة)" type="number" min={0} value={minutes} onChange={e => setMinutes(e.target.value)} />
          </div>
          <div className={styles.section}>
            <div className={styles.groupLabel}>الأولوية</div>
            <div className={styles.segmented}>
              {PRIORITIES.map(p => (
                <button key={p.key} className={`${styles.segBtn} ${priority === p.key ? styles.segActive : ''}`} onClick={() => setPriority(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.footer}>
            <Button variant="secondary" full onClick={() => setStep('pick')}>رجوع</Button>
            <Button variant="primary" full onClick={handleAdd}>إضافة لليوم</Button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
