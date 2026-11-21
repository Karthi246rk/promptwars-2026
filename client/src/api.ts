import type {
  HealthStatus,
  Issue,
  Stats,
  DepartmentMetric,
  AuditLog,
  SlaPolicies,
  CivicNotification,
  AdminUser,
  LoginHistoryEntry,
  GovernanceData,
  AuthLoginResponse,
  CitizenProfile,
  LeaderboardEntry,
  HelplinesData,
} from './types';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

export async function fetchIssues(filters?: {
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  department?: string;
  slaBreached?: string;
}): Promise<Issue[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.department) params.set('department', filters.department);
  if (filters?.slaBreached) params.set('slaBreached', filters.slaBreached);
  const query = params.toString();
  const res = await fetch(`/api/issues${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch issues');
  return res.json();
}

export async function createIssue(formData: FormData): Promise<Issue> {
  const res = await fetch('/api/issues', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create issue' }));
    throw new Error(err.error || 'Failed to create issue');
  }
  return res.json();
}

export async function updateIssue(
  id: string,
  updates: Partial<Pick<Issue, 'status' | 'department' | 'priority' | 'priorityScore' | 'assignedOfficer'>> & {
    resolutionNote?: string;
    adminEmail?: string;
  }
): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update issue' }));
    throw new Error(err.error || 'Failed to update issue');
  }
  return res.json();
}

export async function deleteIssue(id: string, adminEmail: string = 'admin@civicresolve.gov'): Promise<void> {
  const res = await fetch(`/api/issues/${id}?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete issue');
}

export async function upvoteIssue(id: string, action: 'add' | 'remove' = 'add'): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to update upvote');
  return res.json();
}

export async function uploadCompletionEvidence(id: string, formData: FormData): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/evidence`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to upload completion evidence' }));
    throw new Error(err.error || 'Failed to upload completion evidence');
  }
  return res.json();
}

export async function flagFalseReport(
  id: string,
  reason: string,
  adminEmail: string = 'admin@civicresolve.gov'
): Promise<{ issue: Issue; penalty?: any }> {
  const res = await fetch(`/api/issues/${id}/flag-false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, adminEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to flag false report' }));
    throw new Error(err.error || 'Failed to flag false report');
  }
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchDepartmentAnalytics(): Promise<DepartmentMetric[]> {
  const res = await fetch('/api/analytics/departments');
  if (!res.ok) throw new Error('Failed to fetch department analytics');
  return res.json();
}

export async function fetchSlaPolicies(): Promise<SlaPolicies> {
  const res = await fetch('/api/sla-policies');
  if (!res.ok) throw new Error('Failed to fetch SLA policies');
  return res.json();
}

export async function updateSlaPolicies(policies: Partial<SlaPolicies>): Promise<SlaPolicies> {
  const res = await fetch('/api/sla-policies', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policies),
  });
  if (!res.ok) throw new Error('Failed to update SLA policies');
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch('/api/audit-logs');
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function rateIssue(id: string, rating: number, feedback?: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, feedback }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to rate issue' }));
    throw new Error(err.error || 'Failed to rate issue');
  }
  return res.json();
}

export async function reopenIssue(id: string, reason?: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${id}/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to reopen issue' }));
    throw new Error(err.error || 'Failed to reopen issue');
  }
  return res.json();
}

export async function fetchNotifications(): Promise<CivicNotification[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(id: string): Promise<CivicNotification> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const res = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
  return res.json();
}

export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete notification');
  return res.json();
}

export async function deleteNotificationsBatch(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  const res = await fetch('/api/notifications/delete-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to delete notifications batch');
  return res.json();
}

export async function addCaseNote(issueId: string, note: string, author: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${issueId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, author }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to add case note' }));
    throw new Error(err.error || 'Failed to add case note');
  }
  return res.json();
}

export async function addPublicUpdate(issueId: string, update: string, author?: string): Promise<Issue> {
  const res = await fetch(`/api/issues/${issueId}/public-updates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update, author }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to add public update' }));
    throw new Error(err.error || 'Failed to add public update');
  }
  return res.json();
}

// Authentication & 2-Step MFA
export async function loginAdmin(email: string, password: string, otp?: string): Promise<AuthLoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function verifyMfa(tempToken: string, otp: string, email?: string): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch('/api/auth/verify-mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken, otp, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'MFA verification failed' }));
    throw new Error(err.error || 'MFA verification failed');
  }
  return res.json();
}

// Governance & Login Audit
export async function fetchLoginHistory(): Promise<LoginHistoryEntry[]> {
  const res = await fetch('/api/audit-logs/logins');
  if (!res.ok) throw new Error('Failed to fetch login history');
  return res.json();
}

export async function fetchGovernanceData(): Promise<GovernanceData> {
  const res = await fetch('/api/governance/config');
  if (!res.ok) throw new Error('Failed to fetch governance configuration');
  return res.json();
}

export async function updateGovernanceRetention(days: number, updatedBy?: string): Promise<GovernanceData> {
  const res = await fetch('/api/governance/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auditLogRetentionDays: days, updatedBy }),
  });
  if (!res.ok) throw new Error('Failed to update audit log retention policy');
  return res.json();
}

export function downloadAuditLogsCsv(): void {
  const link = document.createElement('a');
  link.href = '/api/audit-logs/export-csv';
  link.setAttribute('download', 'civicresolve_audit_logs.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Citizen Authentication & First-Time Mobile OTP
export async function registerCitizen(data: {
  name: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<{ message: string; tempId: string; demoOtp: string }> {
  const res = await fetch('/api/citizens/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function verifyCitizenOtp(
  tempId: string,
  otp: string
): Promise<{ citizen: CitizenProfile; token: string }> {
  const res = await fetch('/api/citizens/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempId, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'OTP verification failed' }));
    throw new Error(err.error || 'OTP verification failed');
  }
  return res.json();
}

export async function loginCitizen(
  email: string,
  password: string
): Promise<{ citizen: CitizenProfile; token: string }> {
  const res = await fetch('/api/citizens/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function fetchCitizenProfile(contact: string): Promise<CitizenProfile> {
  const res = await fetch(`/api/citizens/profile?contact=${encodeURIComponent(contact)}`);
  if (!res.ok) throw new Error('Failed to fetch citizen profile');
  return res.json();
}

export async function fetchCitizenLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/citizens/leaderboard');
  if (!res.ok) throw new Error('Failed to fetch citizen leaderboard');
  const data = await res.json();
  return Array.isArray(data) ? data : data.leaderboard || [];
}

// Dynamic Translation API
export async function translateTexts(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (targetLang === 'en' || !texts || texts.length === 0) return texts;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLang }),
    });
    if (!res.ok) return texts;
    const data = await res.json();
    return data.translations || texts;
  } catch (err) {
    console.warn('Translation call failed, returning original texts:', err);
    return texts;
  }
}

// Helplines Directory
export async function fetchHelplines(): Promise<HelplinesData> {
  const res = await fetch('/api/helplines');
  if (!res.ok) throw new Error('Failed to fetch helpline directory');
  return res.json();
}

// Password Reset APIs
export async function requestPasswordResetOtp(
  email: string,
  userType: 'citizen' | 'admin'
): Promise<{ success: boolean; message: string; demoOtp?: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to request password reset OTP');
  }
  return res.json();
}

export async function resetPassword(payload: {
  email: string;
  userType: 'citizen' | 'admin';
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset password');
  }
  return res.json();
}
