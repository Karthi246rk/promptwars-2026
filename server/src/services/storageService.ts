import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { computeSlaDeadline, evaluateSlaStatus } from './slaService';
import * as governanceService from './governanceService';
import * as citizenAuthService from './citizenAuthService';

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

export interface Notification {
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
  citizenReportCount: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: 'STATUS_UPDATED' | 'DEPARTMENT_CHANGED' | 'ISSUE_DELETED' | 'FALSE_REPORT_FLAGGED' | 'OFFICER_ASSIGNED' | 'EVIDENCE_UPLOADED' | 'ISSUE_REOPENED' | 'CITIZEN_RATED' | 'GOVERNANCE_CONFIG_UPDATED' | 'AUTHENTICITY_FLAGGED';
  trackingId?: string;
  details: string;
}

export interface ReporterPenalty {
  reporterId: string;
  strikes: number;
  totalFineInr: number;
  isRestricted: boolean;
  history: Array<{ timestamp: string; reason: string; fineInr: number; trackingId: string }>;
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

interface IssueFilters {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  department?: string;
  slaBreached?: string;
}

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'issues.json');
const AUDIT_FILE = path.join(DATA_DIR, 'auditLogs.json');
const PENALTY_FILE = path.join(DATA_DIR, 'penalties.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

let issues: Issue[] = [];
let auditLogs: AuditLog[] = [];
let penalties: Record<string, ReporterPenalty> = {};
let notifications: Notification[] = [];

export function deriveSubcategory(category: string, title: string): string {
  const t = title.toLowerCase();
  switch (category) {
    case 'Road & Potholes':
      if (t.includes('divider') || t.includes('median')) return 'Damaged Road Divider';
      if (t.includes('cave-in') || t.includes('sinkhole')) return 'Road Surface Cave-In';
      if (t.includes('pavement') || t.includes('footpath') || t.includes('sidewalk')) return 'Crumbling Pedestrian Footpath';
      return 'Deep Asphalt Pothole';
    case 'Water Leakage & Supply':
      if (t.includes('meter')) return 'Commercial Water Meter Burst';
      if (t.includes('contamination') || t.includes('dirty')) return 'Contaminated Water Supply';
      if (t.includes('pressure') || t.includes('shortage')) return 'Low Pressure Water Grid';
      return 'Main Distribution Pipeline Rupture';
    case 'Garbage & Sanitation':
      if (t.includes('commercial') || t.includes('debris') || t.includes('dump')) return 'Illegal Debris & Waste Dumping';
      if (t.includes('drain') || t.includes('choke')) return 'Choked Open Stormwater Drain';
      return 'Overflowing Public Dustbins';
    case 'Streetlights & Power':
      if (t.includes('cable') || t.includes('wire') || t.includes('exposed')) return 'Exposed High-Voltage Distribution Lines';
      if (t.includes('transformer')) return 'Faulty Substation Transformer';
      return 'Defective Streetlight Luminaire';
    case 'Public Safety':
      if (t.includes('manhole') || t.includes('cover') || t.includes('drainage')) return 'Missing Stormwater Manhole Cover';
      if (t.includes('tree')) return 'Hazardous Fallen Tree Obstruction';
      return 'Critical Pedestrian Life Hazard';
    default:
      return 'General Civic Grievance';
  }
}

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function wordsOverlap(text1: string, text2: string): boolean {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'near', 'with', 'by', 'of', 'for', 'to',
    'water', 'road', 'street', 'area', 'issue', 'problem', 'major', 'please', 'urgent', 'there', 'have', 'been',
    'this', 'that', 'from', 'very', 'some', 'much', 'also', 'about'
  ]);
  const getWords = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

  const words1 = new Set(getWords(text1));
  const words2 = new Set(getWords(text2));
  let overlap = 0;
  for (const w of words2) {
    if (words1.has(w)) overlap++;
  }
  return overlap >= 3;
}

function loadAllData(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Issues
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
      if (raw) {
        issues = JSON.parse(raw);
      }
    }

    // Audit logs
    if (fs.existsSync(AUDIT_FILE)) {
      const rawAudit = fs.readFileSync(AUDIT_FILE, 'utf-8').trim();
      if (rawAudit) {
        auditLogs = JSON.parse(rawAudit);
      }
    }

    // Penalties
    if (fs.existsSync(PENALTY_FILE)) {
      const rawPen = fs.readFileSync(PENALTY_FILE, 'utf-8').trim();
      if (rawPen) {
        penalties = JSON.parse(rawPen);
      }
    }

    // Notifications
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const rawNotifs = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8').trim();
      if (rawNotifs) {
        notifications = JSON.parse(rawNotifs);
        if (notifications.length > 50) {
          notifications = notifications.slice(0, 50);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load storage files:', err);
  }
}

function saveIssuesToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(issues, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save issues to file:', err);
  }
}

function saveNotificationsToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save notifications to file:', err);
  }
}

function saveAuditLogsToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save audit logs to file:', err);
  }
}

function savePenaltiesToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PENALTY_FILE, JSON.stringify(penalties, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save penalties to file:', err);
  }
}

