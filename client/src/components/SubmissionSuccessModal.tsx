import type { Issue } from '../types';
import type { Language } from '../i18n';
import { translations, translateDepartment } from '../i18n';
import { downloadCasePdf } from '../utils/pdfExport';

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  issue: Issue | null;
  onClose: () => void;
  onTrack: (issueId: string) => void;
  currentLang?: Language;
}

export default function SubmissionSuccessModal({
  isOpen,
  issue,
  onClose,
  onTrack,
  currentLang = 'en',
}: SubmissionSuccessModalProps) {
  if (!isOpen || !issue) return null;

  const t = translations[currentLang];
  const deptTranslated = translateDepartment(issue.department, currentLang);
  const hours = issue.slaTargetHours || 48;
  const caseId = issue.caseId || issue.trackingId;

  const bodyText = t.thankYouBody
    .replace('{caseId}', caseId)
    .replace('{department}', deptTranslated)
    .replace('{hours}', String(hours));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-slate-800 overflow-hidden animate-slideUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebratory Gradient Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-6 text-center relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 shadow-inner ring-4 ring-white/30 animate-bounce">
            ✅
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{t.thankYouHeader}</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 font-medium">
            Official Municipal Work Order Created · Assigned & Queued
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Case File Key Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">{t.caseIdLabel}:</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {caseId}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">{t.departmentLabel}:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{deptTranslated}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">{t.slaDeadlineLabel}:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">⏱️ {hours} Hours Resolution SLA</span>
            </div>
          </div>

          {/* Dynamic Reassurance Body */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {bodyText}
          </p>

          {/* Civic Champion Motivation Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3">
            <span className="text-2xl shrink-0">🏆</span>
            <div className="text-xs text-amber-950 dark:text-amber-200 leading-snug">
              <span className="font-bold block text-amber-900 dark:text-amber-100">Civic Champion Reward:</span>
              {t.civicMotivation}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => downloadCasePdf(issue)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <span>📄</span>
                <span>{t.downloadPdfBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => onTrack(issue.id)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>{t.trackMyReportBtn}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.doneBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
