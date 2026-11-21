import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import * as authService from '../services/authService';

describe('authService Unit Tests', () => {
  before(() => {
    authService.updateAdminPassword('commissioner@civicresolve.gov', 'super123');
    authService.updateAdminPassword('pwd@civicresolve.gov', 'pwd123');
    authService.updateAdminPassword('water@civicresolve.gov', 'water123');
    authService.updateAdminPassword('power@civicresolve.gov', 'power123');
    authService.updateAdminPassword('sanitation@civicresolve.gov', 'clean123');
    authService.updateAdminPassword('municipal@civicresolve.gov', 'muni123');
  });

  it('pre-seeds all 6 municipal administration and department accounts', () => {
    const emails = Object.keys(authService.ADMIN_ACCOUNTS);
    assert.strictEqual(emails.length, 6);
    assert.ok(emails.includes('commissioner@civicresolve.gov'));
    assert.ok(emails.includes('pwd@civicresolve.gov'));
    assert.ok(emails.includes('water@civicresolve.gov'));
    assert.ok(emails.includes('power@civicresolve.gov'));
    assert.ok(emails.includes('sanitation@civicresolve.gov'));
    assert.ok(emails.includes('municipal@civicresolve.gov'));

    // Check roles
    assert.strictEqual(authService.ADMIN_ACCOUNTS['commissioner@civicresolve.gov'].role, 'super_admin');
    assert.strictEqual(authService.ADMIN_ACCOUNTS['pwd@civicresolve.gov'].role, 'department_head');
  });

  it('verifies valid password for all 6 accounts', () => {
    const creds = [
      { email: 'commissioner@civicresolve.gov', pass: 'super123' },
      { email: 'pwd@civicresolve.gov', pass: 'pwd123' },
      { email: 'water@civicresolve.gov', pass: 'water123' },
      { email: 'power@civicresolve.gov', pass: 'power123' },
      { email: 'sanitation@civicresolve.gov', pass: 'clean123' },
      { email: 'municipal@civicresolve.gov', pass: 'muni123' },
    ];

    for (const cred of creds) {
      const account = authService.verifyPassword(cred.email, cred.pass);
      assert.ok(account, `Expected valid login for ${cred.email}`);
      assert.strictEqual(account?.email, cred.email);
    }
  });

  it('rejects invalid password and unknown email', () => {
    assert.strictEqual(authService.verifyPassword('commissioner@civicresolve.gov', 'wrongpassword'), null);
    assert.strictEqual(authService.verifyPassword('unknown@civicresolve.gov', 'super123'), null);
  });

  it('handles case-insensitive and trimmed email lookup', () => {
    const account = authService.verifyPassword('  COMMISSIONER@civicresolve.gov  ', 'super123');
    assert.ok(account);
    assert.strictEqual(account?.email, 'commissioner@civicresolve.gov');
  });

  it('generates 2-step MFA sessions and validates OTPs', () => {
    const email = 'commissioner@civicresolve.gov';
    const { tempToken, demoOtp } = authService.createMfaSession(email);
    assert.ok(tempToken);
    assert.strictEqual(demoOtp, '123456');

    // Reject wrong OTP
    assert.strictEqual(authService.verifyMfaOtp(tempToken, '000000'), null);

    // Accept demo OTP 123456
    const verified = authService.verifyMfaOtp(tempToken, '123456');
    assert.ok(verified);
    assert.strictEqual(verified?.email, email);

    // Single-use token: cannot verify again
    assert.strictEqual(authService.verifyMfaOtp(tempToken, '123456'), null);
  });

  it('creates and verifies signed session tokens', () => {
    const account = authService.ADMIN_ACCOUNTS['commissioner@civicresolve.gov'];
    const token = authService.createSessionToken(account);
    assert.ok(token);

    const verified = authService.verifySessionToken(token);
    assert.ok(verified);
    assert.strictEqual(verified?.email, account.email);
    assert.strictEqual(verified?.role, 'super_admin');

    // Reject tampered token
    assert.strictEqual(authService.verifySessionToken(token + 'tampered'), null);
  });

  it('generates and verifies password reset OTPs', () => {
    const email = 'commissioner@civicresolve.gov';
    const { demoOtp } = authService.createPasswordResetOtp(email, 'admin');
    assert.strictEqual(demoOtp, '654321');

    // Reject invalid OTP
    assert.strictEqual(authService.verifyPasswordResetOtp(email, 'admin', '999999'), false);

    // Verify valid demo OTP
    assert.strictEqual(authService.verifyPasswordResetOtp(email, 'admin', '654321'), true);

    // Clear session
    authService.clearPasswordResetSession(email, 'admin');
    assert.strictEqual(authService.verifyPasswordResetOtp(email, 'admin', '654321'), false);
  });

  it('updates admin password hash and verifies new credentials', () => {
    const email = 'municipal@civicresolve.gov';
    const newPass = 'brandNewPassword2026';
    const updated = authService.updateAdminPassword(email, newPass);
    assert.strictEqual(updated, true);

    const verifyNew = authService.verifyPassword(email, newPass);
    assert.ok(verifyNew);

    // Reset back to original
    authService.updateAdminPassword(email, 'muni123');
    assert.ok(authService.verifyPassword(email, 'muni123'));
  });

  it('findAdminByEmail returns correct account or undefined', () => {
    const admin = authService.findAdminByEmail('pwd@civicresolve.gov');
    assert.ok(admin);
    assert.strictEqual(admin?.department, 'Public Works Department');

    const notFound = authService.findAdminByEmail('nonexistent@domain.com');
    assert.strictEqual(notFound, undefined);
  });
});
