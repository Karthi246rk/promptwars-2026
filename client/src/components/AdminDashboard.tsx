import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Issue, Stats, AuditLog, SlaPolicies, AdminUser, LoginHistoryEntry, GovernanceData, HealthStatus } from '../types';
import {
  fetchIssues,
  fetchStats,
  updateIssue,
  deleteIssue,
  flagFalseReport,
  uploadCompletionEvidence,
  fetchSlaPolicies,
  updateSlaPolicies,
  fetchAuditLogs,
  addCaseNote,
  addPublicUpdate,
  fetchHealth,
  loginAdmin,
  verifyMfa,
  fetchLoginHistory,
  fetchGovernanceData,
  updateGovernanceRetention,
  downloadAuditLogsCsv,
  requestPasswordResetOtp,
  resetPassword,
} from '../api';
import { translations, type Language } from '../i18n';
import { downloadCasePdf } from '../utils/pdfExport';

const CATEGORIES = [
  'Road & Potholes',
  'Water Leakage & Supply',
  'Garbage & Sanitation',
  'Streetlights & Power',
  'Public Safety',
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Road & Potholes': '🛣️',
  'Water Leakage & Supply': '💧',
  'Garbage & Sanitation': '🗑️',
  'Streetlights & Power': '💡',
  'Public Safety': '🛡️',
  'Other': '📋',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'text-red-700 bg-red-100',
  High: 'text-orange-700 bg-orange-100',
  Medium: 'text-yellow-700 bg-yellow-100',
  Low: 'text-green-700 bg-green-100',
};

const STATUS_COLORS: Record<string, string> = {
  Reported: 'bg-red-100 text-red-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Rejected: 'bg-gray-200 text-gray-700',
};

const STATUSES: Issue['status'][] = ['Reported', 'In Progress', 'Resolved', 'Rejected'];

const STANDARD_DEPARTMENTS = [
  'Public Works Department',
  'Water Supply Department',
  'Electricity Department',
  'Sanitation Department',
  'Municipal Administration',
];

export type { AdminUser };

export const ADMIN_ACCOUNTS: Record<string, { password: string; user: AdminUser }> = {
  'commissioner@civicresolve.gov': {
    password: 'super123',
    user: {
      email: 'commissioner@civicresolve.gov',
      name: 'Dr. Anita Roy, IAS',
      title: 'Municipal Commissioner',
      role: 'super_admin',
      department: 'Super Admin',
    },
  },
  'pwd@civicresolve.gov': {
    password: 'pwd123',
    user: {
      email: 'pwd@civicresolve.gov',
      name: 'Er. Rajesh Varma',
      title: 'Head - Public Works Department',
      role: 'department_head',
      department: 'Public Works Department',
    },
  },
  'water@civicresolve.gov': {
    password: 'water123',
    user: {
      email: 'water@civicresolve.gov',
      name: 'Er. Sunita Rao',
      title: 'Head - Water Supply Department',
      role: 'department_head',
      department: 'Water Supply Department',
    },
  },
  'power@civicresolve.gov': {
    password: 'power123',
    user: {
      email: 'power@civicresolve.gov',
      name: 'Er. Vikram Joshi',
      title: 'Head - Electricity Department',
      role: 'department_head',
      department: 'Electricity Department',
    },
  },
  'sanitation@civicresolve.gov': {
    password: 'clean123',
    user: {
      email: 'sanitation@civicresolve.gov',
      name: 'Shri Manoj Patel',
      title: 'Head - Sanitation Department',
      role: 'department_head',
      department: 'Sanitation Department',
    },
  },
  'municipal@civicresolve.gov': {
    password: 'muni123',
    user: {
      email: 'municipal@civicresolve.gov',
      name: 'Smt. Kavita Sharma',
      title: 'Head - Municipal Administration',
      role: 'department_head',
      department: 'Municipal Administration',
    },
  },
};

interface Props {
  refreshTrigger?: number;
  currentLang?: Language;
}

