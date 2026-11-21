export interface CaseNote {
  id: string;
  note: string;
  author: string;
  timestamp: string;
}

export interface PublicUpdate {
  id: string;
  update: string;
  timestamp: string;
  author?: string;
}

export interface ActionHistoryEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  role: string;
}

export interface CivicNotification {
  id: string;
  caseId: string;
  issueId: string;
  title: string;
  message: string;
  channel: 'In-App' | 'Email' | 'SMS';
  status: 'unread' | 'read';
  timestamp: string;
  recipient?: string;
  type: 'SUBMISSION_ACK' | 'DEPT_ASSIGNED' | 'OFFICER_ASSIGNED' | 'STATUS_UPDATE' | 'SLA_ESCALATED' | 'RESOLVED_FEEDBACK';
}

export type Notification = CivicNotification;

export interface Issue {
  id: string;
  trackingId: string;
  caseId?: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  category: string;
  subcategory?: string;
  citizenName?: string;
  citizenContact?: string;
  priority: string;
  priorityScore: number;
  impactReasoning: string;
  department: string;
  aiSummary: string;
  recommendedAction: string;
  estimatedResolutionHours: number;
  status: 'Reported' | 'In Progress' | 'Resolved' | 'Rejected';
  statusHistory: Array<{ status: string; note: string; timestamp: string }>;
  internalAdminNotes?: CaseNote[];
  publicUpdates?: PublicUpdate[];
  actionHistory?: ActionHistoryEntry[];
  upvotes: number;
  imageUrl?: string;
  imageUrls?: string[];
  authenticityCheck?: {
    status: 'Pending' | 'Verified' | 'Suspected Fake';
    isAiGenerated: boolean;
    confidence: number;
    reason: string;
    checkedAt: string;
  };
  userCategory?: string;
  reporterContact?: string;
  isFalseReport?: boolean;
  falseReportReason?: string;
  possibleDuplicateOf?: string;
  citizenReportCount?: number;
  linkedReports?: Array<{ description: string; reporterId: string; reportedAt: string }>;
  slaDeadline?: string;
  slaTargetHours?: number;
  slaBreached?: boolean;
  isEscalated?: boolean;
  hoursOverdue?: number;
  assignedOfficer?: string;
  completionEvidenceUrl?: string;
  resolvedAt?: string;
  citizenRating?: number;
  citizenFeedback?: string;
  reopenCount?: number;
  aiPowered: boolean;
  modelUsed: string;
  consolidated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMetric {
  department: string;
  totalAssigned: number;
  reported: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number;
  avgPriorityScore: number;
  falseReports: number;
  avgResolutionHours: number;
  overdueCount: number;
  avgCitizenSatisfaction: number;
  reopenedCount: number;
  performanceScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

export interface Stats {
  total: number;
  byStatus: { Reported: number; InProgress: number; Resolved: number; Rejected?: number };
  resolutionRate: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  averagePriorityScore: number;
  departments?: DepartmentMetric[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: 'STATUS_UPDATED' | 'DEPARTMENT_CHANGED' | 'ISSUE_DELETED' | 'FALSE_REPORT_FLAGGED' | 'OFFICER_ASSIGNED' | 'EVIDENCE_UPLOADED' | 'ISSUE_REOPENED' | 'CITIZEN_RATED' | 'GOVERNANCE_CONFIG_UPDATED';
  trackingId?: string;
  details: string;
}

export interface SlaPolicies {
  [category: string]: number;
}

export interface HealthStatus {
  status: string;
  primaryModel: string;
  fallbackModel: string;
  storageMode: string;
  timestamp: string;
}

export interface AdminUser {
  email: string;
  name: string;
  title: string;
  role: 'super_admin' | 'department_head';
  department: string;
}

export interface LoginHistoryEntry {
  id: string;
  email: string;
  name?: string;
  role?: string;
  department?: string;
  status: 'SUCCESS' | 'FAILED_PASSWORD' | 'FAILED_MFA';
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface GovernanceConfig {
  auditLogRetentionDays: number;
  maxAuditLogs: number;
  maxLoginHistory: number;
  rateLimitLoginMax: number;
  rateLimitIssuesMax: number;
  updatedAt: string;
  updatedBy: string;
}

export interface StorageUsage {
  auditLogsCount: number;
  auditLogsCap: number;
  loginHistoryCount: number;
  loginHistoryCap: number;
  issuesCount: number;
  notificationsCount: number;
  retentionDays: number;
}

export interface GovernanceData {
  config: GovernanceConfig;
  storageUsage: StorageUsage;
}

export type AuthLoginResponse =
  | {
      mfaRequired: true;
      tempToken: string;
      message: string;
      demoOtp: string;
      userEmail: string;
    }
  | {
      token: string;
      user: AdminUser;
    };

export interface CitizenProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  isMobileVerified: boolean;
  civicScore: number;
  createdAt: string;
}

export interface HelplineItem {
  department: string;
  scope: string;
  tollFree: string;
  icon: string;
}

export interface HelplinesData {
  emergencyControlRoom: {
    name: string;
    tollFree: string;
    directPhone: string;
    operationalHours: string;
  };
  departments: HelplineItem[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  maskedEmail: string;
  maskedMobile: string;
  civicScore: number;
  totalReports: number;
  resolvedReports: number;
  negativeFlags: number;
  rank: number;
  badge: string;
}