function getSeedData(): Issue[] {
  const now = new Date();
  const daysAgo = (d: number, hoursOffset: number = 0) =>
    new Date(now.getTime() - d * 86400000 - hoursOffset * 3600000).toISOString();

  return [
    {
      id: uuidv4(),
      trackingId: 'CR-2026-001',
      title: 'Massive Pothole on MG Road',
      description:
        'A large pothole approximately 3 feet wide and 1 foot deep has formed on MG Road near the central junction. Multiple vehicles have been damaged and two-wheeler riders are at serious risk.',
      location: 'MG Road, Central Junction, Near City Mall',
      latitude: 11.0182,
      longitude: 76.9584,
      category: 'Road & Potholes',
      priority: 'Critical',
      priorityScore: 92,
      impactReasoning: 'Critical arterial road hazard posing immediate danger to motorists and traffic flow.',
      department: 'Public Works Department',
      aiSummary: 'Critical road hazard: 3-foot wide pothole on MG Road near central junction.',
      recommendedAction: 'Immediate cold-mix patch followed by permanent asphalt overlay.',
      estimatedResolutionHours: 24,
      status: 'Resolved',
      statusHistory: [
        { status: 'Reported', note: 'Issue reported by citizen', timestamp: daysAgo(10) },
        { status: 'In Progress', note: 'Field officer assigned: Suresh K.', timestamp: daysAgo(8) },
        { status: 'Resolved', note: 'Pothole filled and sealed with hot-mix asphalt.', timestamp: daysAgo(5) },
      ],
      upvotes: 18,
      citizenReportCount: 4,
      assignedOfficer: 'Suresh Kumar (PWD Field Eng)',
      slaTargetHours: 72,
      slaDeadline: daysAgo(7),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      resolvedAt: daysAgo(5),
      citizenRating: 5,
      citizenFeedback: 'Pothole filled and sealed with hot-mix asphalt within 24 hours. Commute is now safe!',
      reopenCount: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(5),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-002',
      title: 'Overflowing Garbage Bins Near Central Market',
      description:
        'The garbage bins outside the Central Market have not been cleared for over 4 days. Trash is overflowing onto the sidewalk creating health hazards and attracting stray dogs.',
      location: 'Central Market, Main Entrance, Ward 12',
      latitude: 11.0145,
      longitude: 76.952,
      category: 'Garbage & Sanitation',
      priority: 'High',
      priorityScore: 78,
      impactReasoning: 'Severe sanitation risk near high-footfall marketplace with decaying bio-waste.',
      department: 'Sanitation Department',
      aiSummary: 'Overflowing commercial waste bins at market entrance requiring immediate compactor truck dispatch.',
      recommendedAction: 'Dispatch mechanical refuse truck and sanitize bin surroundings with lime powder.',
      estimatedResolutionHours: 12,
      status: 'In Progress',
      statusHistory: [
        { status: 'Reported', note: 'Issue reported by local shopkeeper association', timestamp: daysAgo(1, 10) },
        { status: 'In Progress', note: 'Sanitation supervisor Arvind M. scheduled pickup truck', timestamp: daysAgo(0, 4) },
      ],
      upvotes: 9,
      citizenReportCount: 2,
      assignedOfficer: 'Arvind Mehra (Sanitation Inspector)',
      slaTargetHours: 24,
      slaDeadline: daysAgo(0, -14), // Still 14h left
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(1, 10),
      updatedAt: daysAgo(0, 4),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-003',
      title: 'Broken Streetlight on 5th Avenue',
      description:
        'Streetlight pole #ST-547 on 5th Avenue near the park entrance has been non-functional for past 5 days. Complete darkness causes safety concerns for evening pedestrians and women commuters.',
      location: '5th Avenue, Near City Park Entrance, Sector 7',
      latitude: 11.021,
      longitude: 76.961,
      category: 'Streetlights & Power',
      priority: 'Medium',
      priorityScore: 65,
      impactReasoning: 'Public safety risk during night hours on an active pedestrian boulevard.',
      department: 'Electricity Department',
      aiSummary: 'Faulty streetlight pole #ST-547 causing dark corridor near public park.',
      recommendedAction: 'Replace 120W LED fixture and inspect underground line connection.',
      estimatedResolutionHours: 48,
      status: 'Reported',
      statusHistory: [
        { status: 'Reported', note: 'Initial citizen report received', timestamp: daysAgo(5) },
      ],
      upvotes: 6,
      citizenReportCount: 3,
      slaTargetHours: 48,
      slaDeadline: daysAgo(3), // 3 days overdue!
      slaBreached: true,
      isEscalated: true,
      hoursOverdue: 72,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-004',
      title: 'Water Pipeline Leak at Gandhi Nagar',
      description:
        'A major 8-inch water distribution pipeline is ruptured at Gandhi Nagar intersection. Thousands of liters of potable water are being wasted hourly, causing low tap pressure across Ward 4.',
      location: 'Gandhi Nagar, Intersection with Nehru Street, Block C',
      latitude: 11.012,
      longitude: 76.949,
      category: 'Water Leakage & Supply',
      priority: 'High',
      priorityScore: 82,
      impactReasoning: 'Continuous potable water loss, road erosion, and essential utility outage for 300+ households.',
      department: 'Water Supply Department',
      aiSummary: 'Critical distribution pipe burst at Gandhi Nagar junction causing road submergence.',
      recommendedAction: 'Isolate upstream sluice valve, excavate leak point, and weld replacement collar clamp.',
      estimatedResolutionHours: 24,
      status: 'In Progress',
      statusHistory: [
        { status: 'Reported', note: 'Reported by ward resident', timestamp: daysAgo(1, 2) },
        { status: 'In Progress', note: 'Valve shutoff completed by pipeline gang', timestamp: daysAgo(0, 6) },
      ],
      upvotes: 14,
      citizenReportCount: 3,
      assignedOfficer: 'K. Rajendran (Junior Water Engineer)',
      slaTargetHours: 24,
      slaDeadline: daysAgo(0, -22),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(1, 2),
      updatedAt: daysAgo(0, 6),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-005',
      title: 'Damaged Road Divider on NH-48',
      description:
        'Concrete median barrier fractured with heavy rubble thrown across the fast lane on NH-48 near Toll Plaza. Motorists forced into abrupt swerves.',
      location: 'NH-48, Near Toll Plaza, KM 42',
      latitude: 11.025,
      longitude: 76.965,
      category: 'Road & Potholes',
      priority: 'Critical',
      priorityScore: 90,
      impactReasoning: 'High-speed highway obstruction prone to catastrophic multi-vehicle pileups.',
      department: 'Public Works Department',
      aiSummary: 'Shattered highway median barrier obstructing overtaking lane near toll gate.',
      recommendedAction: 'Deploy reflective lane cones, clear debris immediately, and install precast Jersey barriers.',
      estimatedResolutionHours: 48,
      status: 'Reported',
      statusHistory: [
        { status: 'Reported', note: 'Highway patrol reported collision aftermath', timestamp: daysAgo(0, 8) },
      ],
      upvotes: 8,
      citizenReportCount: 1,
      slaTargetHours: 72,
      slaDeadline: daysAgo(0, -64),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 8),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-006',
      title: 'Open Drainage Cover Near School Zone',
      description:
        'A large 2.5-foot stormwater manhole cover is completely missing on Park Street right outside St. Mary’s Primary School. Severe fatal hazard for young students during dismissal hours.',
      location: 'Park Street, Near St. Mary’s School, Ward 5',
      latitude: 11.0168,
      longitude: 76.9558,
      category: 'Public Safety',
      priority: 'Critical',
      priorityScore: 96,
      impactReasoning: 'Imminent life safety hazard for school children directly on the pedestrian walking path.',
      department: 'Municipal Administration',
      aiSummary: 'Uncovered 6-foot deep storm chamber at primary school gate.',
      recommendedAction: 'Erect barricade guard immediately; install reinforced ductile iron cover within 4 hours.',
      estimatedResolutionHours: 12,
      status: 'Reported',
      statusHistory: [
        { status: 'Reported', note: 'Urgent alert from School Principal', timestamp: daysAgo(0, 3) },
      ],
      upvotes: 24,
      citizenReportCount: 5,
      slaTargetHours: 12,
      slaDeadline: daysAgo(0, -9),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      reopenCount: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(0, 3),
      updatedAt: daysAgo(0, 3),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-007',
      title: 'Ruptured Water Meter at Green Valley',
      description: 'Distribution water meter cracked and spurting water across apartment entrance sidewalk. Potable water wastage and pedestrian slippery hazard.',
      location: 'Green Valley Apartments, Phase 2 Entrance',
      latitude: 11.0112,
      longitude: 76.9465,
      category: 'Water Leakage & Supply',
      priority: 'Medium',
      priorityScore: 74,
      impactReasoning: 'Continuous potable water loss and slippery entrance for apartment residents.',
      department: 'Water Supply Department',
      aiSummary: 'Cracked commercial water meter leaking onto apartment pathway.',
      recommendedAction: 'Replace cracked brass meter flange and verify line pressure.',
      estimatedResolutionHours: 24,
      status: 'Resolved',
      statusHistory: [
        { status: 'Reported', note: 'Resident welfare association submitted photo', timestamp: daysAgo(3, 4) },
        { status: 'In Progress', note: 'Technician dispatched with meter assembly', timestamp: daysAgo(3, 1) },
        { status: 'Resolved', note: 'New meter unit fitted and tested leak-free', timestamp: daysAgo(2, 6) },
      ],
      upvotes: 11,
      citizenReportCount: 2,
      assignedOfficer: 'S. Chandran (Water Inspector)',
      slaTargetHours: 24,
      slaDeadline: daysAgo(2, 4),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      resolvedAt: daysAgo(2, 6),
      citizenRating: 4,
      citizenFeedback: 'Prompt replacement of ruptured distribution meter. Water pressure restored.',
      reopenCount: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(3, 4),
      updatedAt: daysAgo(2, 6),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-008',
      title: 'High-Voltage Cable Insulation Exposed on Cross Road',
      description: 'Underground junction box cover dislodged exposing heavy 440V distribution lines right beside pedestrian bus shelter.',
      location: 'Cross Road 4, Bus Shelter Junction',
      latitude: 11.0195,
      longitude: 76.9632,
      category: 'Streetlights & Power',
      priority: 'High',
      priorityScore: 78,
      impactReasoning: 'Exposed live power junction in high-footfall passenger bus shelter area.',
      department: 'Electricity Department',
      aiSummary: 'Dislodged distribution cover exposing 440V cables at bus stop.',
      recommendedAction: 'Insulate cables, apply heat-shrink wrap, and bolt cast-iron junction hatch.',
      estimatedResolutionHours: 24,
      status: 'Resolved',
      statusHistory: [
        { status: 'Reported', note: 'Bus commuter emergency report', timestamp: daysAgo(4, 2) },
        { status: 'In Progress', note: 'Line crew barricaded spot and disconnected feed', timestamp: daysAgo(3, 18) },
        { status: 'Resolved', note: 'Hatch bolted shut and lines tested safe', timestamp: daysAgo(3, 2) },
      ],
      upvotes: 15,
      citizenReportCount: 3,
      assignedOfficer: 'Anand V. (Assistant Electrical Engineer)',
      slaTargetHours: 48,
      slaDeadline: daysAgo(2, 2),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      resolvedAt: daysAgo(3, 2),
      citizenRating: 4,
      citizenFeedback: 'Insulation replaced and conduit bolted securely. Safe for pedestrians.',
      reopenCount: 1,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(4, 2),
      updatedAt: daysAgo(3, 2),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-009',
      title: 'Commercial Waste Cleared from Shastri Nagar',
      description: 'Bulk construction debris and commercial boxes dumped illegally on Shastri Nagar playground corner. Dust and safety hazard for playing children.',
      location: 'Shastri Nagar Municipal Playground, North Corner',
      latitude: 11.0135,
      longitude: 76.9535,
      category: 'Garbage & Sanitation',
      priority: 'High',
      priorityScore: 80,
      impactReasoning: 'Illegal construction debris blocking public children playground.',
      department: 'Sanitation Department',
      aiSummary: 'Commercial waste and broken bricks dumped on playground corner.',
      recommendedAction: 'Dispatch JCB loader and dump truck to clear debris; level soil.',
      estimatedResolutionHours: 24,
      status: 'Resolved',
      statusHistory: [
        { status: 'Reported', note: 'Youth sports club reported dumped debris', timestamp: daysAgo(2, 2) },
        { status: 'In Progress', note: 'JCB earthmover deployed to playground', timestamp: daysAgo(1, 16) },
        { status: 'Resolved', note: 'Debris trucked to processing yard and ground leveled', timestamp: daysAgo(1, 8) },
      ],
      upvotes: 21,
      citizenReportCount: 4,
      assignedOfficer: 'M. Selvaraj (Sanitation Supervisor)',
      slaTargetHours: 24,
      slaDeadline: daysAgo(1, 2),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      resolvedAt: daysAgo(1, 8),
      citizenRating: 5,
      citizenFeedback: 'Ground completely cleared in under 20 hours! Children are back playing football.',
      reopenCount: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(2, 2),
      updatedAt: daysAgo(1, 8),
    },
    {
      id: uuidv4(),
      trackingId: 'CR-2026-010',
      title: 'Missing Community Center Railing Replaced',
      description: 'Broken handrail along steep entrance stairs at Ward 9 Community Hall. Elderly citizens unable to climb steps safely for pension distribution.',
      location: 'Ward 9 Municipal Community Hall, Main Steps',
      latitude: 11.0175,
      longitude: 76.9572,
      category: 'Public Safety',
      priority: 'High',
      priorityScore: 82,
      impactReasoning: 'Steep stair fall hazard for senior citizens attending civic center.',
      department: 'Municipal Administration',
      aiSummary: 'Fractured handrail on steep municipal hall entrance steps.',
      recommendedAction: 'Fabricate and anchor heavy-duty stainless steel railing into concrete steps.',
      estimatedResolutionHours: 24,
      status: 'Resolved',
      statusHistory: [
        { status: 'Reported', note: 'Senior citizens association request', timestamp: daysAgo(3, 8) },
        { status: 'In Progress', note: 'Fabrication gang took measurements', timestamp: daysAgo(2, 20) },
        { status: 'Resolved', note: 'Heavy-duty steel railing welded and anchor-bolted', timestamp: daysAgo(2, 10) },
      ],
      upvotes: 19,
      citizenReportCount: 3,
      assignedOfficer: 'V. Prakash (Civic Maintenance Overseer)',
      slaTargetHours: 24,
      slaDeadline: daysAgo(2, 8),
      slaBreached: false,
      isEscalated: false,
      hoursOverdue: 0,
      resolvedAt: daysAgo(2, 10),
      citizenRating: 5,
      citizenFeedback: 'Sturdy steel railing installed firmly. Seniors can now climb steps with confidence.',
      reopenCount: 0,
      aiPowered: true,
      modelUsed: 'gemini-4-hydrogen',
      createdAt: daysAgo(3, 8),
      updatedAt: daysAgo(2, 10),
    },
  ];
}

