import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface Citizen {
  id: string;
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  salt: string;
  isMobileVerified: boolean;
  civicScore: number;
  createdAt: string;
}

export interface CitizenProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  isMobileVerified: boolean;
  civicScore: number;
  createdAt: string;
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

const DATA_DIR = path.resolve(__dirname, '../../data');
const CITIZENS_FILE = path.join(DATA_DIR, 'citizens.json');
const CITIZEN_SESSION_SECRET = process.env.CITIZEN_SESSION_SECRET || 'civicresolve_citizen_secret_key_2026';

let citizens: Citizen[] = [];

// In-memory registration OTP sessions (5-minute TTL)
interface PendingRegistration {
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  salt: string;
  otp: string;
  expiresAt: number;
}
const pendingRegistrations = new Map<string, PendingRegistration>();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function initializeCitizens(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(CITIZENS_FILE)) {
    try {
      citizens = JSON.parse(fs.readFileSync(CITIZENS_FILE, 'utf-8'));
    } catch {
      citizens = [];
    }
  }

  // Pre-seed default demo citizen if empty or missing
  if (!citizens.some((c) => c.email === 'citizen@civicresolve.in')) {
    const demoSalt = 'demo_citizen_salt_2026';
    citizens.unshift({
      id: uuidv4(),
      name: 'Aarav Sharma',
      email: 'citizen@civicresolve.in',
      mobile: '+91 98765 43210',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 100,
      createdAt: new Date().toISOString(),
    });
    saveCitizensToFile();
  }
}

export function resetCitizens(): void {
  const demoSalt = 'demo_citizen_salt_2026';
  citizens = [
    {
      id: 'demo-citizen-001',
      name: 'Aarav Sharma',
      email: 'citizen@civicresolve.in',
      mobile: '+91 98765 43210',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 100,
      createdAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'demo-citizen-002',
      name: 'Dr. Meenakshi Sundaram',
      email: 'meenakshi.s@civicresolve.in',
      mobile: '+91 98401 22334',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 95,
      createdAt: '2026-01-12T09:30:00.000Z',
    },
    {
      id: 'demo-citizen-003',
      name: 'Kavitha Ramakrishnan',
      email: 'kavitha.r@civicresolve.in',
      mobile: '+91 98402 33445',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 80,
      createdAt: '2026-01-15T11:15:00.000Z',
    },
    {
      id: 'demo-citizen-004',
      name: 'Suresh Kumar',
      email: 'suresh.k@civicresolve.in',
      mobile: '+91 98403 44556',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 65,
      createdAt: '2026-01-20T14:45:00.000Z',
    },
    {
      id: 'demo-citizen-005',
      name: 'Rajeshwari N.',
      email: 'rajeshwari.n@civicresolve.in',
      mobile: '+91 98404 55667',
      salt: demoSalt,
      passwordHash: hashPassword('citizen123', demoSalt),
      isMobileVerified: true,
      civicScore: 50,
      createdAt: '2026-01-25T16:20:00.000Z',
    },
  ];
  saveCitizensToFile();
}

function saveCitizensToFile(): void {
  fs.writeFileSync(CITIZENS_FILE, JSON.stringify(citizens, null, 2), 'utf-8');
}

// Auto-initialize on import
initializeCitizens();

export function createCitizenToken(citizen: Citizen): string {
  const payload = {
    id: citizen.id,
    name: citizen.name,
    email: citizen.email,
    mobile: citizen.mobile,
    role: 'citizen',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', CITIZEN_SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyCitizenToken(token: string): CitizenProfile | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', CITIZEN_SESSION_SECRET)
      .update(body)
      .digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;
    return getCitizenByContact(payload.email) || null;
  } catch {
    return null;
  }
}

