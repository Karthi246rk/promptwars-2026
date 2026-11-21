import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface GovernanceConfig {
  auditLogRetentionDays: number;
  maxAuditLogs: number;
  maxLoginHistory: number;
  rateLimitLoginMax: number;
  rateLimitIssuesMax: number;
  updatedAt: string;
  updatedBy: string;
}

export interface LoginRecord {
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

const DATA_DIR = path.resolve(__dirname, '../../data');
const GOVERNANCE_FILE = path.join(DATA_DIR, 'governanceConfig.json');
const LOGIN_HISTORY_FILE = path.join(DATA_DIR, 'loginHistory.json');

const DEFAULT_CONFIG: GovernanceConfig = {
  auditLogRetentionDays: 90,
  maxAuditLogs: 1000,
  maxLoginHistory: 500,
  rateLimitLoginMax: 15,
  rateLimitIssuesMax: 25,
  updatedAt: new Date().toISOString(),
  updatedBy: 'commissioner@civicresolve.gov',
};

let governanceConfig: GovernanceConfig = { ...DEFAULT_CONFIG };
let loginHistory: LoginRecord[] = [];

export function initializeGovernance(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load or create governanceConfig.json
  if (fs.existsSync(GOVERNANCE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(GOVERNANCE_FILE, 'utf-8'));
      governanceConfig = { ...DEFAULT_CONFIG, ...data };
    } catch {
      governanceConfig = { ...DEFAULT_CONFIG };
      saveConfigToFile();
    }
  } else {
    governanceConfig = { ...DEFAULT_CONFIG };
    saveConfigToFile();
  }

  // Load or create loginHistory.json
  if (fs.existsSync(LOGIN_HISTORY_FILE)) {
    try {
      loginHistory = JSON.parse(fs.readFileSync(LOGIN_HISTORY_FILE, 'utf-8'));
    } catch {
      loginHistory = [];
      saveLoginHistoryToFile();
    }
  } else {
    loginHistory = getSeedLoginHistory();
    saveLoginHistoryToFile();
  }
}

function saveConfigToFile(): void {
  fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(governanceConfig, null, 2), 'utf-8');
}

function saveLoginHistoryToFile(): void {
  fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(loginHistory, null, 2), 'utf-8');
}

function getSeedLoginHistory(): LoginRecord[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  return [
    {
      id: uuidv4(),
      email: 'commissioner@civicresolve.gov',
      name: 'Dr. Anita Roy, IAS',
      role: 'super_admin',
      department: 'Super Admin',
      status: 'SUCCESS',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
      timestamp: hoursAgo(2),
    },
    {
      id: uuidv4(),
      email: 'pwd@civicresolve.gov',
      name: 'Er. Rajesh Varma',
      role: 'department_head',
      department: 'Public Works Department',
      status: 'SUCCESS',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
      timestamp: hoursAgo(6),
    },
    {
      id: uuidv4(),
      email: 'intruder@unknown.com',
      status: 'FAILED_PASSWORD',
      ip: '192.168.1.105',
      userAgent: 'Python-requests/2.31.0',
      timestamp: hoursAgo(12),
    },
    {
      id: uuidv4(),
      email: 'water@civicresolve.gov',
      name: 'Er. Sunita Rao',
      role: 'department_head',
      department: 'Water Supply Department',
      status: 'SUCCESS',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: hoursAgo(18),
    },
  ];
}

// Record login attempt with hybrid retention enforcement (rolling cap + TTL)
export function recordLoginAttempt(attempt: Omit<LoginRecord, 'id' | 'timestamp'>): LoginRecord {
  const now = new Date();
  const record: LoginRecord = {
    ...attempt,
    id: uuidv4(),
    timestamp: now.toISOString(),
  };

  loginHistory.unshift(record);

  // Apply Hybrid Retention:
  // 1. TTL Pruning
  const ttlCutoff = new Date(now.getTime() - governanceConfig.auditLogRetentionDays * 86400000).toISOString();
  loginHistory = loginHistory.filter((item) => item.timestamp >= ttlCutoff);

  // 2. Rolling Cap Pruning
  if (loginHistory.length > governanceConfig.maxLoginHistory) {
    loginHistory = loginHistory.slice(0, governanceConfig.maxLoginHistory);
  }

  saveLoginHistoryToFile();
  return record;
}

export function getLoginHistory(): LoginRecord[] {
  return [...loginHistory];
}

export function getGovernanceConfig(): GovernanceConfig {
  return { ...governanceConfig };
}

export function updateGovernanceConfig(
  updates: Partial<Pick<GovernanceConfig, 'auditLogRetentionDays' | 'rateLimitLoginMax' | 'rateLimitIssuesMax'>>,
  updatedBy: string = 'commissioner@civicresolve.gov'
): GovernanceConfig {
  if (updates.auditLogRetentionDays !== undefined) {
    governanceConfig.auditLogRetentionDays = Math.max(7, Math.min(365, updates.auditLogRetentionDays));
  }
  if (updates.rateLimitLoginMax !== undefined) {
    governanceConfig.rateLimitLoginMax = Math.max(5, updates.rateLimitLoginMax);
  }
  if (updates.rateLimitIssuesMax !== undefined) {
    governanceConfig.rateLimitIssuesMax = Math.max(5, updates.rateLimitIssuesMax);
  }
  governanceConfig.updatedAt = new Date().toISOString();
  governanceConfig.updatedBy = updatedBy;

  saveConfigToFile();

  // Prune login history with new TTL
  const now = Date.now();
  const cutoff = new Date(now - governanceConfig.auditLogRetentionDays * 86400000).toISOString();
  loginHistory = loginHistory.filter((item) => item.timestamp >= cutoff);
  if (loginHistory.length > governanceConfig.maxLoginHistory) {
    loginHistory = loginHistory.slice(0, governanceConfig.maxLoginHistory);
  }
  saveLoginHistoryToFile();

  return { ...governanceConfig };
}

// Hybrid retention logic for audit logs (capped at 1,000 active, pruned by retentionDays)
export function applyAuditLogRetention<T extends { timestamp: string }>(logs: T[]): T[] {
  const now = Date.now();
  const cutoff = new Date(now - governanceConfig.auditLogRetentionDays * 86400000).toISOString();

  // 1. Time-based retention
  let filtered = logs.filter((l) => l.timestamp >= cutoff);

  // 2. Rolling Cap
  if (filtered.length > governanceConfig.maxAuditLogs) {
    filtered = filtered.slice(0, governanceConfig.maxAuditLogs);
  }

  return filtered;
}

export function generateAuditLogsCsv(logs: Array<{ id: string; timestamp: string; adminEmail: string; action: string; trackingId?: string; details: string }>): string {
  const header = ['ID', 'Timestamp', 'Admin Email', 'Action', 'Tracking ID', 'Details'];
  const escapeCell = (str?: string) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = logs.map((log) => [
    escapeCell(log.id),
    escapeCell(log.timestamp),
    escapeCell(log.adminEmail),
    escapeCell(log.action),
    escapeCell(log.trackingId || ''),
    escapeCell(log.details),
  ].join(','));

  return [header.join(','), ...rows].join('\r\n');
}