function getSeedNotifications(): Notification[] {
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  return [
    {
      id: uuidv4(),
      caseId: 'CR-2026-003',
      issueId: 'seed-3',
      title: '🚨 SLA Escalation: Streetlight #ST-547',
      message: 'Case CR-2026-003 exceeded 48h SLA target. Escalated to Municipal Commissioner.',
      channel: 'In-App',
      status: 'unread',
      timestamp: minsAgo(12),
      recipient: 'Commissioner & Electricity Head',
      type: 'SLA_ESCALATED',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-003',
      issueId: 'seed-3',
      title: '[SMS Queued] High-Priority Alert',
      message: 'CivicResolve: Case CR-2026-003 is overdue (+72h). Commissioner emergency alert sent.',
      channel: 'SMS',
      status: 'unread',
      timestamp: minsAgo(12),
      recipient: '+91 94441 55667',
      type: 'SLA_ESCALATED',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-004',
      issueId: 'seed-4',
      title: 'Officer Assigned: Gandhi Nagar Pipeline Leak',
      message: 'Junior Water Engineer K. Rajendran has been dispatched to isolate the leaking main pipeline.',
      channel: 'In-App',
      status: 'unread',
      timestamp: minsAgo(35),
      recipient: 'Ward 4 Residents',
      type: 'OFFICER_ASSIGNED',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-004',
      issueId: 'seed-4',
      title: '[SMS Queued] Officer Dispatched for Case CR-2026-004',
      message: 'CivicResolve: Er. K. Rajendran assigned to Water Leakage CR-2026-004. Inspection underway.',
      channel: 'SMS',
      status: 'read',
      timestamp: minsAgo(35),
      recipient: '+91 98401 23456',
      type: 'OFFICER_ASSIGNED',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-002',
      issueId: 'seed-2',
      title: 'Department Routed: Central Market Waste Bins',
      message: 'Case CR-2026-002 routed to Sanitation Department. Mechanical compactor truck scheduled.',
      channel: 'In-App',
      status: 'read',
      timestamp: minsAgo(80),
      recipient: 'Market Welfare Assoc',
      type: 'DEPT_ASSIGNED',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-001',
      issueId: 'seed-1',
      title: 'Case CR-2026-001 Resolved & Citizen Rated 5/5',
      message: 'MG Road pothole filled with hot-mix asphalt. Citizen confirmed resolution safe.',
      channel: 'In-App',
      status: 'read',
      timestamp: minsAgo(180),
      recipient: 'R. Anantharaman',
      type: 'RESOLVED_FEEDBACK',
    },
    {
      id: uuidv4(),
      caseId: 'CR-2026-001',
      issueId: 'seed-1',
      title: '[Email Sent] Resolution Certificate: Case CR-2026-001',
      message: 'Official Digital Case File CR-2026-001 closed. Inspection completed by Suresh Kumar (PWD).',
      channel: 'Email',
      status: 'read',
      timestamp: minsAgo(180),
      recipient: 'citizen@civicresolve.gov',
      type: 'RESOLVED_FEEDBACK',
    },
  ];
}

