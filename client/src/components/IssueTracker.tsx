import { useState, useEffect, useCallback, useRef } from 'react';
import type { Issue, Stats } from '../types';
import { fetchIssues, fetchStats, upvoteIssue, rateIssue, reopenIssue, translateTexts } from '../api';
import type { Language } from '../i18n';
import {
  translations,
  translateCategory,
  translateStatus,
  translatePriority,
  translateDepartment,
  getFallbackIssueTranslation,
} from '../i18n';
import { downloadCasePdf } from '../utils/pdfExport';

const CATEGORIES = [
  'Road & Potholes',
  'Water Leakage & Supply',
  'Garbage & Sanitation',
  'Streetlights & Power',
  'Public Safety',
  'Other',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Reported', 'In Progress', 'Resolved'];

const CATEGORY_ICONS: Record<string, string> = {
  'Road & Potholes': '🛣️',
  'Water Leakage & Supply': '💧',
  'Garbage & Sanitation': '🗑️',
  'Streetlights & Power': '💡',
  'Public Safety': '🛡️',
  'Other': '📋',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

const STATUS_COLORS: Record<string, string> = {
  Reported: 'bg-red-100 text-red-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Rejected: 'bg-gray-200 text-gray-700',
};

function StatusProgressBar({ status }: { status: string }) {
  const steps = ['Reported', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-0 w-full my-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                i <= currentIndex
                  ? i === 0
                    ? 'bg-red-500 border-red-500'
                    : i === 1
                    ? 'bg-yellow-500 border-yellow-500'
                    : 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              }`}
            />
            <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 transition-all duration-200 ${
                i < currentIndex ? 'bg-indigo-400' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  refreshTrigger?: number;
  initialSelectedIssueId?: string | null;
  currentLang?: Language;
}

export default function IssueTracker({ refreshTrigger, initialSelectedIssueId, currentLang = 'en' }: Props = {}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rating & Reopen state in Detail Modal
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>('');
  const [ratingSubmitting, setRatingSubmitting] = useState<boolean>(false);
  const [isReopening, setIsReopening] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopenSubmitting, setReopenSubmitting] = useState<boolean>(false);

  // Text-to-Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Dynamic In-Memory Translations Store
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  const t = translations[currentLang];

  // Dynamic Batch Translation Hook
  useEffect(() => {
    if (currentLang === 'en' || issues.length === 0) {
      return;
    }

    let isMounted = true;
    const keysToTranslate: { key: string; text: string }[] = [];

    // Collect visible issues' texts
    issues.forEach((i) => {
      if (i.title && !translatedMap[`${currentLang}:${i.id}:title`]) {
        keysToTranslate.push({ key: `${currentLang}:${i.id}:title`, text: i.title });
      }
      if (i.description && !translatedMap[`${currentLang}:${i.id}:desc`]) {
        keysToTranslate.push({ key: `${currentLang}:${i.id}:desc`, text: i.description });
      }
      if (i.location && !translatedMap[`${currentLang}:${i.id}:loc`]) {
        keysToTranslate.push({ key: `${currentLang}:${i.id}:loc`, text: i.location });
      }
      if (i.aiSummary && !translatedMap[`${currentLang}:${i.id}:summary`]) {
        keysToTranslate.push({ key: `${currentLang}:${i.id}:summary`, text: i.aiSummary });
      }
    });

    // If detail modal is open, collect its texts too
    if (selectedIssue) {
      if (selectedIssue.title && !translatedMap[`${currentLang}:${selectedIssue.id}:title`]) {
        keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:title`, text: selectedIssue.title });
      }
      if (selectedIssue.description && !translatedMap[`${currentLang}:${selectedIssue.id}:desc`]) {
        keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:desc`, text: selectedIssue.description });
      }
      if (selectedIssue.location && !translatedMap[`${currentLang}:${selectedIssue.id}:loc`]) {
        keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:loc`, text: selectedIssue.location });
      }
      if (selectedIssue.impactReasoning && !translatedMap[`${currentLang}:${selectedIssue.id}:impact`]) {
        keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:impact`, text: selectedIssue.impactReasoning });
      }
      if (selectedIssue.recommendedAction && !translatedMap[`${currentLang}:${selectedIssue.id}:action`]) {
        keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:action`, text: selectedIssue.recommendedAction });
      }
      selectedIssue.publicUpdates?.forEach((u) => {
        if (u.update && !translatedMap[`${currentLang}:${selectedIssue.id}:update:${u.id}`]) {
          keysToTranslate.push({ key: `${currentLang}:${selectedIssue.id}:update:${u.id}`, text: u.update });
        }
      });
    }

    if (keysToTranslate.length === 0) {
      return;
    }

    setIsTranslating(true);
    translateTexts(
      keysToTranslate.map((k) => k.text),
      currentLang
    )
      .then((translations) => {
        if (!isMounted) return;
        const newEntries: Record<string, string> = {};
        keysToTranslate.forEach((k, idx) => {
          if (translations[idx]) {
            newEntries[k.key] = translations[idx];
          }
        });
        setTranslatedMap((prev) => ({ ...prev, ...newEntries }));
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsTranslating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentLang, issues, selectedIssue]);

  const getTrans = (id: string, field: string, fallback: string): string => {
    if (currentLang === 'en' || !fallback) return fallback;
    const dynamic = translatedMap[`${currentLang}:${id}:${field}`];
    if (dynamic && dynamic !== fallback) return dynamic;
    const dict = getFallbackIssueTranslation(fallback, currentLang);
    if (dict && dict !== fallback) return dict;
    return dynamic || fallback;
  };

  const handleToggleTts = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (currentLang === 'ta') {
      utterance.lang = 'ta-IN';
    } else if (currentLang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Upvote anti-spam tracked via localStorage
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('civicresolve_upvoted_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const loadData = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (searchTerm) filters.search = searchTerm;
      if (categoryFilter) filters.category = categoryFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (statusFilter) filters.status = statusFilter;

      const [issuesData, statsData] = await Promise.all([
        fetchIssues(filters),
        fetchStats(),
      ]);
      setIssues(issuesData);
      setStats(statsData);

      if (initialSelectedIssueId) {
        const found = issuesData.find((i) => i.id === initialSelectedIssueId || i.trackingId === initialSelectedIssueId);
        if (found) setSelectedIssue(found);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, priorityFilter, statusFilter, initialSelectedIssueId]);

  useEffect(() => {
    loadData(search);
  }, [loadData, refreshTrigger, categoryFilter, priorityFilter, statusFilter]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadData(value), 300);
  };

  const handleUpvote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isUpvoted = upvotedIds.has(id);
    const action = isUpvoted ? 'remove' : 'add';

    try {
      const updated = await upvoteIssue(id, action);
      const next = new Set(upvotedIds);
      if (isUpvoted) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setUpvotedIds(next);
      localStorage.setItem('civicresolve_upvoted_ids', JSON.stringify([...next]));
      setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
      if (selectedIssue?.id === id) setSelectedIssue(updated);
    } catch {
      // silent
    }
  };

  const handleRateIssue = async () => {
    if (!selectedIssue) return;
    setRatingSubmitting(true);
    try {
      const updated = await rateIssue(selectedIssue.id, ratingVal, ratingFeedback);
      setSelectedIssue(updated);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      fetchStats().then(setStats);
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleReopenIssue = async () => {
    if (!selectedIssue) return;
    setReopenSubmitting(true);
    try {
      const updated = await reopenIssue(selectedIssue.id, reopenReason || 'Issue not properly resolved on the ground');
      setSelectedIssue(updated);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setIsReopening(false);
      fetchStats().then(setStats);
      alert('Issue reopened and marked as Reported. Municipal authorities have been notified.');
    } catch (err: any) {
      alert(err.message || 'Failed to reopen issue');
    } finally {
      setReopenSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Community Resolution Progress Banner */}
      {stats && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🏘️ Community Resolution Progress</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Resolution Rate</span>
              <span className="text-sm font-bold text-indigo-700">{stats.resolutionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <span className="text-2xl">🔴</span>
              <p className="text-2xl font-bold text-red-700">{stats.byStatus.Reported}</p>
              <p className="text-xs text-red-600 font-medium">Reported</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <span className="text-2xl">🟡</span>
              <p className="text-2xl font-bold text-yellow-700">{stats.byStatus.InProgress}</p>
              <p className="text-xs text-yellow-600 font-medium">In Progress</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <span className="text-2xl">🟢</span>
              <p className="text-2xl font-bold text-green-700">{stats.byStatus.Resolved}</p>
              <p className="text-xs text-green-600 font-medium">Resolved</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 p-4 space-y-3">
        {/* Search + Translating indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
            />
          </div>
          {isTranslating && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold animate-pulse">
              <span>{t.translatingIndicator}</span>
            </div>
          )}
        </div>

        {/* Category pills */}
        <div>
          <span className="text-xs font-medium text-gray-500 mr-2">{t.categoryLabel}:</span>
          <div className="inline-flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                !categoryFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.allCategories}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {CATEGORY_ICONS[cat]} {translateCategory(cat, currentLang)}
              </button>
            ))}
          </div>
        </div>

        {/* Priority pills */}
        <div>
          <span className="text-xs font-medium text-gray-500 mr-2">{t.priorityScoreLabel}:</span>
          <div className="inline-flex flex-wrap gap-1.5">
            <button
              onClick={() => setPriorityFilter('')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                !priorityFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.allPriorities}
            </button>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p === priorityFilter ? '' : p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  priorityFilter === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {translatePriority(p, currentLang)}
              </button>
            ))}
          </div>
        </div>

        {/* Status pills */}
        <div>
          <span className="text-xs font-medium text-gray-500 mr-2">Status:</span>
          <div className="inline-flex flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                !statusFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.allStatuses}
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {translateStatus(s, currentLang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Issue Cards Grid: responsive 4-col full width */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-3 text-sm">Loading issues...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200">
          <span className="text-5xl">📭</span>
          <h3 className="text-lg font-semibold text-gray-700 mt-4">No issues found</h3>
          <p className="text-gray-500 mt-1 text-sm">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {issues.map((issue) => {
            const displayTitle = getTrans(issue.id, 'title', issue.title);
            const displaySummary = getTrans(issue.id, 'summary', issue.aiSummary);
            const deptName = translateDepartment(issue.department, currentLang);
            const catName = translateCategory(issue.category, currentLang);
            const prioName = translatePriority(issue.priority, currentLang);
            const statName = translateStatus(issue.status, currentLang);

            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  {issue.imageUrl && (
                    <img
                      src={issue.imageUrl}
                      alt={displayTitle}
                      className="w-full h-36 object-cover"
                    />
                  )}

                  <div className="p-4 space-y-2.5">
                    {/* Top Badges Row */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        {issue.trackingId}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(issue.citizenReportCount || 1) > 1 && (
                          <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                            👥 {issue.citizenReportCount} Reports
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[issue.status] || ''}`}>
                          {statName}
                        </span>
                      </div>
                    </div>

                    {/* SLA Badge */}
                    {issue.slaBreached ? (
                      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                        <span>🚨</span>
                        <span>SLA BREACHED (+{issue.hoursOverdue || 24}h) • ESCALATED</span>
                      </div>
                    ) : issue.status !== 'Resolved' && issue.status !== 'Rejected' ? (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <span>⏱️</span>
                        <span>Target: {issue.slaTargetHours || 48}h SLA</span>
                      </div>
                    ) : null}

                    {/* Title (Translated) */}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {displayTitle}
                    </h3>

                    {/* Category + Priority */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {CATEGORY_ICONS[issue.category] || '📋'} {catName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[issue.priority] || ''}`}>
                        {prioName}
                      </span>
                    </div>

                    {/* Status Progress Bar */}
                    <StatusProgressBar status={issue.status} />

                    {/* Location */}
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">📍 {getTrans(issue.id, 'loc', issue.location)}</p>

                    {/* Department */}
                    <p className="text-xs text-gray-500 dark:text-slate-400">🏢 {deptName}</p>

                    {/* AI Summary (Translated) */}
                    <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">{displaySummary}</p>
                  </div>
                </div>

                {/* Bottom Upvote & Date Bar */}
                <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={(e) => handleUpvote(e, issue.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                      upvotedIds.has(issue.id)
                        ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                        : 'text-gray-700 dark:text-slate-300 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                    }`}
                    title={upvotedIds.has(issue.id) ? 'Click to remove support' : 'Click to support this civic issue'}
                  >
                    <span>{upvotedIds.has(issue.id) ? t.supportedBtn : t.supportBtn}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                      upvotedIds.has(issue.id) ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200'
                    }`}>
                      {issue.upvotes}
                    </span>
                  </button>

                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {new Date(issue.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Detail Modal with Before & After Photo Comparison */}
      {selectedIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedIssue(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp border border-gray-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-bold px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                  {selectedIssue.caseId || selectedIssue.trackingId}
                </span>
                {(selectedIssue.citizenReportCount || 1) > 1 && (
                  <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                    👥 {selectedIssue.citizenReportCount} Reports Consolidated
                  </span>
                )}
                {(selectedIssue.reopenCount || 0) > 0 && (
                  <span className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
                    🔄 Reopened {selectedIssue.reopenCount} time(s)
                  </span>
                )}
              </div>

              {/* Action buttons: Read Aloud & Download Official Case PDF */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleTts(
                      `${getTrans(selectedIssue.id, 'title', selectedIssue.title)}. Case ID ${selectedIssue.caseId || selectedIssue.trackingId}. ${getTrans(selectedIssue.id, 'summary', selectedIssue.aiSummary)}. Assigned to ${translateDepartment(selectedIssue.department, currentLang)}. Status: ${translateStatus(selectedIssue.status, currentLang)}`
                    )
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                  }`}
                  title="Read Case Details Aloud"
                >
                  <span>{isSpeaking ? '⏹️' : '🔊'}</span>
                  <span className="hidden sm:inline">{isSpeaking ? t.stopVoiceBtn : t.readAloudBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadCasePdf(selectedIssue)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                  title="Download Official Municipal Digital Case PDF"
                >
                  <span>📄</span>
                  <span className="hidden sm:inline">{t.downloadPdfBtn}</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  onClick={() => {
                    if (isSpeaking) {
                      window.speechSynthesis?.cancel();
                      setIsSpeaking(false);
                    }
                    setSelectedIssue(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-all duration-200 text-xl leading-none p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Digital Case File Overview Banner */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Subcategory</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{selectedIssue.subcategory || 'General Municipal Issue'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Citizen Name</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{selectedIssue.citizenName || 'Concerned Citizen'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Citizen Contact</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{selectedIssue.citizenContact || selectedIssue.reporterContact || 'Confidential'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">SLA Target</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">{selectedIssue.slaTargetHours || 48} Hours</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{getTrans(selectedIssue.id, 'title', selectedIssue.title)}</h2>

              {/* Before vs After Photos (if completion evidence uploaded) */}
              {selectedIssue.completionEvidenceUrl ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Resolution Verification (Before vs After)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 text-center">
                      <span className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                        📷 Before (Citizen Report)
                      </span>
                      {selectedIssue.imageUrl ? (
                        <img
                          src={selectedIssue.imageUrl}
                          alt="Before"
                          className="w-full h-44 object-cover rounded"
                        />
                      ) : (
                        <div className="h-44 flex items-center justify-center text-xs text-gray-400">
                          No initial photo
                        </div>
                      )}
                    </div>

                    <div className="bg-green-50 rounded-lg p-2 border border-green-200 text-center">
                      <span className="text-[11px] font-bold text-green-700 uppercase block mb-1">
                        ✅ After (Field Completion Evidence)
                      </span>
                      <img
                        src={selectedIssue.completionEvidenceUrl}
                        alt="After (Completion Evidence)"
                        className="w-full h-44 object-cover rounded"
                      />
                    </div>
                  </div>
                </div>
              ) : selectedIssue.imageUrls && selectedIssue.imageUrls.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      📸 Attached Photo Evidence ({selectedIssue.imageUrls.length})
                    </span>
                    {selectedIssue.authenticityCheck && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedIssue.authenticityCheck.status === 'Verified'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : selectedIssue.authenticityCheck.status === 'Suspected Fake'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {selectedIssue.authenticityCheck.status === 'Verified'
                          ? '✅ AI Photo: Verified Real'
                          : selectedIssue.authenticityCheck.status === 'Suspected Fake'
                          ? '🚩 AI Photo: Suspected Fake'
                          : '⏳ AI Photo Check Pending...'}
                      </span>
                    )}
                  </div>
                  <div className={`grid gap-2 ${
                    selectedIssue.imageUrls.length === 1
                      ? 'grid-cols-1'
                      : selectedIssue.imageUrls.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3'
                  }`}>
                    {selectedIssue.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={url}
                          alt={`Evidence #${idx + 1}`}
                          className="w-full h-40 object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          Photo #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedIssue.imageUrl ? (
                <div className="space-y-2">
                  <img
                    src={selectedIssue.imageUrl}
                    alt={selectedIssue.title}
                    className="w-full rounded-lg object-cover max-h-80"
                  />
                  {selectedIssue.authenticityCheck && (
                    <div className="flex justify-end">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedIssue.authenticityCheck.status === 'Verified'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : selectedIssue.authenticityCheck.status === 'Suspected Fake'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {selectedIssue.authenticityCheck.status === 'Verified'
                          ? '✅ AI Photo: Verified Real'
                          : selectedIssue.authenticityCheck.status === 'Suspected Fake'
                          ? '🚩 AI Photo: Suspected Fake'
                          : '⏳ AI Photo Check Pending...'}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t.descLabel}</h4>
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  {getTrans(selectedIssue.id, 'desc', selectedIssue.description)}
                </p>
              </div>

              {/* SLA Alert if breached */}
              {selectedIssue.slaBreached && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg p-3 text-xs text-red-900 dark:text-red-200 font-medium flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <div>
                    <strong>SLA Target Breached (+{selectedIssue.hoursOverdue || 24} hours overdue):</strong> This issue has been auto-escalated to senior municipal authorities for emergency clearance.
                  </div>
                </div>
              )}

              {/* AI Triage Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t.categoryLabel}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                    {CATEGORY_ICONS[selectedIssue.category] || '📋'} {translateCategory(selectedIssue.category, currentLang)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t.priorityScoreLabel}</span>
                  <p className={`text-sm font-medium ${selectedIssue.priority === 'Critical' ? 'text-red-700 dark:text-red-400' : selectedIssue.priority === 'High' ? 'text-orange-700 dark:text-orange-400' : selectedIssue.priority === 'Medium' ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>
                    {translatePriority(selectedIssue.priority, currentLang)} ({selectedIssue.priorityScore}/100)
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t.departmentLabel}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                    🏢 {translateDepartment(selectedIssue.department, currentLang)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{t.locationLabel}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200">📍 {getTrans(selectedIssue.id, 'loc', selectedIssue.location)}</p>
                  {selectedIssue.latitude && selectedIssue.longitude && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block font-mono">
                      GPS: {selectedIssue.latitude}, {selectedIssue.longitude}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Officer (if present) */}
              {selectedIssue.assignedOfficer && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">👮 Assigned Field Officer:</span> {selectedIssue.assignedOfficer}
                </div>
              )}

              {/* Impact Reasoning (Translated) */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">{t.impactReasoningLabel}</h4>
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  {getTrans(selectedIssue.id, 'impact', selectedIssue.impactReasoning)}
                </p>
              </div>

              {/* AI Summary (Translated) */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">{t.aiSummaryLabel}</h4>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {getTrans(selectedIssue.id, 'summary', selectedIssue.aiSummary)}
                </p>
              </div>

              {/* Recommended Action (Translated) */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/60 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">{t.recommendedActionLabel}</h4>
                <p className="text-sm text-green-900 dark:text-green-200">
                  {getTrans(selectedIssue.id, 'action', selectedIssue.recommendedAction)}
                </p>
              </div>

              {/* Citizen Resolution Feedback & Reopen Widget (When Resolved) */}
              {selectedIssue.status === 'Resolved' && (
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Citizen Resolution Feedback & Audit
                        </h4>
                        <p className="text-[11px] text-emerald-700">
                          Directly impacts Department Performance Score (0–100) & municipal grading
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full">
                      ✓ Resolved Work Order
                    </span>
                  </div>

                  {selectedIssue.citizenRating ? (
                    <div className="bg-white rounded-lg p-3 border border-emerald-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <span className="text-base tracking-widest">
                          {'★'.repeat(selectedIssue.citizenRating)}
                          {'☆'.repeat(5 - selectedIssue.citizenRating)}
                        </span>
                        <span className="text-gray-900 font-bold">
                          {selectedIssue.citizenRating} / 5 Stars
                        </span>
                      </div>
                      {selectedIssue.citizenFeedback && (
                        <p className="text-gray-700 italic">"{selectedIssue.citizenFeedback}"</p>
                      )}
                      <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-gray-100">
                        ✓ Recorded into Municipal Satisfaction Index
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-3 border border-emerald-200 space-y-2.5">
                      <label className="block text-xs font-bold text-gray-800">
                        Rate the quality & timeliness of this municipal resolution:
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            className={`text-2xl transition-transform hover:scale-125 ${
                              star <= ratingVal ? 'text-amber-400' : 'text-gray-300'
                            }`}
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="text-xs font-bold text-gray-700 ml-2">
                          {ratingVal === 5 ? '5/5 - Highly Satisfied' : ratingVal === 4 ? '4/5 - Satisfied' : ratingVal === 3 ? '3/5 - Neutral' : ratingVal === 2 ? '2/5 - Dissatisfied' : '1/5 - Very Dissatisfied'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional: share feedback on the field crew's work..."
                        value={ratingFeedback}
                        onChange={(e) => setRatingFeedback(e.target.value)}
                        className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleRateIssue}
                        disabled={ratingSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                      >
                        {ratingSubmitting ? 'Submitting...' : 'Submit Satisfaction Rating'}
                      </button>
                    </div>
                  )}

                  {/* Citizen Reopen Capability */}
                  <div className="pt-2 border-t border-emerald-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700 font-medium">
                        Did the fix fail, or is the issue still persisting on the ground?
                      </span>
                      {!isReopening && (
                        <button
                          type="button"
                          onClick={() => setIsReopening(true)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          🔄 Issue Not Fixed? Reopen
                        </button>
                      )}
                    </div>

                    {isReopening && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-2 animate-fadeIn">
                        <label className="block text-xs font-bold text-red-900">
                          State the reason for reopening this complaint:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Patch broke after rain, water leak still pooling..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          className="w-full text-xs p-2 border border-red-300 rounded bg-white text-gray-900 outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleReopenIssue}
                            disabled={reopenSubmitting}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                          >
                            {reopenSubmitting ? 'Reopening...' : 'Confirm Reopen Ticket'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsReopening(false)}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              {selectedIssue.statusHistory && selectedIssue.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Timeline</h4>
                  <div className="space-y-3">
                    {selectedIssue.statusHistory.map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.status === 'Reported' ? 'bg-red-500' :
                            entry.status === 'In Progress' ? 'bg-yellow-500' :
                            entry.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          {i < selectedIssue.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 my-1" />
                          )}
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-gray-600 mt-1">{entry.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Updates (Citizen Visible) */}
              {selectedIssue.publicUpdates && selectedIssue.publicUpdates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span>📢</span> {t.publicUpdatesTitle}
                  </h4>
                  <div className="space-y-2">
                    {selectedIssue.publicUpdates.map((pub) => (
                      <div key={pub.id} className="bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold mb-1">
                          <span>{pub.author || 'Municipal Authority'}</span>
                          <span className="text-gray-400 dark:text-slate-500 font-normal">{new Date(pub.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
                          {getTrans(selectedIssue.id, `update:${pub.id}`, pub.update)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Action History */}
              {selectedIssue.actionHistory && selectedIssue.actionHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <span>📜</span> {t.actionHistoryTitle || 'Immutable Case Audit Trail'}
                    </h4>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>🛡️</span> Tamper-Evident Append-Only Ledger
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 w-32">Date & Time</th>
                          <th className="px-3 py-2">Action</th>
                          <th className="px-3 py-2 w-44">Performed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedIssue.actionHistory.map((act, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                              {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2 text-slate-800 font-medium leading-snug">{act.action}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 text-xs block">{act.performedBy}</span>
                              <span className="text-[10px] text-indigo-600 font-medium">({act.role})</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upvotes & Meta */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-500">
                <button
                  onClick={(e) => handleUpvote(e, selectedIssue.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    upvotedIds.has(selectedIssue.id)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  title={upvotedIds.has(selectedIssue.id) ? 'Click to remove support' : 'Click to support this civic issue'}
                >
                  <span>{upvotedIds.has(selectedIssue.id) ? '✓ Supported' : '👍 Support Issue'}</span>
                  <span className="font-bold">({selectedIssue.upvotes})</span>
                </button>
                <div className="flex items-center gap-3">
                  {selectedIssue.aiPowered && <span>🤖 {selectedIssue.modelUsed}</span>}
                  <span>Created {new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