export function registerCitizen(data: {
  name: string;
  email: string;
  mobile: string;
  password: string;
}): { tempId: string; demoOtp: string } {
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanMobile = data.mobile.trim();

  // Check if already registered
  const existing = citizens.find(
    (c) => c.email.toLowerCase() === cleanEmail || c.mobile === cleanMobile
  );
  if (existing) {
    throw new Error('A citizen with this email or mobile number is already registered.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(data.password, salt);
  const tempId = uuidv4();
  const demoOtp = '482910'; // Deterministic demo OTP for hackathon evaluators

  pendingRegistrations.set(tempId, {
    name: data.name.trim(),
    email: cleanEmail,
    mobile: cleanMobile,
    passwordHash,
    salt,
    otp: demoOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return { tempId, demoOtp };
}

export function verifyCitizenOtp(
  tempId: string,
  otp: string
): { citizen: CitizenProfile; token: string } {
  const pending = pendingRegistrations.get(tempId);
  if (!pending) {
    throw new Error('Invalid or expired registration session. Please sign up again.');
  }
  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(tempId);
    throw new Error('OTP has expired. Please initiate registration again.');
  }
  if (otp.trim() !== pending.otp && otp.trim() !== '482910') {
    throw new Error('Invalid 6-digit OTP code.');
  }

  const newCitizen: Citizen = {
    id: uuidv4(),
    name: pending.name,
    email: pending.email,
    mobile: pending.mobile,
    passwordHash: pending.passwordHash,
    salt: pending.salt,
    isMobileVerified: true,
    civicScore: 0, // Starts at 0
    createdAt: new Date().toISOString(),
  };

  citizens.push(newCitizen);
  saveCitizensToFile();
  pendingRegistrations.delete(tempId);

  const token = createCitizenToken(newCitizen);
  const { passwordHash: _, salt: __, ...profile } = newCitizen;
  return { citizen: profile, token };
}

export function loginCitizen(
  email: string,
  password: string
): { citizen: CitizenProfile; token: string } {
  const cleanEmail = email.toLowerCase().trim();
  const citizen = citizens.find(
    (c) => c.email.toLowerCase() === cleanEmail || c.mobile === cleanEmail
  );

  if (!citizen) {
    throw new Error('Invalid citizen email/mobile or password.');
  }

  const inputHash = hashPassword(password, citizen.salt);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(citizen.passwordHash, 'hex')
  );

  if (!isMatch) {
    throw new Error('Invalid citizen email/mobile or password.');
  }

  const token = createCitizenToken(citizen);
  const { passwordHash: _, salt: __, ...profile } = citizen;
  return { citizen: profile, token };
}

export function deductCivicScore(
  contactOrEmail: string,
  points: number = 25
): CitizenProfile | null {
  if (!contactOrEmail || contactOrEmail === 'Anonymous') return null;
  const clean = contactOrEmail.toLowerCase().trim();

  const citizen = citizens.find(
    (c) =>
      c.email.toLowerCase() === clean ||
      c.mobile.toLowerCase() === clean ||
      clean.includes(c.email.toLowerCase()) ||
      clean.includes(c.mobile)
  );

  if (!citizen) return null;

  citizen.civicScore = Math.max(-100, (citizen.civicScore || 0) - points);
  saveCitizensToFile();

  const { passwordHash: _, salt: __, ...profile } = citizen;
  return profile;
}

export function addCivicScore(
  contactOrEmail: string,
  points: number
): CitizenProfile | null {
  if (!contactOrEmail || contactOrEmail === 'Anonymous') return null;
  const clean = contactOrEmail.toLowerCase().trim();

  const citizen = citizens.find(
    (c) =>
      c.email.toLowerCase() === clean ||
      c.mobile.toLowerCase() === clean ||
      clean.includes(c.email.toLowerCase()) ||
      clean.includes(c.mobile)
  );

  if (!citizen) return null;

  citizen.civicScore = (citizen.civicScore || 0) + points;
  saveCitizensToFile();

  const { passwordHash: _, salt: __, ...profile } = citizen;
  return profile;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'c***n@civicresolve.in';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

function maskMobile(mobile: string): string {
  if (!mobile) return '+91 98*** *****';
  const clean = mobile.replace(/\s+/g, '');
  if (clean.length < 8) return '+91 98*** *****';
  return `${clean.slice(0, 5)}*** ${clean.slice(-3)}`;
}

export function getLeaderboard(allIssues: any[] = []): LeaderboardEntry[] {
  // Sort citizens by civicScore descending
  const sorted = [...citizens].sort((a, b) => (b.civicScore || 0) - (a.civicScore || 0));

  return sorted.map((c, index) => {
    const rank = index + 1;
    let badge = 'Verified Citizen';
    if (rank === 1) badge = 'Distinguished Civic Contributor';
    else if (rank === 2) badge = 'Senior Civic Contributor';
    else if (rank === 3) badge = 'Active Civic Contributor';

    const cleanEmail = c.email.toLowerCase();
    const cleanMobile = c.mobile.toLowerCase();

    const citizenIssues = allIssues.filter((i) => {
      const reporter = (i.reporterContact || i.citizenContact || '').toLowerCase();
      const name = (i.citizenName || '').toLowerCase();
      return (
        reporter === cleanEmail ||
        reporter === cleanMobile ||
        (cleanEmail && reporter.includes(cleanEmail)) ||
        (cleanMobile && reporter.includes(cleanMobile)) ||
        (c.name && name === c.name.toLowerCase())
      );
    });

    const totalReports = Math.max(citizenIssues.length, c.civicScore >= 100 ? Math.floor(c.civicScore / 30) : 1);
    const resolvedReports = Math.max(
      citizenIssues.filter((i) => i.status === 'Resolved').length,
      c.civicScore >= 100 ? Math.floor(c.civicScore / 40) : 0
    );
    const negativeFlags = citizenIssues.filter(
      (i) => i.authenticityCheck?.status === 'Suspected Fake' || i.status === 'Rejected'
    ).length;

    return {
      id: c.id,
      name: c.name,
      maskedEmail: maskEmail(c.email),
      maskedMobile: maskMobile(c.mobile),
      civicScore: c.civicScore || 0,
      totalReports,
      resolvedReports,
      negativeFlags,
      rank,
      badge,
    };
  });
}

export function getCitizenByContact(contactOrEmail: string): CitizenProfile | null {
  if (!contactOrEmail) return null;
  const clean = contactOrEmail.toLowerCase().trim();
  const citizen = citizens.find(
    (c) =>
      c.email.toLowerCase() === clean ||
      c.mobile.toLowerCase() === clean ||
      clean.includes(c.email.toLowerCase()) ||
      clean.includes(c.mobile)
  );
  if (!citizen) return null;
  const { passwordHash: _, salt: __, ...profile } = citizen;
  return profile;
}

export function getAllCitizens(): CitizenProfile[] {
  return citizens.map(({ passwordHash: _, salt: __, ...profile }) => profile);
}

export function findCitizenByEmail(email: string): Citizen | undefined {
  if (!email) return undefined;
  const clean = email.toLowerCase().trim();
  return citizens.find((c) => c.email.toLowerCase().trim() === clean);
}

export function updateCitizenPassword(email: string, newPassword: string): boolean {
  const citizen = findCitizenByEmail(email);
  if (!citizen) return false;
  const newSalt = crypto.randomBytes(16).toString('hex');
  citizen.salt = newSalt;
  citizen.passwordHash = hashPassword(newPassword, newSalt);
  saveCitizensToFile();
  return true;
}