export function addNotification(notif: Omit<Notification, 'id' | 'status' | 'timestamp'>): Notification {
  const newNotif: Notification = {
    ...notif,
    id: uuidv4(),
    status: 'unread',
    timestamp: new Date().toISOString(),
  };
  notifications.unshift(newNotif);
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  saveNotificationsToFile();
  return newNotif;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const initialLen = notifications.length;
  notifications = notifications.filter((n) => n.id !== id);
  if (notifications.length !== initialLen) {
    saveNotificationsToFile();
    return true;
  }
  return false;
}

export async function deleteNotificationsBatch(ids: string[]): Promise<number> {
  const idSet = new Set(ids);
  const initialLen = notifications.length;
  notifications = notifications.filter((n) => !idSet.has(n.id));
  const deletedCount = initialLen - notifications.length;
  if (deletedCount > 0) {
    saveNotificationsToFile();
  }
  return deletedCount;
}

export async function getNotifications(): Promise<Notification[]> {
  return [...notifications];
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const notif = notifications.find((n) => n.id === id);
  if (!notif) return null;
  notif.status = 'read';
  saveNotificationsToFile();
  return notif;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  notifications.forEach((n) => {
    n.status = 'read';
  });
  saveNotificationsToFile();
  return true;
}

export async function addCaseNote(id: string, note: string, author: string = 'Municipal Officer'): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  const now = new Date().toISOString();
  if (!issue.internalAdminNotes) issue.internalAdminNotes = [];
  issue.internalAdminNotes.push({
    id: uuidv4(),
    note,
    author,
    timestamp: now,
  });
  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: now,
    action: `Internal note added: "${note.substring(0, 60)}${note.length > 60 ? '...' : ''}"`,
    performedBy: author,
    role: 'Authority',
  });
  issue.updatedAt = now;
  saveIssuesToFile();
  return issue;
}

export async function addPublicUpdate(id: string, update: string, author: string = 'Municipal Authority'): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  const now = new Date().toISOString();
  if (!issue.publicUpdates) issue.publicUpdates = [];
  issue.publicUpdates.push({
    id: uuidv4(),
    update,
    author,
    timestamp: now,
  });
  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: now,
    action: `Public progress update published: "${update.substring(0, 60)}${update.length > 60 ? '...' : ''}"`,
    performedBy: author,
    role: 'Authority',
  });
  issue.updatedAt = now;
  saveIssuesToFile();

  addNotification({
    caseId: issue.caseId || issue.trackingId,
    issueId: issue.id,
    title: `Public Update for Case #${issue.caseId || issue.trackingId}`,
    message: update,
    channel: 'In-App',
    type: 'STATUS_UPDATE',
  });

  return issue;
}

function initSync(): void {
  loadAllData();
  if (issues.length === 0) {
    console.log('No existing issues found. Seeding with realistic civic issues...');
    issues = getSeedData();
    saveIssuesToFile();
  } else {
    // Backfill any missing Digital Case File fields on existing issues
    let changed = false;
    issues = issues.map((i) => {
      const caseId = i.caseId || i.trackingId;
      const subcategory = i.subcategory || deriveSubcategory(i.category, i.title);
      const citizenName = i.citizenName || 'Concerned Citizen';
      const citizenContact = i.citizenContact || i.reporterContact || '+91 98401 23456';
      const internalAdminNotes = i.internalAdminNotes || [];
      const publicUpdates = i.publicUpdates || (i.statusHistory || []).map((sh) => ({
        id: uuidv4(),
        update: sh.note || `Status: ${sh.status}`,
        timestamp: sh.timestamp,
        author: 'Municipal Field Team',
      }));
      const actionHistory = i.actionHistory || (i.statusHistory || []).map((sh) => ({
        timestamp: sh.timestamp,
        action: `Status marked as ${sh.status}: ${sh.note}`,
        performedBy: 'Municipal Authority',
        role: 'Authority',
      }));
      const authenticityCheck = i.authenticityCheck || {
        status: 'Verified',
        isAiGenerated: false,
        confidence: 96,
        reason: 'Realistic on-site civic infrastructure photograph verified',
        checkedAt: i.createdAt,
      };
      const imageUrls = i.imageUrls || (i.imageUrl ? [i.imageUrl] : []);
      if (!i.caseId || !i.subcategory || !i.internalAdminNotes || !i.publicUpdates || !i.actionHistory || !i.authenticityCheck) {
        changed = true;
      }
      return {
        ...i,
        caseId,
        subcategory,
        citizenName,
        citizenContact,
        internalAdminNotes,
        publicUpdates,
        actionHistory,
        authenticityCheck,
        imageUrls,
      };
    });
    if (changed) {
      saveIssuesToFile();
    }
  }

  // Notifications
  if (notifications.length === 0) {
    notifications = getSeedNotifications();
    saveNotificationsToFile();
  }

  // Initialize governance & enforce bounded retention on audit logs
  governanceService.initializeGovernance();
  auditLogs = governanceService.applyAuditLogRetention(auditLogs);
  saveAuditLogsToFile();
}

