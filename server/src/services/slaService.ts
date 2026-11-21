import fs from 'fs';
import path from 'path';

export interface SlaPolicies {
  [category: string]: number; // target hours
}

const DATA_DIR = path.join(__dirname, '../../data');
const SLA_FILE = path.join(DATA_DIR, 'slaPolicies.json');

const DEFAULT_SLA_POLICIES: SlaPolicies = {
  'Road & Potholes': 72,
  'Water Leakage & Supply': 24,
  'Streetlights & Power': 48,
  'Garbage & Sanitation': 24,
  'Public Safety': 12,
  'Other': 72,
};

let currentPolicies: SlaPolicies = { ...DEFAULT_SLA_POLICIES };

function loadPolicies(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SLA_FILE)) {
      const raw = fs.readFileSync(SLA_FILE, 'utf-8').trim();
      if (raw) {
        currentPolicies = { ...DEFAULT_SLA_POLICIES, ...JSON.parse(raw) };
        return;
      }
    }
    fs.writeFileSync(SLA_FILE, JSON.stringify(DEFAULT_SLA_POLICIES, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to load SLA policies:', err);
  }
}

function savePolicies(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SLA_FILE, JSON.stringify(currentPolicies, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save SLA policies:', err);
  }
}

// Initialize on import
loadPolicies();

export function getSlaPolicies(): SlaPolicies {
  return { ...currentPolicies };
}

export function updateSlaPolicies(newPolicies: Record<string, number | undefined>): SlaPolicies {
  for (const [key, val] of Object.entries(newPolicies)) {
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      currentPolicies[key] = val;
    }
  }
  savePolicies();
  return { ...currentPolicies };
}

export function computeSlaDeadline(category: string, createdAt: string): { targetHours: number; slaDeadline: string } {
  const targetHours = currentPolicies[category] || currentPolicies['Other'] || 72;
  const createdTime = new Date(createdAt).getTime();
  const deadlineTime = createdTime + targetHours * 60 * 60 * 1000;
  return {
    targetHours,
    slaDeadline: new Date(deadlineTime).toISOString(),
  };
}

export function evaluateSlaStatus(issue: {
  status: string;
  category: string;
  createdAt: string;
  slaDeadline?: string;
  slaTargetHours?: number;
}): {
  slaTargetHours: number;
  slaDeadline: string;
  slaBreached: boolean;
  isEscalated: boolean;
  hoursOverdue: number;
  hoursRemaining: number;
} {
  const targetHours = issue.slaTargetHours || currentPolicies[issue.category] || 72;
  const deadline = issue.slaDeadline || computeSlaDeadline(issue.category, issue.createdAt).slaDeadline;
  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();

  const isResolvedOrRejected = issue.status === 'Resolved' || issue.status === 'Rejected';
  const diffHours = Math.round((deadlineTime - now) / (1000 * 60 * 60));

  if (isResolvedOrRejected) {
    return {
      slaTargetHours: targetHours,
      slaDeadline: deadline,
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      hoursRemaining: Math.max(0, diffHours),
    };
  }

  const isBreached = now > deadlineTime;
  const hoursOverdue = isBreached ? Math.max(1, Math.round((now - deadlineTime) / (1000 * 60 * 60))) : 0;
  const hoursRemaining = !isBreached ? Math.max(0, diffHours) : 0;

  return {
    slaTargetHours: targetHours,
    slaDeadline: deadline,
    slaBreached: isBreached,
    isEscalated: isBreached || (hoursRemaining <= 6 && hoursRemaining >= 0),
    hoursOverdue,
    hoursRemaining,
  };
}
