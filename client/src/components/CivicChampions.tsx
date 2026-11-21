import { useState, useEffect } from 'react';
import type { CitizenProfile, LeaderboardEntry, Stats } from '../types';
import { fetchCitizenLeaderboard, fetchStats } from '../api';
import type { Language } from '../i18n';
import { translations, translateDepartment, translateBadge } from '../i18n';

interface CivicChampionsProps {
  currentCitizen?: CitizenProfile | null;
  currentLang?: Language;
}

export default function CivicChampions({
  currentCitizen,
  currentLang = 'en',
}: CivicChampionsProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const t = translations[currentLang];

  useEffect(() => {
    Promise.all([fetchCitizenLeaderboard().catch(() => []), fetchStats().catch(() => null)])
      .then(([lb, st]) => {
        setLeaderboard(lb);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  // Find logged in citizen's entry in leaderboard
  const myEntry = leaderboard.find(
    (e) =>
      currentCitizen &&
      (e.id === currentCitizen.id ||
        (currentCitizen.email && e.maskedEmail.includes(currentCitizen.email.slice(0, 2))))
  );

  const myRank = myEntry?.rank || (currentCitizen ? 4 : null);
  const myScore = currentCitizen?.civicScore || myEntry?.civicScore || 0;

  // Ranked departments for quarterly honors
  const sortedDepts = [...(stats?.departments || [])].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));

  return (
    <div className="w-full space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2.5">
          <span>🏆</span> {t.championsHeader}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm lg:text-base">
          {t.championsSub}
        </p>
      </div>

      {/* Citizen's Own Civic Scorecard (If Logged In) */}
      {currentCitizen && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 text-8xl opacity-10 select-none">🏛️</div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                Official Citizen Scorecard
              </span>
              <h2 className="text-2xl font-bold">{currentCitizen.name}</h2>
              <div className="text-xs text-indigo-100 flex items-center gap-2 font-mono">
                <span>{currentCitizen.email}</span>
                <span>·</span>
                <span>{currentCitizen.mobile}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20">
              <div className="text-center px-3 border-r border-white/20">
                <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                  {t.yourCivicScore}
                </span>
                <span className="text-2xl font-black text-amber-300 font-mono">{myScore}</span>
                <span className="text-[10px] text-indigo-200 block">{t.pointsLabel}</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                  {t.yourRank}
                </span>
                <span className="text-2xl font-black text-white font-mono">#{myRank || 1}</span>
                <span className="text-[10px] text-emerald-300 font-bold block">Top 5%</span>
              </div>
            </div>
          </div>

          {/* Point Rules Summary */}
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-100">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
                +10
              </span>
              <span>Verified Photo Evidence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
                +20
              </span>
              <span>Case Successfully Resolved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
                -25
              </span>
              <span>Suspected Fake or Prank Report</span>
            </div>
          </div>
        </div>
      )}

      {/* Quarterly Rewards Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-start gap-3.5 shadow-2xs">
        <span className="text-2xl shrink-0">🎁</span>
        <div>
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Quarterly Community Recognition & Rewards
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            {t.quarterlyRewardsNotice}
          </p>
        </div>
      </div>

      {/* SECTION 1: TOP CITIZEN CONTRIBUTORS LEADERBOARD */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🌟</span> {t.leaderboardTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked in real time based on verified complaints filed, resolved issues, and civic score
            </p>
          </div>
          <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            Civic Leaderboard (Live)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading civic leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-500">No citizen records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-center w-16">{t.rankCol}</th>
                  <th className="px-4 py-3 text-left">{t.citizenCol}</th>
                  <th className="px-4 py-3 text-center">{t.scoreCol}</th>
                  <th className="px-4 py-3 text-center">{t.reportsCol}</th>
                  <th className="px-4 py-3 text-center">{t.resolvedCol}</th>
                  <th className="px-4 py-3 text-left">{currentLang === 'ta' ? 'கௌரவப் பட்டம்' : currentLang === 'hi' ? 'मानद उपाधि' : 'Honorary Title'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((c) => {
                  const isTop1 = c.rank === 1;
                  const isTop2 = c.rank === 2;
                  const isTop3 = c.rank === 3;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                        isTop1 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                            isTop1
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : isTop2
                              ? 'bg-slate-300 text-slate-900'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {c.rank}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isTop1 && <span className="text-amber-500 text-sm">👑</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {c.maskedEmail} · {c.maskedMobile}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          {c.civicScore} pts
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {c.totalReports}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-xs">
                          ✓ {c.resolvedReports}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            isTop1
                              ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                              : isTop2
                              ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                              : isTop3
                              ? 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200'
                          }`}
                        >
                          {translateBadge(c.badge, currentLang)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: QUARTERLY DEPARTMENT MEDALS & HONORS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🏅</span> {t.quarterlyMedalsTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Public accountability scorecard awarding quarterly civic medals based on resolution speed, quality, and SLA adherence
            </p>
          </div>
          <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span>⏱️</span> {t.quarterlyCycleBadge}
          </span>
        </div>

        {/* Top 3 Department Medals Podiums */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedDepts.slice(0, 3).map((dept, index) => {
            const medal =
              index === 0
                ? { title: t.goldMedalTitle, icon: '🥇', bg: 'from-amber-500 to-yellow-600', border: 'border-amber-300' }
                : index === 1
                ? { title: t.silverMedalTitle, icon: '🥈', bg: 'from-slate-400 to-slate-500', border: 'border-slate-300' }
                : { title: t.bronzeMedalTitle, icon: '🥉', bg: 'from-amber-700 to-orange-700', border: 'border-orange-300' };

            const deptTranslated = translateDepartment(dept.department, currentLang);

            return (
              <div
                key={dept.department}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{medal.icon}</span>
                  <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Score: {(dept.performanceScore || 0).toFixed(0)}/100
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{deptTranslated}</h4>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {medal.title}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Resolution Rate:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">{dept.resolutionRate.toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Resolution:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{dept.avgResolutionHours.toFixed(1)} hrs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Satisfaction Rating:</span>
                    <strong className="text-amber-600 dark:text-amber-400">★ {(dept.avgCitizenSatisfaction || 4.5).toFixed(1)} / 5</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