// Auto-seed on load
initSync();

export async function initialize(): Promise<void> {
  initSync();
}

export function resetToSeedData(): void {
  issues = getSeedData();
  saveIssuesToFile();
  auditLogs = [];
  saveAuditLogsToFile();
  penalties = {};
  savePenaltiesToFile();
}

export function generateTrackingId(): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const issue of issues) {
    const match = issue.trackingId.match(/^CR-\d{4}-(\d{3,})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const next = maxNum + 1;
  return `CR-${year}-${String(next).padStart(3, '0')}`;
}

export async function getAllIssues(filters?: IssueFilters): Promise<Issue[]> {
  // Update dynamic SLA metrics on the fly
  let result = issues.map((issue) => {
    const slaInfo = evaluateSlaStatus(issue);
    return {
      ...issue,
      slaTargetHours: slaInfo.slaTargetHours,
      slaDeadline: slaInfo.slaDeadline,
      slaBreached: slaInfo.slaBreached,
      isEscalated: slaInfo.isEscalated,
      hoursOverdue: slaInfo.hoursOverdue,
    };
  });

  if (filters) {
    if (filters.status) {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.category) {
      result = result.filter((i) => i.category === filters.category);
    }
    if (filters.priority) {
      result = result.filter((i) => i.priority === filters.priority);
    }
    if (filters.department) {
      result = result.filter((i) => i.department === filters.department);
    }
    if (filters.slaBreached === 'true') {
      result = result.filter((i) => i.slaBreached === true);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.trackingId.toLowerCase().includes(q) ||
          i.department.toLowerCase().includes(q)
      );
    }
  }

  result.sort((a, b) => b.priorityScore - a.priorityScore);
  return result;
}

export async function getIssueById(id: string): Promise<Issue | undefined> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return undefined;
  const slaInfo = evaluateSlaStatus(issue);
  return {
    ...issue,
    ...slaInfo,
  };
}

