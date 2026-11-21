import type { Language } from '../i18n';
import { translations } from '../i18n';

interface AccessibilityBarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  fontScale: 'small' | 'normal' | 'large';
  onFontScaleChange: (scale: 'small' | 'normal' | 'large') => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
}

export default function AccessibilityBar({
  currentLang,
  onLanguageChange,
  fontScale,
  onFontScaleChange,
  isDarkMode,
  onDarkModeToggle,
}: AccessibilityBarProps) {
  const t = translations[currentLang];

  return (
    <div
      className={`w-full py-1.5 px-4 sm:px-6 lg:px-10 text-xs border-b transition-colors duration-200 ${
        isDarkMode
          ? 'bg-slate-950 text-slate-200 border-slate-800'
          : 'bg-slate-900 text-slate-200 border-slate-800'
      }`}
    >
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Indian Civic Tech Flag / Gov Banner */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🇮🇳</span>
          <span className="hidden sm:inline font-medium">
            Government Municipal Grievance & AI Triage Platform
          </span>
          <span className="sm:hidden font-medium">CivicResolve Gov</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] opacity-80">🌐 {t.langSelect}:</span>
            <div className="flex items-center rounded overflow-hidden border border-slate-700">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                  currentLang === 'en'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'hover:bg-slate-800'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ta')}
                className={`px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                  currentLang === 'ta'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'hover:bg-slate-800'
                }`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('hi')}
                className={`px-2 py-0.5 text-xs transition-colors cursor-pointer ${
                  currentLang === 'hi'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'hover:bg-slate-800'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] opacity-80 hidden md:inline">{t.fontSize}:</span>
            <div className="flex items-center rounded border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => onFontScaleChange('small')}
                className={`px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                  fontScale === 'small'
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-800'
                }`}
                title="Small Font (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange('normal')}
                className={`px-2 py-0.5 text-xs font-semibold cursor-pointer ${
                  fontScale === 'normal'
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-800'
                }`}
                title="Standard Font (A)"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange('large')}
                className={`px-2 py-0.5 text-sm font-bold cursor-pointer ${
                  fontScale === 'large'
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-800'
                }`}
                title="Large Font (A+)"
              >
                A+
              </button>
            </div>
          </div>

          {/* Dark Mode / Light Mode Toggle */}
          <button
            type="button"
            onClick={onDarkModeToggle}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