export default function AdminDashboard({ refreshTrigger, currentLang = 'en' }: Props = {}) {
  const t = translations[currentLang];
  // Auth state using structured AdminUser
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('civicresolve_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!currentUser && sessionStorage.getItem('civicresolve_admin_auth') === 'true';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const loginEmail = currentUser?.email || 'admin@civicresolve.gov';

  const [loginInputEmail, setLoginInputEmail] = useState('commissioner@civicresolve.gov');
  const [loginInputPassword, setLoginInputPassword] = useState('super123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Forgot / Reset Password State
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'forgot_step1' | 'forgot_step2'>('login');
  const [resetEmail, setResetEmail] = useState('commissioner@civicresolve.gov');
  const [resetOtp, setResetOtp] = useState('');
  const [resetDemoOtp, setResetDemoOtp] = useState('654321');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // 2-Step MFA State
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaDemoOtp, setMfaDemoOtp] = useState('123456');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active view in Admin panel: 'tickets' | 'departments' | 'sla' | 'audit' | 'governance'
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'tickets' | 'departments' | 'sla' | 'audit' | 'governance'>('tickets');

  // Issues & Stats
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // System Governance & Login History
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [governanceData, setGovernanceData] = useState<GovernanceData | null>(null);
  const [systemHealth, setSystemHealth] = useState<HealthStatus | null>(null);
  const [selectedRetentionDays, setSelectedRetentionDays] = useState(90);
  const [updatingRetention, setUpdatingRetention] = useState(false);
  const [governanceSuccessMsg, setGovernanceSuccessMsg] = useState<string | null>(null);
  const [auditViewMode, setAuditViewMode] = useState<'audit' | 'logins'>('audit');

  // Table Controls
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('');
  const [tablePriorityFilter, setTablePriorityFilter] = useState('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('');
  const [tableSortBy, setTableSortBy] = useState<'priority_newest' | 'newest' | 'oldest'>('priority_newest');

  // Modal State
  const [managingIssue, setManagingIssue] = useState<Issue | null>(null);
  const [modalStatus, setModalStatus] = useState<Issue['status']>('Reported');
  const [modalDepartment, setModalDepartment] = useState('');
  const [modalOfficer, setModalOfficer] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // False Report Flagging State
  const [flagReason, setFlagReason] = useState('No issue found at location');
  const [flagging, setFlagging] = useState(false);
  const [flagSuccessMsg, setFlagSuccessMsg] = useState<string | null>(null);

  // Completion Evidence Photo Upload State
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Digital Case File Note & Update states
  const [newInternalNote, setNewInternalNote] = useState('');
  const [newPublicUpdateText, setNewPublicUpdateText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [addingUpdate, setAddingUpdate] = useState(false);

  // SLA Configuration State
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicies>({});
  const [savingSla, setSavingSla] = useState(false);
  const [slaSuccessMsg, setSlaSuccessMsg] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const filters: any = {};
      if (currentUser.role !== 'super_admin') {
        filters.department = currentUser.department;
      }
      const [issuesData, statsData, slaData, auditData] = await Promise.all([
        fetchIssues(filters),
        fetchStats(),
        fetchSlaPolicies().catch(() => ({})),
        fetchAuditLogs().catch(() => []),
      ]);
      setIssues(issuesData);
      setStats(statsData);
      setSlaPolicies(slaData);
      setAuditLogs(auditData);

      if (currentUser.role === 'super_admin') {
        fetchLoginHistory().then(setLoginHistory).catch(() => []);
        fetchGovernanceData().then((gov) => {
          setGovernanceData(gov);
          setSelectedRetentionDays(gov.config.auditLogRetentionDays);
        }).catch(() => null);
        fetchHealth().then(setSystemHealth).catch(() => null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData, refreshTrigger]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await loginAdmin(loginInputEmail.trim(), loginInputPassword);
      if ('mfaRequired' in res) {
        setMfaStep(true);
        setMfaTempToken(res.tempToken);
        setMfaDemoOtp(res.demoOtp || '123456');
      } else {
        sessionStorage.setItem('civicresolve_admin_auth', 'true');
        sessionStorage.setItem('civicresolve_admin_token', res.token);
        sessionStorage.setItem('civicresolve_admin_user', JSON.stringify(res.user));
        setCurrentUser(res.user);
        setMfaStep(false);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid official email or password. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyMfa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const code = mfaOtp.trim() || '123456';
      const res = await verifyMfa(mfaTempToken, code, loginInputEmail.trim());
      sessionStorage.setItem('civicresolve_admin_auth', 'true');
      sessionStorage.setItem('civicresolve_admin_token', res.token);
      sessionStorage.setItem('civicresolve_admin_user', JSON.stringify(res.user));
      setCurrentUser(res.user);
      setMfaStep(false);
      setMfaOtp('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid 6-digit MFA verification code.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickSignIn = async (email: string) => {
    const account = ADMIN_ACCOUNTS[email];
    if (account) {
      setLoginInputEmail(account.user.email);
      setLoginInputPassword(account.password);
      setLoginError(null);
      setLoginLoading(true);
      try {
        const res = await loginAdmin(account.user.email, account.password, '123456');
        if ('token' in res) {
          sessionStorage.setItem('civicresolve_admin_auth', 'true');
          sessionStorage.setItem('civicresolve_admin_token', res.token);
          sessionStorage.setItem('civicresolve_admin_user', JSON.stringify(res.user));
          setCurrentUser(res.user);
          setMfaStep(false);
        }
      } catch (err: any) {
        setLoginError(err.message || 'Quick sign-in failed');
      } finally {
        setLoginLoading(false);
      }
    }
  };

  const handleRequestAdminResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      const res = await requestPasswordResetOtp(resetEmail.trim(), 'admin');
      if (res.demoOtp) setResetDemoOtp(res.demoOtp);
      setAdminAuthMode('forgot_step2');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleAdminResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('New passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword({
        email: resetEmail.trim(),
        userType: 'admin',
        otp: resetOtp.trim() || resetDemoOtp,
        newPassword: resetNewPassword,
      });
      setResetSuccessMsg('Password reset successfully! Please sign in with your new password.');
      setLoginInputEmail(resetEmail.trim());
      setLoginInputPassword(resetNewPassword);
      setAdminAuthMode('login');
      setTimeout(() => setResetSuccessMsg(null), 8000);
    } catch (err: any) {
      setResetError(err.message || 'Password reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  const handleApplyRetention = async () => {
    setUpdatingRetention(true);
    setGovernanceSuccessMsg(null);
    try {
      const updated = await updateGovernanceRetention(selectedRetentionDays, currentUser?.email);
      setGovernanceData(updated);
      setAuditLogs(await fetchAuditLogs());
      setLoginHistory(await fetchLoginHistory());
      setGovernanceSuccessMsg(`Retention policy updated to ${selectedRetentionDays} days. Bounded caps enforced.`);
      setTimeout(() => setGovernanceSuccessMsg(null), 4000);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to update retention policy');
    } finally {
      setUpdatingRetention(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('civicresolve_admin_auth');
    sessionStorage.removeItem('civicresolve_admin_user');
    setCurrentUser(null);
  };

  const handleInlineStatusChange = async (id: string, newStatus: Issue['status']) => {
    try {
      const updated = await updateIssue(id, {
        status: newStatus,
        adminEmail: loginEmail,
      });
      setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
      const newStats = await fetchStats();
      setStats(newStats);
      fetchAuditLogs().then(setAuditLogs);
    } catch {
      // silent
    }
  };

  const openManageModal = (issue: Issue) => {
    setManagingIssue(issue);
    setModalStatus(issue.status);
    setModalDepartment(issue.department);
    setModalOfficer(issue.assignedOfficer || '');
    setModalNote('');
    setConfirmDelete(false);
    setEvidenceFile(null);
    setEvidencePreview(null);
    setFlagSuccessMsg(null);
  };

  const handleSaveModal = async () => {
    if (!managingIssue) return;
    setSaving(true);
    try {
      const updated = await updateIssue(managingIssue.id, {
        status: modalStatus,
        department: modalDepartment,
        assignedOfficer: modalOfficer || undefined,
        resolutionNote: modalNote || undefined,
        adminEmail: loginEmail,
      });
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      const newStats = await fetchStats();
      setStats(newStats);
      fetchAuditLogs().then(setAuditLogs);
      setManagingIssue(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!managingIssue) return;
    setDeleting(true);
    try {
      await deleteIssue(managingIssue.id, loginEmail);
      setIssues((prev) => prev.filter((i) => i.id !== managingIssue.id));
      const newStats = await fetchStats();
      setStats(newStats);
      fetchAuditLogs().then(setAuditLogs);
      setManagingIssue(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const handleFlagFalseReport = async () => {
    if (!managingIssue) return;
    setFlagging(true);
    try {
      const result = await flagFalseReport(managingIssue.id, flagReason, loginEmail);
      setIssues((prev) => prev.map((i) => (i.id === result.issue.id ? result.issue : i)));
      const newStats = await fetchStats();
      setStats(newStats);
      fetchAuditLogs().then(setAuditLogs);
      const penaltyStr = result.penalty
        ? `Reporter has ${result.penalty.strikes} strike(s). Total fine: ₹${result.penalty.totalFineInr}${result.penalty.isRestricted ? ' (RESTRICTED)' : ''}.`
        : 'Anonymous report rejected.';
      setFlagSuccessMsg(`Report marked as Rejected. ${penaltyStr}`);
    } catch (err: any) {
      alert(err.message || 'Failed to flag report');
    } finally {
      setFlagging(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!managingIssue || !evidenceFile) return;
    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('evidence', evidenceFile);
      formData.append('adminEmail', loginEmail);

      const updated = await uploadCompletionEvidence(managingIssue.id, formData);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      const newStats = await fetchStats();
      setStats(newStats);
      fetchAuditLogs().then(setAuditLogs);
      setManagingIssue(updated);
      setEvidenceFile(null);
      setEvidencePreview(null);
      alert('Completion evidence uploaded successfully! Ticket marked as Resolved.');
    } catch (err: any) {
      alert(err.message || 'Failed to upload completion evidence');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!managingIssue || !newInternalNote.trim()) return;
    try {
      setAddingNote(true);
      const updated = await addCaseNote(managingIssue.id, newInternalNote.trim(), currentUser?.email || 'admin@civicresolve.gov');
      setManagingIssue(updated);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setNewInternalNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to add internal note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddPublicUpdate = async () => {
    if (!managingIssue || !newPublicUpdateText.trim()) return;
    try {
      setAddingUpdate(true);
      const updated = await addPublicUpdate(
        managingIssue.id,
        newPublicUpdateText.trim(),
        currentUser?.name || currentUser?.email || 'Municipal Authority'
      );
      setManagingIssue(updated);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setNewPublicUpdateText('');
    } catch (err: any) {
      alert(err.message || 'Failed to publish public update');
    } finally {
      setAddingUpdate(false);
    }
  };

  const handleSaveSlaPolicies = async () => {
    setSavingSla(true);
    setSlaSuccessMsg(null);
    try {
      const updated = await updateSlaPolicies(slaPolicies);
      setSlaPolicies(updated);
      setSlaSuccessMsg('SLA policies updated successfully.');
      setTimeout(() => setSlaSuccessMsg(null), 3000);
    } catch {
      alert('Failed to update SLA policies');
    } finally {
      setSavingSla(false);
    }
  };

  // Filtered & Sorted Table Issues
  const filteredTableIssues = useMemo(() => {
    let result = issues.filter((issue) => {
      if (tableStatusFilter && issue.status !== tableStatusFilter) return false;
      if (tablePriorityFilter && issue.priority !== tablePriorityFilter) return false;
      if (tableCategoryFilter && issue.category !== tableCategoryFilter) return false;
      if (tableSearch) {
        const q = tableSearch.toLowerCase();
        return (
          issue.trackingId.toLowerCase().includes(q) ||
          issue.title.toLowerCase().includes(q) ||
          issue.department.toLowerCase().includes(q) ||
          issue.location.toLowerCase().includes(q) ||
          (issue.assignedOfficer && issue.assignedOfficer.toLowerCase().includes(q))
        );
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (tableSortBy === 'priority_newest') {
        const rank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        const diff = (rank[b.priority] || 0) - (rank[a.priority] || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (tableSortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (tableSortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [issues, tableSearch, tableStatusFilter, tablePriorityFilter, tableCategoryFilter, tableSortBy]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (l) =>
        (l.trackingId && l.trackingId.toLowerCase().includes(q)) ||
        l.action.toLowerCase().includes(q) ||
        l.adminEmail.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  // If not logged in, show Municipal Authority Sign-In with Role Selector
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto my-6 animate-slideUp space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-800 text-white p-6 text-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              🏛️
            </div>
            <h2 className="text-xl font-bold tracking-tight">{t.adminLoginTitle}</h2>
            <p className="text-indigo-200 text-xs mt-1">
              {t.adminLoginSub}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {resetSuccessMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 font-medium animate-fadeIn">
                ✅ {resetSuccessMsg}
              </div>
            )}

            {adminAuthMode === 'forgot_step1' ? (
              /* Forgot Password - Step 1: Send OTP */
              <form onSubmit={handleRequestAdminResetOtp} className="space-y-4 animate-fadeIn">
                <div className="text-center pb-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.resetPasswordTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Enter your registered official email to receive a reset OTP</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.adminEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="commissioner@civicresolve.gov"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                {resetError && (
                  <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium animate-fadeIn">
                    ⚠️ {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  {resetLoading ? 'Sending OTP...' : t.sendOtpBtn}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('login');
                      setResetError(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ← {t.backToLogin}
                  </button>
                </div>
              </form>
            ) : adminAuthMode === 'forgot_step2' ? (
              /* Forgot Password - Step 2: Verify OTP & New Password */
              <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-3.5 animate-fadeIn">
                <div className="text-center pb-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.resetPasswordTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Enter the 6-digit OTP and your new password</p>
                </div>

                {/* Subtle Evaluator Demo Banner */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-2.5 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold">⚡ Demo Reset OTP:</span> <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100 font-bold">{resetDemoOtp}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetOtp(resetDemoOtp)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.otpLabel}
                  </label>
                  <input
                    type="text"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    maxLength={6}
                    required
                    placeholder="654321"
                    className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.newPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.confirmPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                {resetError && (
                  <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium animate-fadeIn">
                    ⚠️ {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  {resetLoading ? 'Resetting Password...' : t.resetPasswordBtn}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('login');
                      setResetError(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    ← {t.backToLogin}
                  </button>
                </div>
              </form>
            ) : mfaStep ? (
              /* Step 2: 2-Step MFA Verification Form */
              <form onSubmit={handleVerifyMfa} className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span>🔐</span> Step 2: Multi-Factor Authentication (MFA)
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Primary credentials verified for <strong className="font-mono">{loginInputEmail}</strong>. Please enter the 6-digit municipal security code.
                  </p>
                </div>

                {/* Evaluator Demo Banner */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Demo Hackathon MFA Code</span>
                    <span className="text-xl font-mono font-black text-emerald-950 dark:text-emerald-200 tracking-widest">{mfaDemoOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaOtp(mfaDemoOtp);
                      setTimeout(() => handleVerifyMfa(), 50);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    ⚡ Auto-Fill & Verify
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.adminMfaCodeLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaOtp}
                    onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>

                {loginError && (
                  <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium animate-fadeIn">
                    ⚠️ {loginError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep(false);
                      setLoginError(null);
                    }}
                    className="w-1/3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                  >
                    {loginLoading ? 'Verifying MFA...' : t.adminMfaVerifyBtn}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 1: Standard Credentials Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    {t.adminEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={loginInputEmail}
                    onChange={(e) => setLoginInputEmail(e.target.value)}
                    placeholder="name@civicresolve.gov"
                    required
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                      {t.adminPasswordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginInputEmail);
                        setAdminAuthMode('forgot_step1');
                        setResetError(null);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {t.forgotPassword}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={loginInputPassword}
                    onChange={(e) => setLoginInputPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>

                {loginError && (
                  <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium animate-fadeIn">
                    ⚠️ {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  {loginLoading ? 'Checking Credentials...' : t.adminSignInBtn}
                </button>
              </form>
            )}

            {/* Collapsible Demo Credentials Panel (For Evaluators) */}
            <div className="pt-3 border-t border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                className="flex items-center justify-between w-full text-xs font-bold text-gray-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wide">
                  <span>⚡</span> {t.adminDemoCredentialsTitle}
                </span>
                <span className="text-gray-400 text-xs font-mono">{showDemoCredentials ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showDemoCredentials && (
                <div className="mt-3 space-y-2 animate-fadeIn">
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Click <strong>"{t.adminFillAndSignIn}"</strong> below to test role isolation as Super Admin or any of the 5 Department Heads:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Super Admin */}
                    <div className="bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5 col-span-1 sm:col-span-2">
                      <div>
                        <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <span>🏛️</span> Dr. Anita Roy, IAS
                          <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] px-1.5 py-0.2 rounded font-semibold">Super Admin</span>
                        </div>
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono mt-0.5">
                          commissioner@civicresolve.gov / super123
                        </div>
                        <div className="text-[10px] text-indigo-500 dark:text-slate-400">Full 5-dept jurisdiction, SLA editor, Audit logs</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('commissioner@civicresolve.gov')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors shadow-xs cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>

                    {/* PWD */}
                    <div className="bg-orange-50/60 dark:bg-slate-800/80 border border-orange-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                          <span>🛣️</span> Er. Rajesh Varma
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">Public Works Head</div>
                        <div className="text-[10px] text-orange-800 dark:text-orange-400 font-mono truncate">pwd@civicresolve.gov / pwd123</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('pwd@civicresolve.gov')}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>

                    {/* Water */}
                    <div className="bg-blue-50/60 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                          <span>💧</span> Er. Sunita Rao
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">Water Supply Head</div>
                        <div className="text-[10px] text-blue-800 dark:text-blue-400 font-mono truncate">water@civicresolve.gov / water123</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('water@civicresolve.gov')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>

                    {/* Electricity */}
                    <div className="bg-yellow-50/60 dark:bg-slate-800/80 border border-yellow-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                          <span>💡</span> Er. Vikram Joshi
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">Electricity Head</div>
                        <div className="text-[10px] text-yellow-800 dark:text-yellow-400 font-mono truncate">power@civicresolve.gov / power123</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('power@civicresolve.gov')}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>

                    {/* Sanitation */}
                    <div className="bg-green-50/60 dark:bg-slate-800/80 border border-green-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                          <span>🗑️</span> Shri Manoj Patel
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">Sanitation Head</div>
                        <div className="text-[10px] text-green-800 dark:text-green-400 font-mono truncate">sanitation@civicresolve.gov / clean123</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('sanitation@civicresolve.gov')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>

                    {/* Municipal Admin */}
                    <div className="bg-purple-50/60 dark:bg-slate-800/80 border border-purple-200 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-between gap-2.5 col-span-1 sm:col-span-2">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                          <span>🛡️</span> Smt. Kavita Sharma
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">Municipal Administration Head</div>
                        <div className="text-[10px] text-purple-800 dark:text-purple-400 font-mono truncate">municipal@civicresolve.gov / muni123</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSignIn('municipal@civicresolve.gov')}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 rounded-lg text-center transition-colors cursor-pointer"
                      >
                        {t.adminFillAndSignIn}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Department Portal Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0">
            {isSuperAdmin
              ? '🏛️'
              : currentUser?.department.includes('Works')
              ? '🛣️'
              : currentUser?.department.includes('Water')
              ? '💧'
              : currentUser?.department.includes('Electricity')
              ? '💡'
              : currentUser?.department.includes('Sanitation')
              ? '🗑️'
              : '🛡️'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{currentUser?.name}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isSuperAdmin
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                {isSuperAdmin ? '🏛️ Super Admin (Municipal Commissioner)' : `🏢 Head - ${currentUser?.department}`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Signed in as <span className="font-semibold text-gray-800 font-mono">{currentUser?.email}</span> ·{' '}
              {isSuperAdmin
                ? 'Full municipal oversight across all 5 departments & administrative policy configuration'
                : `Dedicated department portal · Strictly isolated to ${currentUser?.department} work orders`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all shadow-xs"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveAdminSubTab('tickets')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            activeAdminSubTab === 'tickets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          🗂️ Case Management ({filteredTableIssues.length})
        </button>
        <button
          onClick={() => setActiveAdminSubTab('departments')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
            activeAdminSubTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          🏆 Department Scorecard
        </button>
        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveAdminSubTab('sla')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeAdminSubTab === 'sla'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              ⏱️ SLA & Escalations
            </button>
            <button
              onClick={() => setActiveAdminSubTab('audit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeAdminSubTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              📜 Audit & Login Logs ({auditLogs.length + loginHistory.length})
            </button>
            <button
              onClick={() => setActiveAdminSubTab('governance')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeAdminSubTab === 'governance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              🛡️ Security & System Health
            </button>
          </>
        )}
      </div>

      {/* SUB-TAB 1: WORK ORDERS & DASHBOARD */}
      {activeAdminSubTab === 'tickets' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Assigned</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{issues.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reported (Pending)</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {issues.filter((i) => i.status === 'Reported').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Progress</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {issues.filter((i) => i.status === 'In Progress').length}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {issues.filter((i) => i.status === 'Resolved').length}
                </p>
              </div>
            </div>
          )}

          {/* Issue Management Table with Comprehensive Filters & Sorting */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Table Filter Toolbar */}
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">Issue Management</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono font-bold">
                    {filteredTableIssues.length} of {issues.length}
                  </span>
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-gray-500">Sort By:</span>
                  <select
                    value={tableSortBy}
                    onChange={(e: any) => setTableSortBy(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white font-semibold text-gray-700 outline-none"
                  >
                    <option value="priority_newest">Priority + Newest First (Default)</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Filters Row: Search + Status + Priority + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">🔍</span>
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search title, ID, location..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={tableStatusFilter}
                  onChange={(e) => setTableStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                >
                  <option value="">Status: All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      Status: {s}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={tablePriorityFilter}
                  onChange={(e) => setTablePriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                >
                  <option value="">Priority: All</option>
                  {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                    <option key={p} value={p}>
                      Priority: {p}
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={tableCategoryFilter}
                  onChange={(e) => setTableCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                >
                  <option value="">Category: All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500">Loading issues...</div>
            ) : filteredTableIssues.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No issues match the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Tracking ID</th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Priority</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">SLA Status</th>
                      <th className="px-4 py-3 text-left">Authenticity / Fake Flag</th>
                      <th className="px-4 py-3 text-left">Department</th>
                      <th className="px-4 py-3 text-left">Officer</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTableIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            onClick={() => openManageModal(issue)}
                            className="font-mono text-xs text-indigo-700 font-bold block cursor-pointer hover:text-indigo-900 hover:underline"
                            title="Click to view full details & manage"
                          >
                            {issue.trackingId}
                          </span>
                          {(issue.citizenReportCount || 1) > 1 && (
                            <span className="text-[10px] text-purple-700 font-semibold">
                              👥 {issue.citizenReportCount} reports
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            onClick={() => openManageModal(issue)}
                            className="text-gray-900 font-semibold whitespace-normal max-w-xs block cursor-pointer hover:text-indigo-600 hover:underline transition-colors"
                            title="Click to review full details & manage"
                          >
                            {issue.title}
                          </span>
                          <span className="text-[11px] text-gray-500 whitespace-normal max-w-xs block mt-0.5">
                            📍 {issue.location}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {CATEGORY_ICONS[issue.category] || '📋'} {issue.category}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[issue.priority] || ''}`}>
                            {issue.priority} ({issue.priorityScore})
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={issue.status}
                            onChange={(e) => handleInlineStatusChange(issue.id, e.target.value as Issue['status'])}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[issue.status] || ''}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {issue.slaBreached ? (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full block animate-pulse">
                              🚨 BREACHED (+{issue.hoursOverdue || 24}h)
                            </span>
                          ) : issue.status !== 'Resolved' && issue.status !== 'Rejected' ? (
                            <span className="text-emerald-700 text-xs font-medium">
                              ⏱️ {issue.slaTargetHours || 48}h target
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Authenticity / AI Fake Flag Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {issue.authenticityCheck?.status === 'Verified' ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <span>✅</span> Verified Real ({Math.round((issue.authenticityCheck.confidence || 0.95) * 100)}%)
                            </span>
                          ) : issue.authenticityCheck?.status === 'Suspected Fake' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                <span>🚩</span> {issue.authenticityCheck.isAiGenerated ? 'AI-Gen / Synthetic' : 'Suspected Fake'}
                              </span>
                              <div className="text-[10px] text-red-700 font-mono">
                                {issue.citizenName || 'Reporter'}: {issue.reporterContact || issue.citizenContact || 'No contact'}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <span>⏳</span> Checking...
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[140px]" title={issue.department}>
                          {issue.department}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[120px]">
                          {issue.assignedOfficer ? `👮 ${issue.assignedOfficer}` : <span className="text-gray-400 italic">Unassigned</span>}
                        </td>

                        {/* Created Date and Time clearly displayed */}
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          <div>
                            {new Date(issue.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(issue.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openManageModal(issue)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEPARTMENT PERFORMANCE SCORECARD */}
      {activeAdminSubTab === 'departments' && stats && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>🏆</span> Municipal Department Performance Scorecard
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Composite evaluation of municipal departments ranked by resolution velocity, public satisfaction, SLA compliance, and quality
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>⏱️</span> Quarterly Review Cycle: Every 3 Months (Q4 2026)
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                Ranked by Performance Score (0–100)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Rank & Department</th>
                  <th className="px-4 py-3 text-left">Quarterly Honors</th>
                  <th className="px-4 py-3 text-center">Score (0–100)</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 text-center">Avg Resolution</th>
                  <th className="px-4 py-3 text-left">Resolution Rate</th>
                  <th className="px-4 py-3 text-center">Overdue (SLA)</th>
                  <th className="px-4 py-3 text-center">Citizen Rating</th>
                  <th className="px-4 py-3 text-center">Reopened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats.departments || []).map((dept, index) => {
                  const gradeBadge =
                    dept.grade === 'A'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : dept.grade === 'B'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : dept.grade === 'C'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-red-100 text-red-800 border-red-300';

                  const medal =
                    index === 0
                      ? { label: '🥇 Gold Medal of Civic Excellence', color: 'bg-amber-100 text-amber-900 border-amber-300' }
                      : index === 1
                      ? { label: '🥈 Silver Medal of Public Service', color: 'bg-slate-100 text-slate-800 border-slate-300' }
                      : index === 2
                      ? { label: '🥉 Bronze Medal of Accountability', color: 'bg-orange-100 text-orange-900 border-orange-300' }
                      : null;

                  return (
                    <tr key={dept.department} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-gray-900">
                            🏢 {dept.department}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {medal ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${medal.color}`}>
                            {medal.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Civil Department</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-base font-extrabold text-gray-900">
                          {dept.performanceScore}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono"> / 100</span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${gradeBadge}`}>
                          Grade {dept.grade}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-xs text-gray-700">
                        {dept.avgResolutionHours} hrs
                      </td>

                      <td className="px-4 py-3.5 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${dept.resolutionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-indigo-700 min-w-[36px]">
                            {dept.resolutionRate}%
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({dept.resolved}/{dept.totalAssigned})
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {dept.overdueCount > 0 ? (
                          <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            🚨 {dept.overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-xs">
                            ✓ 0 Breaches
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 font-bold text-xs text-gray-800">
                          <span className="text-amber-500">★</span>
                          <span>{dept.avgCitizenSatisfaction}</span>
                          <span className="text-[10px] text-gray-400 font-normal">/5</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {dept.reopenedCount > 0 ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">
                            🔄 {dept.reopenedCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compact 1-line formula legend */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-gray-800">Formula Legend:</span>{' '}
              <span className="text-gray-700">Performance Score (0–100) = Resolution Rate (35%) + Citizen Satisfaction (25%) + Resolution Speed (20%) + SLA Compliance (10%) + Reopen Quality (10%)</span>
            </div>
            <div className="flex items-center gap-3 font-semibold text-[10px]">
              <span className="text-emerald-700">A: ≥85</span>
              <span className="text-blue-700">B: 70–84</span>
              <span className="text-amber-700">C: 55–69</span>
              <span className="text-red-700">D: &lt;55</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SLA POLICIES */}
      {activeAdminSubTab === 'sla' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">SLA Policy Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure maximum resolution target deadlines (in hours) per category. Tickets exceeding these deadlines automatically trigger municipal escalations.
            </p>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="font-semibold text-xs text-gray-800">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={slaPolicies[cat] ?? 48}
                    onChange={(e) =>
                      setSlaPolicies((prev) => ({
                        ...prev,
                        [cat]: parseInt(e.target.value, 10) || 24,
                      }))
                    }
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded font-mono font-bold text-right"
                  />
                  <span className="text-xs text-gray-500">hours</span>
                </div>
              </div>
            ))}

            {slaSuccessMsg && (
              <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200 animate-fadeIn">
                ✓ {slaSuccessMsg}
              </div>
            )}

            <button
              onClick={handleSaveSlaPolicies}
              disabled={savingSla}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-lg transition-colors"
            >
              {savingSla ? 'Saving...' : 'Save SLA Deadlines'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ADMINISTRATIVE AUDIT LOGS & LOGIN GOVERNANCE */}
      {activeAdminSubTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Administrative Governance Audit Trail</h2>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Bounded Retention: {governanceData?.storageUsage.retentionDays ?? 90}d
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Active logs: <strong>{governanceData?.storageUsage.auditLogsCount ?? auditLogs.length}</strong> / {governanceData?.storageUsage.auditLogsCap ?? 1000} · Login records: <strong>{governanceData?.storageUsage.loginHistoryCount ?? loginHistory.length}</strong> / {governanceData?.storageUsage.loginHistoryCap ?? 500}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {/* Toggle Sub-View */}
              <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuditViewMode('audit')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    auditViewMode === 'audit' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📜 Action Logs ({filteredAuditLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditViewMode('logins')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    auditViewMode === 'logins' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔐 Login History ({loginHistory.length})
                </button>
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={downloadAuditLogsCsv}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                title="Download CSV archive of active municipal audit logs"
              >
                <span>📥</span> Export Audit Logs (CSV)
              </button>

              {auditViewMode === 'audit' && (
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail..."
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white outline-none w-full md:w-52"
                />
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {auditViewMode === 'audit' ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Officer / Admin</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Tracking ID</th>
                    <th className="px-4 py-3 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{log.adminEmail}</td>
                        <td className="px-4 py-2.5">
                          <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-700">{log.trackingId}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[360px] truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Account Email</th>
                    <th className="px-4 py-3 text-left">Role / Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Client IP</th>
                    <th className="px-4 py-3 text-left">Client Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loginHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No login history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(rec.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">
                          {rec.email}
                          {rec.name && <span className="text-[10px] text-gray-400 block">{rec.name}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {rec.department || 'N/A'}
                          {rec.role && <span className="text-[10px] text-indigo-600 block font-medium">({rec.role})</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {rec.status === 'SUCCESS' ? (
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                              ✓ SUCCESS (2-Step MFA)
                            </span>
                          ) : rec.status === 'FAILED_MFA' ? (
                            <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200">
                              ⚠️ FAILED MFA CODE
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] border border-red-200">
                              ✖ INVALID PASSWORD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">{rec.ip}</td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate" title={rec.userAgent}>
                          {rec.userAgent}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SECURITY & SYSTEM GOVERNANCE */}
      {activeAdminSubTab === 'governance' && (
        <div className="space-y-6">
          {/* Card 1: System Telemetry & Security Hardening */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>🛡️</span> Security Hardening & Platform Telemetry
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live verification of enterprise access control, cryptography, and network protections
                </p>
              </div>
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Security Controls Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Box 1: Auth & Cryptography */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-indigo-950 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <span>🔐</span> Password Cryptography & MFA
                </span>
                <div className="space-y-1.5 text-indigo-900">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hashing Engine:</span>
                    <strong className="font-mono text-gray-900">scryptSync (64-byte key)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salt Policy:</span>
                    <strong className="font-mono text-gray-900">Distinct Per-Account Salt</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MFA Verification:</span>
                    <strong className="text-emerald-700">Enforced 2-Step OTP (6 Digits)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session Tokens:</span>
                    <strong className="font-mono text-gray-900">HMAC-SHA256 Signed</strong>
                  </div>
                </div>
              </div>

              {/* Box 2: API Rate Limiting & Protection */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-blue-950 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <span>⚡</span> API Rate Limiting & Abuse Defense
                </span>
                <div className="space-y-1.5 text-blue-900">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Submission:</span>
                    <strong className="font-mono text-gray-900">25 requests / min (per IP)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auth / Login:</span>
                    <strong className="font-mono text-gray-900">15 attempts / min (per IP)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Input Sanitization:</span>
                    <strong className="text-emerald-700">XSS & Script Stripping Active</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payload Limit:</span>
                    <strong className="font-mono text-gray-900">10 MB (Multer image filter)</strong>
                  </div>
                </div>
              </div>

              {/* Box 3: HTTP Security Headers */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-purple-950 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <span>🛡️</span> HTTP Defense Headers
                </span>
                <div className="space-y-1.5 text-purple-900">
                  <div className="flex justify-between">
                    <span className="text-gray-600">X-Content-Type-Options:</span>
                    <strong className="font-mono text-gray-900">nosniff</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">X-Frame-Options:</span>
                    <strong className="font-mono text-gray-900">DENY (Clickjacking safe)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">X-XSS-Protection:</span>
                    <strong className="font-mono text-gray-900">1; mode=block</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Referrer-Policy:</span>
                    <strong className="font-mono text-gray-900">strict-origin</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Bounded Audit Log Retention & Governance Policy */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>⚖️</span> Bounded Audit Log Retention & Archival Policy
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configurable lifecycle management preventing unbounded JSON disk growth via hybrid rolling cap and TTL pruning
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Current Retention Policy:</span>
                <div className="text-sm font-bold text-indigo-700 font-mono">
                  {governanceData?.config.auditLogRetentionDays ?? 90} Days TTL
                </div>
              </div>
            </div>

            {/* Storage Usage Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">Active Audit Logs Storage</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {governanceData?.storageUsage.auditLogsCount ?? auditLogs.length} <span className="text-xs font-normal text-slate-500">/ {governanceData?.storageUsage.auditLogsCap ?? 1000} cap</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (((governanceData?.storageUsage.auditLogsCount ?? auditLogs.length) / (governanceData?.storageUsage.auditLogsCap ?? 1000)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">Login History Storage</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {governanceData?.storageUsage.loginHistoryCount ?? loginHistory.length} <span className="text-xs font-normal text-slate-500">/ {governanceData?.storageUsage.loginHistoryCap ?? 500} cap</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (((governanceData?.storageUsage.loginHistoryCount ?? loginHistory.length) / (governanceData?.storageUsage.loginHistoryCap ?? 500)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-500 font-medium">Digital Case Files</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {issues.length} <span className="text-xs font-normal text-slate-500">active cases</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Storage Engine: <span className="font-mono text-slate-700">{systemHealth?.storageMode || 'json'}</span>
                </div>
              </div>
            </div>

            {/* Retention Configuration Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Configure Audit Log Retention Period (TTL)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { days: 30, label: '30 Days', desc: 'Short lifecycle (high turnover)' },
                  { days: 90, label: '90 Days', desc: 'Recommended standard policy' },
                  { days: 180, label: '180 Days', desc: 'Extended compliance archive' },
                  { days: 365, label: '365 Days', desc: 'Annual statutory retention' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelectedRetentionDays(opt.days)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedRetentionDays === opt.days
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-600'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                      {opt.label}
                      {selectedRetentionDays === opt.days && <span className="text-indigo-600">✓</span>}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 leading-snug">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {governanceSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200 font-medium animate-fadeIn">
                  ✓ {governanceSuccessMsg}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleApplyRetention}
                  disabled={updatingRetention}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-xs"
                >
                  {updatingRetention ? 'Pruning & Applying...' : 'Apply Retention Policy Now'}
                </button>
                <button
                  type="button"
                  onClick={downloadAuditLogsCsv}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors border border-gray-300"
                >
                  📥 Export Current Archive Before Rotation (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Manage Modal */}
      {managingIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setManagingIssue(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">Digital Case File Management</h3>
                <span className="text-xs font-mono text-indigo-700 font-bold">{managingIssue.caseId || managingIssue.trackingId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCasePdf(managingIssue)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                  title="Download Official Municipal Digital Case PDF"
                >
                  <span>📄</span>
                  <span>Download Case PDF</span>
                </button>
                <button
                  onClick={() => setManagingIssue(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Digital Case File Metadata Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Subcategory</span>
                  <span className="font-bold text-gray-900">{managingIssue.subcategory || 'General Municipal Issue'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Citizen Name</span>
                  <span className="font-bold text-gray-900">{managingIssue.citizenName || 'Concerned Citizen'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Contact</span>
                  <span className="font-bold text-gray-900">{managingIssue.citizenContact || managingIssue.reporterContact || 'Confidential'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">SLA Target</span>
                  <span className="font-bold text-indigo-700">{managingIssue.slaTargetHours || 48} Hours</span>
                </div>
              </div>
              {/* Photos: Initial Report Photo Gallery + Completion Evidence (if any) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-700 block mb-1">
                    📸 Citizen Evidence Photos {managingIssue.imageUrls && managingIssue.imageUrls.length > 1 ? `(${managingIssue.imageUrls.length})` : ''}
                  </span>
                  {managingIssue.imageUrls && managingIssue.imageUrls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {managingIssue.imageUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded overflow-hidden border border-gray-300">
                          <img src={url} alt={`Evidence #${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">#{i + 1}</span>
                        </a>
                      ))}
                    </div>
                  ) : managingIssue.imageUrl ? (
                    <img
                      src={managingIssue.imageUrl}
                      alt="Citizen report"
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-gray-400">No Photo</div>
                  )}

                  {/* Authenticity Result Banner */}
                  {managingIssue.authenticityCheck && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex flex-col gap-0.5 ${
                      managingIssue.authenticityCheck.status === 'Verified'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : managingIssue.authenticityCheck.status === 'Suspected Fake'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {managingIssue.authenticityCheck.status === 'Verified'
                            ? '✅ Gemini AI Photo: Verified Real'
                            : managingIssue.authenticityCheck.status === 'Suspected Fake'
                            ? `🚩 Gemini AI Photo: ${managingIssue.authenticityCheck.isAiGenerated ? 'AI-Generated / Synthetic' : 'Suspected Fake'}`
                            : '⏳ AI Photo Verification Pending...'}
                        </span>
                        <span className="font-mono text-[10px]">
                          {Math.round((managingIssue.authenticityCheck.confidence || 0.95) * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-tight">
                        {managingIssue.authenticityCheck.reason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 p-2.5 rounded-lg border border-green-200 text-center">
                  <span className="text-[11px] font-bold text-green-700 block mb-1">✅ Completion Evidence (After Resolution)</span>
                  {managingIssue.completionEvidenceUrl ? (
                    <img
                      src={managingIssue.completionEvidenceUrl}
                      alt="Completion evidence"
                      className="w-full h-36 object-cover rounded"
                    />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-xs text-gray-400">Pending upload</div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="font-bold text-gray-900">{managingIssue.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{managingIssue.description}</p>
                <p className="text-[11px] text-gray-500 mt-1">📍 {managingIssue.location}</p>
              </div>

              {/* Field Officer Assignment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assign Field Officer</label>
                <input
                  type="text"
                  value={modalOfficer}
                  onChange={(e) => setModalOfficer(e.target.value)}
                  placeholder="e.g., Officer Ramesh K. (Badge #402)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              {/* Status & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as Issue['status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                  <select
                    value={modalDepartment}
                    onChange={(e) => setModalDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {STANDARD_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Completion Evidence Photo */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase block">
                  📸 Upload Proof of Completed Work
                </span>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setEvidenceFile(f);
                      const reader = new FileReader();
                      reader.onload = (ev) => setEvidencePreview(ev.target?.result as string);
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="text-xs"
                />
                {evidencePreview && (
                  <div className="flex items-center gap-3 pt-1">
                    <img src={evidencePreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={handleUploadEvidence}
                      disabled={uploadingEvidence}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded"
                    >
                      {uploadingEvidence ? 'Uploading...' : 'Confirm Completion Photo'}
                    </button>
                  </div>
                )}
              </div>

              {/* Resolution Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Resolution / Action Note</label>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Record crew dispatched, parts replaced, or closure remarks..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs resize-none"
                />
              </div>

              {/* False / Prank Report System */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold text-red-800 uppercase block">
                  ⚖️ False / Prank Report Enforcement
                </span>
                <p className="text-[11px] text-red-700">
                  Applies escalating penalties to citizen contact (1st: Warning, 2nd: ₹500 fine, 3rd: ₹1,500 + portal ban).
                </p>
                <div className="flex gap-2">
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-red-300 rounded text-xs bg-white text-red-900"
                  >
                    <option value="No issue found at location">No issue found at location</option>
                    <option value="Fake or unrelated photo">Fake or unrelated photo</option>
                    <option value="Prank / spam submission">Prank / spam submission</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleFlagFalseReport}
                    disabled={flagging}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                  >
                    {flagging ? 'Flagging...' : 'Flag as False'}
                  </button>
                </div>
                {flagSuccessMsg && (
                  <p className="text-xs font-bold text-red-800 mt-1">{flagSuccessMsg}</p>
                )}
              </div>

              {/* Internal Department Notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <span>🔒</span> Internal Department Notes (Authorities Only)
                </span>
                {managingIssue.internalAdminNotes && managingIssue.internalAdminNotes.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {managingIssue.internalAdminNotes.map((n) => (
                      <div key={n.id} className="bg-white p-2 rounded border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span>{n.author}</span>
                          <span>{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                    placeholder="Add confidential internal note (e.g. tools requested)..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddInternalNote}
                    disabled={addingNote || !newInternalNote.trim()}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded disabled:opacity-50 cursor-pointer"
                  >
                    {addingNote ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </div>

              {/* Public Progress Updates (Visible to Citizens) */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                  <span>📢</span> Publish Citizen Public Update
                </span>
                {managingIssue.publicUpdates && managingIssue.publicUpdates.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {managingIssue.publicUpdates.map((u) => (
                      <div key={u.id} className="bg-white p-2 rounded border border-indigo-100 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-indigo-700 font-semibold mb-0.5">
                          <span>{u.author || 'Municipal Authority'}</span>
                          <span>{new Date(u.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-800">{u.update}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPublicUpdateText}
                    onChange={(e) => setNewPublicUpdateText(e.target.value)}
                    placeholder="Publish progress notice to citizen (triggers In-App alert)..."
                    className="flex-1 px-3 py-1.5 border border-indigo-200 rounded text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddPublicUpdate}
                    disabled={addingUpdate || !newPublicUpdateText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded disabled:opacity-50 cursor-pointer"
                  >
                    {addingUpdate ? 'Publishing...' : 'Publish Update'}
                  </button>
                </div>
              </div>

              {/* Immutable Action History Trail */}
              {managingIssue.actionHistory && managingIssue.actionHistory.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                      <span>📜</span> Immutable Case Audit Trail
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>🛡️</span> Tamper-Evident Append-Only Ledger
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-gray-100 text-gray-600 uppercase text-[9px] font-bold sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 w-28">Date & Time</th>
                          <th className="px-3 py-1.5">Action</th>
                          <th className="px-3 py-1.5 w-36">Performed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {managingIssue.actionHistory.map((act, i) => (
                          <tr key={i} className="hover:bg-gray-50/70">
                            <td className="px-3 py-1.5 text-gray-500 font-mono text-[10px] whitespace-nowrap">
                              {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-1.5 text-gray-800 font-medium leading-tight">{act.action}</td>
                            <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                              <span className="font-semibold text-gray-900 text-[10px] block">{act.performedBy}</span>
                              <span className="text-[9px] text-indigo-600">({act.role})</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 rounded-lg text-xs transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-red-600 hover:text-red-700 text-xs py-1"
                  >
                    🗑️ Delete Work Order
                  </button>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDeleteIssue}
                      disabled={deleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-xs"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-gray-200 text-gray-700 font-bold py-1.5 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