export async function createOrConsolidateIssue(
  data: Omit<Issue, 'id' | 'trackingId' | 'status' | 'statusHistory' | 'upvotes' | 'citizenReportCount' | 'createdAt' | 'updatedAt'>
): Promise<{ consolidated: boolean; issue: Issue; message?: string }> {
  const now = new Date().toISOString();
  const reporter = data.reporterContact || 'Anonymous';

  // Check for duplicates in active issues
  const activeIssues = issues.filter(
    (i) => (i.status === 'Reported' || i.status === 'In Progress') && i.category === data.category
  );

  let duplicateMatch: Issue | undefined;

  for (const candidate of activeIssues) {
    // 1. Check distance if coordinates present
    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      candidate.latitude !== undefined &&
      candidate.longitude !== undefined
    ) {
      const distance = getDistanceMeters(data.latitude, data.longitude, candidate.latitude, candidate.longitude);
      if (distance <= 500) {
        duplicateMatch = candidate;
        break;
      }
    }

    // 2. Check title / description keyword overlap
    if (wordsOverlap(data.title + ' ' + data.description, candidate.title + ' ' + candidate.description)) {
      duplicateMatch = candidate;
      break;
    }
  }

  // If duplicate found, auto-consolidate!
  if (duplicateMatch) {
    duplicateMatch.citizenReportCount = (duplicateMatch.citizenReportCount || 1) + 1;
    duplicateMatch.priorityScore = Math.min(100, duplicateMatch.priorityScore + 5);
    duplicateMatch.upvotes = (duplicateMatch.upvotes || 1) + 1;
    if (!duplicateMatch.linkedReports) duplicateMatch.linkedReports = [];
    duplicateMatch.linkedReports.push({
      description: data.description,
      reporterId: reporter,
      reportedAt: now,
    });
    duplicateMatch.statusHistory.push({
      status: duplicateMatch.status,
      note: `Consolidated report from citizen (${reporter})`,
      timestamp: now,
    });
    duplicateMatch.updatedAt = now;
    saveIssuesToFile();

    return {
      consolidated: true,
      issue: duplicateMatch,
      message: `Consolidated with existing work order ${duplicateMatch.trackingId}`,
    };
  }

  // Not a duplicate: create new issue
  const sla = computeSlaDeadline(data.category, now);

  // Fallback coordinates around city center if missing
  let lat = data.latitude;
  let lng = data.longitude;
  if (lat === undefined || lng === undefined) {
    const seedOffset = (issues.length * 0.0017) % 0.015;
    lat = Number((11.0168 + (Math.sin(issues.length) * seedOffset)).toFixed(6));
    lng = Number((76.9558 + (Math.cos(issues.length) * seedOffset)).toFixed(6));
  }

  const trackingId = generateTrackingId();
  const caseId = trackingId;
  const subcategory = (data as any).subcategory || deriveSubcategory(data.category, data.title);
  const citizenName = (data as any).citizenName || 'Concerned Citizen';
  const citizenContact = (data as any).citizenContact || data.reporterContact || '+91 98401 23456';

  const newIssue: Issue = {
    ...data,
    id: uuidv4(),
    trackingId,
    caseId,
    subcategory,
    citizenName,
    citizenContact,
    latitude: lat,
    longitude: lng,
    status: 'Reported',
    statusHistory: [
      { status: 'Reported', note: `Case registered by citizen (${reporter})`, timestamp: now },
    ],
    internalAdminNotes: [],
    publicUpdates: [
      {
        id: uuidv4(),
        update: `Official Case File #${caseId} registered. Triaged to ${data.department}.`,
        timestamp: now,
        author: 'CivicResolve Municipal AI',
      },
    ],
    actionHistory: [
      {
        timestamp: now,
        action: 'Complaint Submitted & Digital Case File Opened',
        performedBy: citizenName,
        role: 'Citizen Reporter',
      },
      {
        timestamp: now,
        action: `AI Triage: Classified as ${data.category} (${subcategory}) with priority ${data.priority}`,
        performedBy: 'Gemini AI Engine',
        role: 'System AI',
      },
    ],
    upvotes: 1,
    citizenReportCount: 1,
    linkedReports: [],
    slaDeadline: sla.slaDeadline,
    slaTargetHours: sla.targetHours,
    slaBreached: false,
    isEscalated: false,
    hoursOverdue: 0,
    imageUrls: (data as any).imageUrls || (data.imageUrl ? [data.imageUrl] : []),
    authenticityCheck: (data as any).authenticityCheck || {
      status: 'Pending',
      isAiGenerated: false,
      confidence: 0,
      reason: 'Background photo authenticity & AI verification queued',
      checkedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  issues.push(newIssue);
  saveIssuesToFile();

  // Trigger Notifications (In-App, Email, SMS)
  addNotification({
    caseId,
    issueId: newIssue.id,
    title: `Case File #${caseId} Registered`,
    message: `Your report "${data.title}" has been registered and routed to ${data.department}.`,
    channel: 'In-App',
    type: 'SUBMISSION_ACK',
    recipient: citizenName,
  });
  addNotification({
    caseId,
    issueId: newIssue.id,
    title: `[Email Sent] Case Registered: #${caseId}`,
    message: `Official case file created for "${data.title}". SLA target resolution: ${sla.targetHours} hours.`,
    channel: 'Email',
    type: 'SUBMISSION_ACK',
    recipient: citizenContact,
  });
  addNotification({
    caseId,
    issueId: newIssue.id,
    title: `[SMS Queued] Case Registered: #${caseId}`,
    message: `CivicResolve: Complaint #${caseId} registered. Assigned to ${data.department}. Track at civicresolve.gov`,
    channel: 'SMS',
    type: 'SUBMISSION_ACK',
    recipient: citizenContact,
  });

  return { consolidated: false, issue: newIssue };
}

export async function createIssue(
  data: Omit<Issue, 'id' | 'trackingId' | 'status' | 'statusHistory' | 'upvotes' | 'citizenReportCount' | 'createdAt' | 'updatedAt'>
): Promise<Issue> {
  const result = await createOrConsolidateIssue(data);
  return result.issue;
}

export async function updateIssue(
  id: string,
  updates: Partial<Pick<Issue, 'status' | 'department' | 'priority' | 'priorityScore' | 'assignedOfficer'>> & {
    resolutionNote?: string;
    adminEmail?: string;
  }
): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;

  const now = new Date().toISOString();
  const admin = updates.adminEmail || 'admin@civicresolve.gov';
  const cId = issue.caseId || issue.trackingId;

  if (updates.status && updates.status !== issue.status) {
    if (updates.status === 'Resolved') {
      issue.resolvedAt = now;
    } else if (issue.status === 'Resolved') {
      issue.reopenCount = (issue.reopenCount || 0) + 1;
      issue.resolvedAt = undefined;
    }
    issue.statusHistory.push({
      status: updates.status,
      note: updates.resolutionNote || `Status updated to ${updates.status} by ${admin}`,
      timestamp: now,
    });
    addAuditLog({
      adminEmail: admin,
      action: 'STATUS_UPDATED',
      trackingId: issue.trackingId,
      details: `Status transitioned from ${issue.status} to ${updates.status}. Note: ${updates.resolutionNote || 'None'}`,
    });

    if (!issue.actionHistory) issue.actionHistory = [];
    issue.actionHistory.push({
      timestamp: now,
      action: `Status transitioned from ${issue.status} to ${updates.status}: ${updates.resolutionNote || 'Updated'}`,
      performedBy: admin,
      role: 'Authority',
    });

    if (!issue.publicUpdates) issue.publicUpdates = [];
    issue.publicUpdates.push({
      id: uuidv4(),
      update: `Case status updated to ${updates.status}. ${updates.resolutionNote ? `Note: ${updates.resolutionNote}` : ''}`,
      timestamp: now,
      author: admin,
    });

    // In-App Notification
    addNotification({
      caseId: cId,
      issueId: issue.id,
      title: `Case #${cId} Status: ${updates.status}`,
      message: updates.resolutionNote || `Status updated to ${updates.status} by municipal authority.`,
      channel: 'In-App',
      type: updates.status === 'Resolved' ? 'RESOLVED_FEEDBACK' : 'STATUS_UPDATE',
    });

    if (updates.status === 'Resolved') {
      addNotification({
        caseId: cId,
        issueId: issue.id,
        title: `[Email Sent] Case #${cId} Resolved`,
        message: `Work completed for #${cId}. Please rate your satisfaction on the portal.`,
        channel: 'Email',
        type: 'RESOLVED_FEEDBACK',
      });
      addNotification({
        caseId: cId,
        issueId: issue.id,
        title: `[SMS Queued] Case Resolved`,
        message: `CivicResolve: Complaint #${cId} marked resolved. Rate service on portal.`,
        channel: 'SMS',
        type: 'RESOLVED_FEEDBACK',
      });
    }

    issue.status = updates.status;
  }

  if (updates.department !== undefined && updates.department !== issue.department) {
    addAuditLog({
      adminEmail: admin,
      action: 'DEPARTMENT_CHANGED',
      trackingId: issue.trackingId,
      details: `Department reassigned from ${issue.department} to ${updates.department}`,
    });

    if (!issue.actionHistory) issue.actionHistory = [];
    issue.actionHistory.push({
      timestamp: now,
      action: `Department reassigned from ${issue.department} to ${updates.department}`,
      performedBy: admin,
      role: 'Authority',
    });

    addNotification({
      caseId: cId,
      issueId: issue.id,
      title: `Department Reassigned`,
      message: `Case #${cId} routed from ${issue.department} to ${updates.department}.`,
      channel: 'In-App',
      type: 'DEPT_ASSIGNED',
    });

    issue.department = updates.department;
  }

  if (updates.assignedOfficer !== undefined && updates.assignedOfficer !== issue.assignedOfficer) {
    addAuditLog({
      adminEmail: admin,
      action: 'OFFICER_ASSIGNED',
      trackingId: issue.trackingId,
      details: `Field officer assigned: ${updates.assignedOfficer}`,
    });

    if (!issue.actionHistory) issue.actionHistory = [];
    issue.actionHistory.push({
      timestamp: now,
      action: `Field officer assigned: ${updates.assignedOfficer}`,
      performedBy: admin,
      role: 'Authority',
    });

    if (!issue.publicUpdates) issue.publicUpdates = [];
    issue.publicUpdates.push({
      id: uuidv4(),
      update: `Field Officer ${updates.assignedOfficer} assigned to investigate and execute repairs.`,
      timestamp: now,
      author: admin,
    });

    addNotification({
      caseId: cId,
      issueId: issue.id,
      title: `Field Officer Assigned`,
      message: `Officer ${updates.assignedOfficer} dispatched for Case #${cId}.`,
      channel: 'In-App',
      type: 'OFFICER_ASSIGNED',
    });
    addNotification({
      caseId: cId,
      issueId: issue.id,
      title: `[SMS Queued] Officer Dispatched`,
      message: `CivicResolve: Officer ${updates.assignedOfficer} assigned to complaint #${cId}.`,
      channel: 'SMS',
      type: 'OFFICER_ASSIGNED',
    });

    issue.assignedOfficer = updates.assignedOfficer;
  }

  if (updates.priority !== undefined) issue.priority = updates.priority;
  if (updates.priorityScore !== undefined) issue.priorityScore = updates.priorityScore;

  issue.updatedAt = now;
  saveIssuesToFile();
  return issue;
}

export async function deleteIssue(id: string, adminEmail: string = 'admin@civicresolve.gov'): Promise<boolean> {
  const idx = issues.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  const deleted = issues[idx];
  addAuditLog({
    adminEmail,
    action: 'ISSUE_DELETED',
    trackingId: deleted.trackingId,
    details: `Ticket "${deleted.title}" deleted by ${adminEmail}`,
  });
  issues.splice(idx, 1);
  saveIssuesToFile();
  return true;
}

