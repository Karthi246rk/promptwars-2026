import { useState, useEffect } from 'react';
import type { HealthStatus, CitizenProfile } from './types';
import { fetchHealth, loginCitizen } from './api';
import ReportIssue from './components/ReportIssue';
import IssueTracker from './components/IssueTracker';
import IssueMap from './components/IssueMap';
import AdminDashboard from './components/AdminDashboard';
import AccessibilityBar from './components/AccessibilityBar';
import NotificationCentre from './components/NotificationCentre';
import CitizenAuthModal from './components/CitizenAuthModal';
import HelplineModal from './components/HelplineModal';
import CivicChampions from './components/CivicChampions';
import type { Language } from './i18n';
import { translations } from './i18n';

type Tab = 'report' | 'tracker' | 'map' | 'champions' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('report');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [trackerSelectedId, setTrackerSelectedId] = useState<string | null>(null);

  // Citizen Authentication State (sessionStorage / in-memory only, no persistent localStorage)
  const [currentCitizen, setCurrentCitizen] = useState<CitizenProfile | null>(() => {
    try {
      const stored = sessionStorage.getItem('civicresolve_citizen_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isCitizenAuthOpen, setIsCitizenAuthOpen] = useState(false);

  // Helpline Directory State
  const [isHelplineOpen, setIsHelplineOpen] = useState(false);

  // Multilingual & Accessibility State
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('civicresolve_lang') as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  const [fontScale, setFontScale] = useState<'small' | 'normal' | 'large'>(() => {
    try {
      return (localStorage.getItem('civicresolve_font_scale') as any) || 'normal';
    } catch {
      return 'normal';
    }
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('civicresolve_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Notifications State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = translations[currentLang];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'report', label: t.tabReport, icon: '📝' },
    { key: 'tracker', label: t.tabTracker, icon: '📊' },
    { key: 'champions', label: t.tabChampions, icon: '🏆' },
    { key: 'map', label: t.tabMap, icon: '🗺️' },
    { key: 'admin', label: t.tabAdmin, icon: '⚙️' },
  ];

  useEffect(() => {
    fetchHealth()
      .then(setHealthStatus)
      .catch(() => setHealthStatus(null));
  }, []);

  // Sync dark mode class on root HTML
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('civicresolve_theme', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  // Update root font size when fontScale changes
  useEffect(() => {
    const root = document.documentElement;
    if (fontScale === 'small') {
      root.style.fontSize = '14px';
    } else if (fontScale === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
    try {
      localStorage.setItem('civicresolve_font_scale', fontScale);
    } catch {}
  }, [fontScale]);

  // Persist language
  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem('civicresolve_lang', lang);
    } catch {}
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setRefreshCounter((prev) => prev + 1);
  };

  const handleIssueCreated = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const handleCitizenLoginSuccess = (citizen: CitizenProfile) => {
    setCurrentCitizen(citizen);
    setIsCitizenAuthOpen(false);
  };

  const handleCitizenLogout = () => {
    sessionStorage.removeItem('civicresolve_citizen_user');
    sessionStorage.removeItem('civicresolve_citizen_token');
    setCurrentCitizen(null);
  };

  const handleQuickDemoCitizen = async () => {
    try {
      const res = await loginCitizen('citizen@civicresolve.in', 'citizen123');
      sessionStorage.setItem('civicresolve_citizen_user', JSON.stringify(res.citizen));
      sessionStorage.setItem('civicresolve_citizen_token', res.token);
      setCurrentCitizen(res.citizen);
    } catch (err: any) {
      alert(err.message || 'Demo sign-in failed');
    }
  };

  const isHealthy = healthStatus?.status === 'ok';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {/* Accessibility & Indian Multilingual Bar */}
      <AccessibilityBar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        isDarkMode={isDarkMode}
        onDarkModeToggle={handleDarkModeToggle}
      />

      {/* Offline / No-Service Helpline Banner */}
      {!isHealthy && (
        <div className="bg-amber-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              Municipal Server Connection Unavailable. You can still report emergencies via Department Toll-Free Helplines.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsHelplineOpen(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            📞 View Helplines
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-xs border-b border-gray-200 dark:border-slate-800 transition-colors">
        <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🏛️</span>
              <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400 tracking-tight">
                CivicResolve
              </span>
            </div>

            {/* Center: Grouped Platform Navigation */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-100/90 dark:bg-slate-800/80 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
              {/* Section 1: Public Portal */}
              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-gray-200/60 dark:border-slate-750 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-indigo-950 dark:text-indigo-300 tracking-wider px-1.5">Public</span>
                <button
                  type="button"
                  onClick={() => handleTabChange('report')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'report'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>📝</span> {t.tabReport}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('tracker')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'tracker'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>📊</span> {t.tabTracker}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('champions')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'champions'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>🏆</span> {t.tabChampions}
                </button>
              </div>

              {/* Section 2: Intelligence */}
              <button
                type="button"
                onClick={() => handleTabChange('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold border border-gray-200 dark:border-slate-700'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>🗺️</span> Intelligence Map
              </button>

              {/* Section 3: Administration (Command Centre) */}
              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold border border-gray-200 dark:border-slate-700'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>🏛️</span> Admin & Dept Portal
              </button>
            </div>

            {/* Medium screen tabs */}
            <div className="hidden sm:flex lg:hidden items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Citizen Profile Badge / Login + Helpline + Notifications + Health */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Helplines Button */}
              <button
                type="button"
                onClick={() => setIsHelplineOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                title="Toll-free municipal department helplines"
              >
                <span>📞</span>
                <span>Helplines</span>
              </button>

              {/* Citizen Authentication Pill */}
              {currentCitizen ? (
                <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-2.5 py-1 text-xs">
                  <div className="flex items-center gap-1 text-indigo-900 dark:text-indigo-200 font-semibold">
                    <span>👤</span>
                    <span className="truncate max-w-[100px] sm:max-w-[130px]">{currentCitizen.name}</span>
                  </div>
                  <span className="bg-indigo-200/80 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                    {currentCitizen.civicScore} pts
                  </span>
                  <button
                    type="button"
                    onClick={handleCitizenLogout}
                    className="text-gray-400 hover:text-red-600 ml-1 font-bold text-xs cursor-pointer"
                    title="Sign Out Citizen"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCitizenAuthOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>🇮🇳</span>
                  <span className="hidden sm:inline">Citizen Sign-In</span>
                  <span className="sm:hidden">Sign In</span>
                </button>
              )}

              {/* Notification Bell Button */}
              <button
                type="button"
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 rounded-xl text-gray-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-gray-200 dark:border-slate-700 shadow-2xs"
                title="Open Citizen Notification Centre"
              >
                <span className="text-lg block">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Health status pill */}
              <div
                className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isHealthy
                    ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse-dot ${
                    isHealthy ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {isHealthy ? t.aiOnline : 'Offline'}
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="flex sm:hidden gap-1 pb-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsHelplineOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            >
              <span>📞</span> Helplines
            </button>
          </div>
        </div>
      </nav>

      {/* Citizen Notification Centre Drawer */}
      <NotificationCentre
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        currentLang={currentLang}
        onNotificationCountChange={setUnreadCount}
        onSelectCase={(caseId) => {
          setTrackerSelectedId(caseId);
          setActiveTab('tracker');
        }}
      />

      {/* Helplines Directory Modal */}
      <HelplineModal
        isOpen={isHelplineOpen}
        onClose={() => setIsHelplineOpen(false)}
        isServerOffline={!isHealthy}
      />

      {/* Citizen Authentication Gate Modal */}
      <CitizenAuthModal
        isOpen={isCitizenAuthOpen}
        onSuccess={handleCitizenLoginSuccess}
        onClose={() => setIsCitizenAuthOpen(false)}
        canClose={true}
        currentLang={currentLang}
      />

      {/* Main Content: Keep all 4 views mounted to preserve state */}
      <main className="w-full max-w-[1600px] mx-auto px-6 lg:px-10 py-6">
        {/* PUBLIC PORTAL: Report Issue Tab */}
        <div className={activeTab === 'report' ? 'block animate-fadeIn' : 'hidden'}>
          {!currentCitizen ? (
            <div className="max-w-xl mx-auto my-8 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800 p-8 text-center space-y-5 animate-slideUp">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                📝
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Citizen Authentication Required
                </h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1.5">
                  Under municipal governance bylaws, citizens must sign in with a verified mobile number & password to report issues and track resolutions.
                </p>
              </div>

              {/* 1-Click Demo Citizen Sign In Button */}
              <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-xl text-left space-y-2">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>⚡ Evaluator 1-Click Access</span>
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">Score: 100 pts</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Demo Citizen: <strong className="font-mono text-gray-900 dark:text-slate-200">citizen@civicresolve.in</strong> / <strong className="font-mono text-gray-900 dark:text-slate-200">citizen123</strong>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoCitizen}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  ⚡ Sign In as Demo Citizen
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsCitizenAuthOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Sign In with Another Account or Register New Citizen →
                </button>
              </div>
            </div>
          ) : (
            <ReportIssue
              onSwitchTab={handleTabChange}
              onIssueCreated={handleIssueCreated}
              currentLang={currentLang}
              currentCitizen={currentCitizen}
            />
          )}
        </div>

        {/* PUBLIC PORTAL: Issue Tracker Tab */}
        <div className={activeTab === 'tracker' ? 'block animate-fadeIn' : 'hidden'}>
          {!currentCitizen ? (
            <div className="max-w-xl mx-auto my-8 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800 p-8 text-center space-y-5 animate-slideUp">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                📊
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Citizen Sign-In Required for Case Files
                </h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1.5">
                  Sign in to view official digital case files, track real-time SLA deadlines, provide resolution ratings, and download official PDF case reports.
                </p>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-xl text-left space-y-2">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>⚡ Evaluator 1-Click Access</span>
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">Score: 100 pts</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Demo Citizen: <strong className="font-mono text-gray-900 dark:text-slate-200">citizen@civicresolve.in</strong> / <strong className="font-mono text-gray-900 dark:text-slate-200">citizen123</strong>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoCitizen}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  ⚡ Sign In as Demo Citizen
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsCitizenAuthOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Sign In with Another Account or Register New Citizen →
                </button>
              </div>
            </div>
          ) : (
            <IssueTracker
              refreshTrigger={refreshCounter}
              initialSelectedIssueId={trackerSelectedId}
              currentLang={currentLang}
            />
          )}
        </div>

        {/* PUBLIC PORTAL: Civic Champions & Rewards Tab */}
        <div className={activeTab === 'champions' ? 'block animate-fadeIn' : 'hidden'}>
          <CivicChampions
            currentCitizen={currentCitizen}
            currentLang={currentLang}
          />
        </div>

        {/* Intelligence Map Tab */}
        <div className={activeTab === 'map' ? 'block animate-fadeIn' : 'hidden'}>
          <IssueMap
            refreshTrigger={refreshCounter}
            isActive={activeTab === 'map'}
            currentLang={currentLang}
            onOpenIssueDetail={(issue) => {
              setTrackerSelectedId(issue.id);
              setActiveTab('tracker');
            }}
          />
        </div>

        {/* Administration / Department Portal Tab */}
        <div className={activeTab === 'admin' ? 'block animate-fadeIn' : 'hidden'}>
          <AdminDashboard
            refreshTrigger={refreshCounter}
            currentLang={currentLang}
          />
        </div>
      </main>
    </div>
  );
}
