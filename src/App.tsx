import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { AppHeader } from './components/AppHeader';
import { BottomNav, type PageKey } from './components/BottomNav';
import { SettingsSheet } from './components/SettingsSheet';
import { Toast } from './components/Toast';
import { OfflineBadge } from './components/OfflineBadge';
import { TodayPage } from './pages/TodayPage';
import { LibraryPage } from './features/sources/LibraryPage';
import { ProgressPage } from './pages/ProgressPage';
import { SessionSheet } from './features/session/SessionSheet';
import { PhaseCompleteModal } from './features/progress/PhaseCompleteModal';
import { getNextEpisodeNumber } from './lib/taskEngine';
import './styles/tokens.css';
import './styles/layout.css';

export default function App() {
  const hydrate = useStore(s => s.hydrate);
  const checkAndProcessNewDay = useStore(s => s.checkAndProcessNewDay);
  const startSession = useStore(s => s.startSession);
  const theme = useStore(s => s.userSettings.theme);
  const font = useStore(s => s.userSettings.font);
  const fontSize = useStore(s => s.userSettings.fontSize);
  const bg = useStore(s => s.userSettings.bg);
  const customBg = useStore(s => s.userSettings.customBg);
  const bgOpacity = useStore(s => s.userSettings.bgOpacity);
  const safeMode = useStore(s => s.safeMode);
  const progress = useStore(s => s.progressState.progress);

  const [page, setPage] = useState<PageKey>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    checkAndProcessNewDay();
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تطبيق الثيم/الخط على document — Light/Dark/System حقيقيين
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');

    function applyTheme() {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.setAttribute('data-theme', resolved === 'light' ? 'light' : 'dark');
    }

    applyTheme();
    if (theme === 'system') {
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', `'${font}', sans-serif`);
    const FONT_SIZES = [13, 14, 15, 16, 18];
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZES[fontSize] + 'px');
    const bgVal = bg === 'custom' && customBg ? `url(${customBg})` : 'none';
    document.documentElement.style.setProperty('--bg-img', bgVal);
    document.documentElement.style.setProperty('--bg-opacity', String(bgOpacity));
  }, [font, fontSize, bg, customBg, bgOpacity]);

  function handleStartSession(taskId: string, sourceName: string, episode: number, isCarryover: boolean, carryId?: string) {
    startSession(taskId, sourceName, episode, isCarryover, carryId);
  }

  if (!hydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #8aa3bf)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <OfflineBadge />

      {safeMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#7f1d1d', color: '#fff', padding: '14px 16px', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          حدث خطأ أثناء تحميل بعض البيانات. <strong>بياناتك لم يتم حذفها.</strong><br />
          يمكنك تصدير نسخة احتياطية أو محاولة الاستعادة من الإعدادات.
        </div>
      )}

      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

      {page === 'today' && <TodayPage onStartSession={handleStartSession} />}
      {page === 'library' && (
        <div className="main-column">
          <LibraryPage onContinueSource={(sourceName: string) => {
            const episode = getNextEpisodeNumber(sourceName, progress);
            handleStartSession('library', sourceName, episode, false);
          }} />
        </div>
      )}
      {page === 'progress' && (
        <div className="main-column">
          <ProgressPage />
        </div>
      )}

      <BottomNav active={page} onChange={setPage} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SessionSheet />
      <PhaseCompleteModal />
      <Toast />
    </div>
  );
}