export async function upvoteIssue(id: string, action: 'add' | 'remove' = 'add'): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;

  if (action === 'remove') {
    issue.upvotes = Math.max(0, (issue.upvotes || 1) - 1);
    issue.priorityScore = Math.max(1, issue.priorityScore - 1);
  } else {
    issue.upvotes = (issue.upvotes || 0) + 1;
    issue.priorityScore = Math.min(100, issue.priorityScore + 1);
  }
  issue.updatedAt = new Date().toISOString();
  saveIssuesToFile();
  return issue;
}

export async function addCompletionEvidence(
  id: string,
  evidenceUrl: string,
  adminEmail: string = 'officer@civicresolve.gov'
): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;

  const now = new Date().toISOString();
  issue.completionEvidenceUrl = evidenceUrl;
  issue.status = 'Resolved';
  issue.resolvedAt = now;
  issue.statusHistory.push({
    status: 'Resolved',
    note: `Work verified and completion photo submitted by ${adminEmail}`,
    timestamp: now,
  });
  issue.updatedAt = now;

  addAuditLog({
    adminEmail,
    action: 'EVIDENCE_UPLOADED',
    trackingId: issue.trackingId,
    details: `Completion evidence photo uploaded and ticket resolved by ${adminEmail}`,
  });

  saveIssuesToFile();
  return issue;
}

// Audit Logs
export function addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const newLog: AuditLog = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(newLog);
  auditLogs = governanceService.applyAuditLogRetention(auditLogs);
  saveAuditLogsToFile();
}

export function pruneAuditLogsWithRetention(): void {
  auditLogs = governanceService.applyAuditLogRetention(auditLogs);
  saveAuditLogsToFile();
}

export function getStorageUsage(): {
  auditLogsCount: number;
  auditLogsCap: number;
  loginHistoryCount: number;
  loginHistoryCap: number;
  issuesCount: number;
  notificationsCount: number;
  retentionDays: number;
} {
  const cfg = governanceService.getGovernanceConfig();
  const logins = governanceService.getLoginHistory();
  return {
    auditLogsCount: auditLogs.length,
    auditLogsCap: cfg.maxAuditLogs,
    loginHistoryCount: logins.length,
    loginHistoryCap: cfg.maxLoginHistory,
    issuesCount: issues.length,
    notificationsCount: notifications.length,
    retentionDays: cfg.auditLogRetentionDays,
  };
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogs];
}

// Penalties & False Report Accountability
export function checkReporterRestriction(reporterId: string): { isRestricted: boolean; strikes: number; totalFineInr: number } {
  if (!reporterId || reporterId === 'Anonymous') {
    return { isRestricted: false, strikes: 0, totalFineInr: 0 };
  }
  const record = penalties[reporterId];
  if (!record) {
    return { isRestricted: false, strikes: 0, totalFineInr: 0 };
  }
  return {
    isRestricted: record.isRestricted,
    strikes: record.strikes,
    totalFineInr: record.totalFineInr,
  };
}

export async function flagFalseReport(
  issueId: string,
  reason: string,
  adminEmail: string = 'admin@civicresolve.gov'
): Promise<{ issue: Issue; penalty?: ReporterPenalty } | null> {
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return null;

  const now = new Date().toISOString();
  issue.isFalseReport = true;
  issue.falseReportReason = reason;
  issue.status = 'Rejected';
  issue.statusHistory.push({
    status: 'Rejected',
    note: `Flagged as false/prank report by ${adminEmail}: ${reason}`,
    timestamp: now,
  });
  issue.updatedAt = now;

  let penaltyRecord: ReporterPenalty | undefined;
  const reporterId = issue.reporterContact || 'Anonymous';

  if (reporterId !== 'Anonymous') {
    if (!penalties[reporterId]) {
      penalties[reporterId] = {
        reporterId,
        strikes: 0,
        totalFineInr: 0,
        isRestricted: false,
        history: [],
      };
    }
    const pen = penalties[reporterId];
    pen.strikes += 1;

    let fine = 0;
    if (pen.strikes === 1) {
      fine = 0; // 1st: Warning
    } else if (pen.strikes === 2) {
      fine = 500; // 2nd: ₹500
    } else {
      fine = 1500; // 3rd+: ₹1,500 and restricted
      pen.isRestricted = true;
    }
    pen.totalFineInr += fine;
    pen.history.push({
      timestamp: now,
      reason,
      fineInr: fine,
      trackingId: issue.trackingId,
    });
    penaltyRecord = pen;
    savePenaltiesToFile();
  }

  addAuditLog({
    adminEmail,
    action: 'FALSE_REPORT_FLAGGED',
    trackingId: issue.trackingId,
    details: `Flagged as false report (${reason}). Reporter: ${reporterId}. Strikes: ${penaltyRecord?.strikes || 1}`,
  });

  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: now,
    action: `Flagged as false report: "${reason}". Status marked as Rejected.`,
    performedBy: adminEmail,
    role: 'Authority',
  });

  saveIssuesToFile();
  return { issue, penalty: penaltyRecord };
}

// Rate Resolved Issue
export async function rateIssue(
  id: string,
  rating: number,
  feedback?: string
): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
  issue.citizenRating = clampedRating;
  if (feedback) {
    issue.citizenFeedback = feedback.trim();
  }
  issue.updatedAt = new Date().toISOString();
  addAuditLog({
    adminEmail: 'citizen@civicresolve.gov',
    action: 'CITIZEN_RATED',
    trackingId: issue.trackingId,
    details: `Citizen submitted resolution rating: ${clampedRating}★${feedback ? ` ("${feedback.trim()}")` : ''}`,
  });
  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: issue.updatedAt,
    action: `Citizen satisfaction rating submitted: ${clampedRating}★${feedback ? ` - "${feedback.trim()}"` : ''}`,
    performedBy: issue.citizenName || 'Citizen',
    role: 'Citizen',
  });
  saveIssuesToFile();
  return issue;
}

// Reopen Resolved Issue
export async function reopenIssue(
  id: string,
  reason: string = 'Issue not properly resolved on the ground'
): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  const now = new Date().toISOString();
  const previousStatus = issue.status;
  issue.status = 'Reported';
  issue.reopenCount = (issue.reopenCount || 0) + 1;
  issue.resolvedAt = undefined;
  issue.statusHistory.push({
    status: 'Reported',
    note: `Status changed to Reported (Issue reopened by citizen: ${reason})`,
    timestamp: now,
  });
  issue.updatedAt = now;
  addAuditLog({
    adminEmail: 'citizen@civicresolve.gov',
    action: 'ISSUE_REOPENED',
    trackingId: issue.trackingId,
    details: `Issue reopened by citizen from ${previousStatus} to Reported. Reason: ${reason}`,
  });
  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: now,
    action: `Case reopened by citizen: "${reason}"`,
    performedBy: issue.citizenName || 'Citizen',
    role: 'Citizen',
  });
  saveIssuesToFile();
  return issue;
}

