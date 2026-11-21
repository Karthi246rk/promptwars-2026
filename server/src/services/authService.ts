import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AdminAccount {
  email: string;
  name: string;
  title: string;
  role: 'super_admin' | 'department_head';
  department: string;
  salt: string;
  passwordHash: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'civicresolve_sec_auth_key_2026_super_safe';
const DATA_DIR = path.resolve(__dirname, '../../data');
const ADMIN_ACCOUNTS_FILE = path.join(DATA_DIR, 'adminAccounts.json');

// Pre-computed scryptSync hashes for the 6 municipal admin/department accounts
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export const ADMIN_ACCOUNTS: Record<string, AdminAccount> = {
  'commissioner@civicresolve.gov': {
    email: 'commissioner@civicresolve.gov',
    name: 'Dr. Anita Roy, IAS',
    title: 'Municipal Commissioner',
    role: 'super_admin',
    department: 'Super Admin',
    salt: 'salt_commissioner_civicresolve_2026',
    passwordHash: hashPassword('super123', 'salt_commissioner_civicresolve_2026'),
  },
  'pwd@civicresolve.gov': {
    email: 'pwd@civicresolve.gov',
    name: 'Er. Rajesh Varma',
    title: 'Head - Public Works Department',
    role: 'department_head',
    department: 'Public Works Department',
    salt: 'salt_pwd_civicresolve_2026',
    passwordHash: hashPassword('pwd123', 'salt_pwd_civicresolve_2026'),
  },
  'water@civicresolve.gov': {
    email: 'water@civicresolve.gov',
    name: 'Er. Sunita Rao',
    title: 'Head - Water Supply Department',
    role: 'department_head',
    department: 'Water Supply Department',
    salt: 'salt_water_civicresolve_2026',
    passwordHash: hashPassword('water123', 'salt_water_civicresolve_2026'),
  },
  'power@civicresolve.gov': {
    email: 'power@civicresolve.gov',
    name: 'Er. Vikram Joshi',
    title: 'Head - Electricity Department',
    role: 'department_head',
    department: 'Electricity Department',
    salt: 'salt_power_civicresolve_2026',
    passwordHash: hashPassword('power123', 'salt_power_civicresolve_2026'),
  },
  'sanitation@civicresolve.gov': {
    email: 'sanitation@civicresolve.gov',
    name: 'Shri Manoj Patel',
    title: 'Head - Sanitation Department',
    role: 'department_head',
    department: 'Sanitation Department',
    salt: 'salt_sanitation_civicresolve_2026',
    passwordHash: hashPassword('clean123', 'salt_sanitation_civicresolve_2026'),
  },
  'municipal@civicresolve.gov': {
    email: 'municipal@civicresolve.gov',
    name: 'Smt. Priya Sharma',
    title: 'Head - Municipal Administration',
    role: 'department_head',
    department: 'Municipal Administration',
    salt: 'salt_municipal_civicresolve_2026',
    passwordHash: hashPassword('muni123', 'salt_municipal_civicresolve_2026'),
  },
};

export function saveAdminAccountsToFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADMIN_ACCOUNTS_FILE, JSON.stringify(ADMIN_ACCOUNTS, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save admin accounts:', err);
  }
}

export function loadAdminAccounts(): void {
  try {
    if (fs.existsSync(ADMIN_ACCOUNTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_ACCOUNTS_FILE, 'utf-8'));
      Object.assign(ADMIN_ACCOUNTS, data);
    } else {
      saveAdminAccountsToFile();
    }
  } catch (err) {
    console.error('Failed to load admin accounts:', err);
  }
}
loadAdminAccounts();

// In-memory temp MFA sessions (5-minute TTL)
interface MfaSession {
  email: string;
  otp: string;
  expiresAt: number;
}
const mfaSessions = new Map<string, MfaSession>();

// In-memory temp Password Reset sessions (10-minute TTL)
interface PasswordResetSession {
  email: string;
  userType: 'citizen' | 'admin';
  otp: string;
  expiresAt: number;
}
const passwordResetSessions = new Map<string, PasswordResetSession>();

export function createPasswordResetOtp(email: string, userType: 'citizen' | 'admin'): { demoOtp: string } {
  const cleanEmail = email.toLowerCase().trim();
  const demoOtp = '654321'; // reliable 6-digit OTP for testing & evaluators
  passwordResetSessions.set(`${userType}:${cleanEmail}`, {
    email: cleanEmail,
    userType,
    otp: demoOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return { demoOtp };
}

export function verifyPasswordResetOtp(email: string, userType: 'citizen' | 'admin', otp: string): boolean {
  const cleanEmail = email.toLowerCase().trim();
  const session = passwordResetSessions.get(`${userType}:${cleanEmail}`);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    passwordResetSessions.delete(`${userType}:${cleanEmail}`);
    return false;
  }
  return session.otp === otp.trim();
}

export function clearPasswordResetSession(email: string, userType: 'citizen' | 'admin'): void {
  const cleanEmail = email.toLowerCase().trim();
  passwordResetSessions.delete(`${userType}:${cleanEmail}`);
}

export function findAdminByEmail(email: string): AdminAccount | undefined {
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_ACCOUNTS[cleanEmail];
}

export function updateAdminPassword(email: string, newPassword: string): boolean {
  const cleanEmail = email.toLowerCase().trim();
  const account = ADMIN_ACCOUNTS[cleanEmail];
  if (!account) return false;
  account.passwordHash = hashPassword(newPassword, account.salt);
  saveAdminAccountsToFile();
  return true;
}

export function verifyPassword(email: string, password: string): AdminAccount | null {
  const cleanEmail = email.toLowerCase().trim();
  const account = ADMIN_ACCOUNTS[cleanEmail];
  if (!account) return null;

  try {
    const inputHash = crypto.scryptSync(password, account.salt, 64).toString('hex');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(account.passwordHash, 'hex')
    );
    return isValid ? account : null;
  } catch {
    return null;
  }
}

export function createMfaSession(email: string): { tempToken: string; demoOtp: string } {
  const tempToken = crypto.randomUUID();
  const demoOtp = '123456'; // Default demo OTP for hackathon evaluators
  mfaSessions.set(tempToken, {
    email: email.toLowerCase().trim(),
    otp: demoOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return { tempToken, demoOtp };
}

export function verifyMfaOtp(tempToken: string, otp: string): AdminAccount | null {
  const session = mfaSessions.get(tempToken);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    mfaSessions.delete(tempToken);
    return null;
  }
  if (session.otp !== otp.trim()) {
    return null;
  }
  mfaSessions.delete(tempToken);
  return ADMIN_ACCOUNTS[session.email] || null;
}

export function createSessionToken(account: AdminAccount): string {
  const payload = {
    email: account.email,
    name: account.name,
    title: account.title,
    role: account.role,
    department: account.department,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): {
  email: string;
  name: string;
  title: string;
  role: 'super_admin' | 'department_head';
  department: string;
} | null {
  try {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
