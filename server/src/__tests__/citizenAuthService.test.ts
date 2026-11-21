import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import * as citizenAuthService from '../services/citizenAuthService';

describe('citizenAuthService Unit Tests', () => {
  before(() => {
    citizenAuthService.initializeCitizens();
  });

  it('onboards pre-seeded demo citizen account', () => {
    const profile = citizenAuthService.getCitizenByContact('citizen@civicresolve.in');
    assert.ok(profile);
    assert.strictEqual(profile?.email, 'citizen@civicresolve.in');
    assert.strictEqual(profile?.isMobileVerified, true);
  });

  it('registers a new citizen and generates demo OTP', () => {
    const email = `newcitizen_${Date.now()}@example.com`;
    const res = citizenAuthService.registerCitizen({
      name: 'Rohan Mehra',
      email,
      mobile: '+91 91234 56789',
      password: 'mypassword123',
    });

    assert.ok(res.tempId);
    assert.strictEqual(res.demoOtp, '482910');

    // Duplicate email registration fails
    assert.throws(() => {
      citizenAuthService.registerCitizen({
        name: 'Aarav Clone',
        email: 'citizen@civicresolve.in',
        mobile: '+91 99999 88888',
        password: 'password123',
      });
    }, /already registered/);
  });

  it('verifies citizen OTP and activates account', () => {
    const email = `verify_${Date.now()}@example.com`;
    const reg = citizenAuthService.registerCitizen({
      name: 'Priya Verma',
      email,
      mobile: '+91 98888 77777',
      password: 'password123',
    });

    // Invalid OTP fails
    assert.throws(() => {
      citizenAuthService.verifyCitizenOtp(reg.tempId, '000000');
    }, /Invalid 6-digit OTP/);

    // Valid OTP succeeds
    const verified = citizenAuthService.verifyCitizenOtp(reg.tempId, '482910');
    assert.ok(verified.token);
    assert.strictEqual(verified.citizen.email, email);
    assert.strictEqual(verified.citizen.isMobileVerified, true);
    assert.strictEqual(verified.citizen.civicScore, 0);
  });

  it('authenticates citizen with valid credentials', () => {
    const loginRes = citizenAuthService.loginCitizen('citizen@civicresolve.in', 'citizen123');
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.citizen.email, 'citizen@civicresolve.in');

    // Wrong password throws
    assert.throws(() => {
      citizenAuthService.loginCitizen('citizen@civicresolve.in', 'wrongpassword');
    }, /Invalid.*password/);

    // Non-existent email throws
    assert.throws(() => {
      citizenAuthService.loginCitizen('doesnotexist@nowhere.com', 'somepass');
    }, /Invalid.*password/);
  });

  it('verifies citizen JWT-like session tokens and rejects tampering', () => {
    const loginRes = citizenAuthService.loginCitizen('citizen@civicresolve.in', 'citizen123');
    const verified = citizenAuthService.verifyCitizenToken(loginRes.token);
    assert.ok(verified);
    assert.strictEqual(verified?.email, 'citizen@civicresolve.in');

    // Tampered token fails
    assert.strictEqual(citizenAuthService.verifyCitizenToken(loginRes.token + '_bad'), null);
  });

  it('updates civic score with floor at 0', () => {
    const email = 'citizen@civicresolve.in';
    const initialScore = citizenAuthService.getCitizenByContact(email)?.civicScore || 0;

    // Add +20
    const added = citizenAuthService.addCivicScore(email, 20);
    assert.strictEqual(added?.civicScore, initialScore + 20);

    // Deduct -10
    const deducted = citizenAuthService.deductCivicScore(email, 10);
    assert.strictEqual(deducted?.civicScore, initialScore + 10);

    // Massive deduction floors at -100 maximum penalty floor
    citizenAuthService.deductCivicScore(email, 999999);
    const floored = citizenAuthService.getCitizenByContact(email)?.civicScore;
    assert.strictEqual(floored, -100);

    // Restore score
    citizenAuthService.addCivicScore(email, 100);
  });

  it('computes masked leaderboard with badges and ranks', () => {
    const mockIssues = [
      { id: '1', reporterContact: 'citizen@civicresolve.in', status: 'Resolved' },
      { id: '2', reporterContact: 'citizen@civicresolve.in', status: 'Resolved' },
    ];

    const leaderboard = citizenAuthService.getLeaderboard(mockIssues as any);
    assert.ok(Array.isArray(leaderboard));
    assert.ok(leaderboard.length >= 1);

    const first = leaderboard[0];
    assert.strictEqual(first.rank, 1);
    assert.ok(first.maskedEmail.includes('***'));
    assert.ok(first.maskedMobile.includes('***'));
    assert.ok(first.badge);
  });

  it('updates citizen password and allows subsequent login', () => {
    const email = 'citizen@civicresolve.in';
    const newPass = 'newCivicPass456';
    const updated = citizenAuthService.updateCitizenPassword(email, newPass);
    assert.strictEqual(updated, true);

    const loginRes = citizenAuthService.loginCitizen(email, newPass);
    assert.ok(loginRes.token);

    // Reset back
    citizenAuthService.updateCitizenPassword(email, 'citizen123');
    assert.ok(citizenAuthService.loginCitizen(email, 'citizen123'));
  });
});