// Department Analytics
export function getDepartmentAnalytics(): DepartmentMetric[] {
  const DEPARTMENTS = [
    'Public Works Department',
    'Water Supply Department',
    'Electricity Department',
    'Sanitation Department',
    'Municipal Administration',
  ];

  const map: Record<
    string,
    {
      total: number;
      reported: number;
      inProgress: number;
      resolved: number;
      scoreSum: number;
      falseCount: number;
      totalResolutionHours: number;
      resolvedWithTimeCount: number;
      overdueCount: number;
      ratingSum: number;
      ratingCount: number;
      reopenedCount: number;
    }
  > = {};

  for (const d of DEPARTMENTS) {
    map[d] = {
      total: 0,
      reported: 0,
      inProgress: 0,
      resolved: 0,
      scoreSum: 0,
      falseCount: 0,
      totalResolutionHours: 0,
      resolvedWithTimeCount: 0,
      overdueCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      reopenedCount: 0,
    };
  }

  for (const issue of issues) {
    const dept = DEPARTMENTS.includes(issue.department) ? issue.department : 'Municipal Administration';
    const entry = map[dept];
    entry.total += 1;
    if (issue.status === 'Reported') entry.reported += 1;
    if (issue.status === 'In Progress') entry.inProgress += 1;
    if (issue.status === 'Resolved') {
      entry.resolved += 1;
      if (issue.resolvedAt && issue.createdAt) {
        const createdMs = new Date(issue.createdAt).getTime();
        const resolvedMs = new Date(issue.resolvedAt).getTime();
        const diffHours = Math.max(1, (resolvedMs - createdMs) / 3600000);
        entry.totalResolutionHours += diffHours;
        entry.resolvedWithTimeCount += 1;
      }
    }
    if (issue.isFalseReport || issue.status === 'Rejected') entry.falseCount += 1;
    entry.scoreSum += issue.priorityScore;

    // Check overdue on active issues
    if (issue.status !== 'Resolved' && issue.status !== 'Rejected') {
      const sla = evaluateSlaStatus(issue);
      if (sla.slaBreached) {
        entry.overdueCount += 1;
      }
    }

    // Ratings
    if (issue.citizenRating !== undefined && issue.citizenRating > 0) {
      entry.ratingSum += issue.citizenRating;
      entry.ratingCount += 1;
    }

    // Reopened
    entry.reopenedCount += issue.reopenCount || 0;
  }

  const results = DEPARTMENTS.map((dept) => {
    const data = map[dept];
    const resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
    const avgResolutionHours =
      data.resolvedWithTimeCount > 0
        ? Number((data.totalResolutionHours / data.resolvedWithTimeCount).toFixed(1))
        : 24;
    const avgCitizenSatisfaction =
      data.ratingCount > 0 ? Number((data.ratingSum / data.ratingCount).toFixed(1)) : 3.5;
    const overdueCount = data.overdueCount;
    const reopenedCount = data.reopenedCount;

    // Weighted Score:
    // 1. Resolution Rate (35 pts): (resolutionRate / 100) * 35
    const resRatePts = (resolutionRate / 100) * 35;
    // 2. Citizen Satisfaction (25 pts): (avgCitizenSatisfaction / 5) * 25
    const satPts = (avgCitizenSatisfaction / 5) * 25;
    // 3. Resolution Speed (20 pts): 20 pts if <= 24h, down to 0 at >= 96h (default 12 if none resolved)
    let speedPts = 12;
    if (data.resolvedWithTimeCount > 0) {
      if (avgResolutionHours <= 24) {
        speedPts = 20;
      } else if (avgResolutionHours >= 96) {
        speedPts = 0;
      } else {
        speedPts = 20 - ((avgResolutionHours - 24) / 72) * 20;
      }
    }
    // 4. SLA Compliance / Overdue Penalty (10 pts): Math.max(0, 10 - overdueCount * 3)
    const slaPts = Math.max(0, 10 - overdueCount * 3);
    // 5. Quality / Reopen Penalty (10 pts): Math.max(0, 10 - reopenedCount * 4)
    const reopenPts = Math.max(0, 10 - reopenedCount * 4);

    const rawTotal = resRatePts + satPts + speedPts + slaPts + reopenPts;
    const performanceScore = Math.round(Math.min(100, Math.max(0, rawTotal)));
    const grade: 'A' | 'B' | 'C' | 'D' =
      performanceScore >= 85 ? 'A' : performanceScore >= 70 ? 'B' : performanceScore >= 55 ? 'C' : 'D';

    return {
      department: dept,
      totalAssigned: data.total,
      reported: data.reported,
      inProgress: data.inProgress,
      resolved: data.resolved,
      resolutionRate,
      avgPriorityScore: data.total > 0 ? Math.round(data.scoreSum / data.total) : 0,
      falseReports: data.falseCount,
      avgResolutionHours,
      overdueCount,
      avgCitizenSatisfaction,
      reopenedCount,
      performanceScore,
      grade,
    };
  });

  // Rank from highest to lowest performance score
  results.sort((a, b) => b.performanceScore - a.performanceScore);
  return results;
}

// Overall Stats
export async function getStats(): Promise<{
  total: number;
  byStatus: { Reported: number; InProgress: number; Resolved: number; Rejected: number };
  resolutionRate: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  averagePriorityScore: number;
  departments: DepartmentMetric[];
}> {
  const total = issues.length;
  const reported = issues.filter((i) => i.status === 'Reported').length;
  const inProgress = issues.filter((i) => i.status === 'In Progress').length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;
  const rejected = issues.filter((i) => i.status === 'Rejected' || i.isFalseReport).length;

  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalScore = 0;

  for (const issue of issues) {
    byPriority[issue.priority] = (byPriority[issue.priority] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    totalScore += issue.priorityScore;
  }

  return {
    total,
    byStatus: { Reported: reported, InProgress: inProgress, Resolved: resolved, Rejected: rejected },
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    byPriority,
    byCategory,
    averagePriorityScore: total > 0 ? Math.round(totalScore / total) : 0,
    departments: getDepartmentAnalytics(),
  };
}

// Background Photo Authenticity Update
export async function updateAuthenticityCheck(
  issueId: string,
  check: {
    status: 'Pending' | 'Verified' | 'Suspected Fake';
    isAiGenerated: boolean;
    confidence: number;
    reason: string;
    checkedAt: string;
  }
): Promise<Issue | null> {
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return null;

  issue.authenticityCheck = check;
  issue.updatedAt = new Date().toISOString();

  if (!issue.actionHistory) issue.actionHistory = [];
  issue.actionHistory.push({
    timestamp: check.checkedAt,
    action: `AI Photo Authenticity Check: ${check.status} (${check.reason})`,
    performedBy: 'Gemini Vision AI Engine',
    role: 'System AI',
  });

  if (check.status === 'Suspected Fake') {
    const penalizedReporter = issue.reporterContact || issue.citizenContact || '';
    citizenAuthService.deductCivicScore(penalizedReporter, 25);
    addAuditLog({
      adminEmail: 'ai-authenticity@civicresolve.gov',
      action: 'AUTHENTICITY_FLAGGED',
      trackingId: issue.trackingId,
      details: `Suspected fake/AI-generated photo detected (${check.reason}). Penalty of -25 CivicScore applied to reporter "${penalizedReporter}".`,
    });
  }

  saveIssuesToFile();
  return issue;
}
