import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

let baseUrl: string;
let server: http.Server;

// Helper to make requests
async function request(method: string, path: string, body?: any, contentType?: string): Promise<{ status: number; body: any }> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {};
  let bodyToSend: string | undefined;

  if (body && contentType !== 'multipart/form-data') {
    headers['Content-Type'] = contentType || 'application/json';
    bodyToSend = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: bodyToSend });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

describe('CivicResolve API', () => {
  before(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.GEMINI_API_KEY = ''; // Force rule-based fallback

    // Ensure storage is initialized and reset to clean seed data
    const storageService = await import('../services/storageService');
    const citizenAuthService = await import('../services/citizenAuthService');
    await storageService.initialize();
    storageService.resetToSeedData();
    citizenAuthService.resetCitizens();

    // Dynamic import to let env vars take effect
    const appModule = await import('../index');
    const app = (appModule as any).default || appModule;

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Test 1: Health check
  it('GET /api/health returns 200 OK', async () => {
    const { status, body } = await request('GET', '/api/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'ok');
    assert.ok(body.primaryModel);
    assert.ok(body.fallbackModel);
    assert.ok(body.storageMode);
    assert.ok(body.timestamp);
  });

  // Test 2: Get all issues (should have seed data)
  it('GET /api/issues returns seeded issues', async () => {
    const { status, body } = await request('GET', '/api/issues');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 6, 'Should have at least 6 seeded issues');
  });

  // Test 3: Create a new issue
  let createdIssueId: string;
  it('POST /api/issues creates a new issue', async () => {
    const testId = Date.now();
    const newIssue = {
      title: `Unique Test Pothole On Elm Crescent ${testId}`,
      description: `A completely unique deep pothole on Elm Crescent requiring urgent civil patching ${testId}.`,
      location: `Elm Crescent, Zone ${testId}`
    };
    const { status, body } = await request('POST', '/api/issues', newIssue);
    assert.strictEqual(status, 201);
    assert.ok(body.id);
    assert.ok(body.trackingId);
    assert.ok(body.trackingId.startsWith('CR-'));
    assert.strictEqual(body.status, 'Reported');
    assert.ok(body.category);
    assert.ok(body.priority);
    assert.ok(body.priorityScore >= 1 && body.priorityScore <= 100);
    assert.ok(body.department);
    assert.ok(body.aiSummary);
    createdIssueId = body.id;
  });

  // Test 4: Get issues with filters
  it('GET /api/issues supports filtering', async () => {
    const { status, body } = await request('GET', '/api/issues?status=Reported');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    body.forEach((issue: any) => assert.strictEqual(issue.status, 'Reported'));
  });

  // Test 5: Update issue status
  it('PATCH /api/issues/:id updates the issue', async () => {
    const { status, body } = await request('PATCH', `/api/issues/${createdIssueId}`, {
      status: 'In Progress',
      resolutionNote: 'Crew dispatched to location',
      assignedOfficer: 'Officer Ramesh K.'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'In Progress');
    assert.strictEqual(body.assignedOfficer, 'Officer Ramesh K.');
    assert.ok(body.statusHistory.length >= 2);
  });

  // Test 6: Upvote an issue (toggle add and remove)
  it('POST /api/issues/:id/upvote toggles upvotes (add and remove)', async () => {
    const before = await request('GET', '/api/issues');
    const issueBefore = before.body.find((i: any) => i.id === createdIssueId);

    // Add upvote
    const addRes = await request('POST', `/api/issues/${createdIssueId}/upvote`, { action: 'add' });
    assert.strictEqual(addRes.status, 200);
    assert.strictEqual(addRes.body.upvotes, issueBefore.upvotes + 1);

    // Remove upvote
    const removeRes = await request('POST', `/api/issues/${createdIssueId}/upvote`, { action: 'remove' });
    assert.strictEqual(removeRes.status, 200);
    assert.strictEqual(removeRes.body.upvotes, issueBefore.upvotes);
  });

  // Test 7: Get stats
  it('GET /api/stats returns statistics and department breakdowns', async () => {
    const { status, body } = await request('GET', '/api/stats');
    assert.strictEqual(status, 200);
    assert.ok(typeof body.total === 'number');
    assert.ok(body.byStatus);
    assert.ok(typeof body.resolutionRate === 'number');
    assert.ok(body.byPriority);
    assert.ok(body.byCategory);
    assert.ok(typeof body.averagePriorityScore === 'number');
    assert.ok(Array.isArray(body.departments), 'Stats should include departments array');
  });

  // Test 8: SLA Policies
  it('GET and PUT /api/sla-policies', async () => {
    const getRes = await request('GET', '/api/sla-policies');
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body['Road & Potholes'] !== undefined);

    const putRes = await request('PUT', '/api/sla-policies', {
      'Road & Potholes': 60
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body['Road & Potholes'], 60);
  });

  // Test 9: Department Analytics
  it('GET /api/analytics/departments returns per-department metrics and performance scores', async () => {
    const { status, body } = await request('GET', '/api/analytics/departments');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 5);
    const pwd = body.find((d: any) => d.department.includes('Public Works'));
    assert.ok(pwd, 'Should have Public Works Department');
    assert.ok(typeof pwd.totalAssigned === 'number');
    assert.ok(typeof pwd.performanceScore === 'number');
    assert.ok(pwd.performanceScore >= 0 && pwd.performanceScore <= 100);
    assert.ok(['A', 'B', 'C', 'D'].includes(pwd.grade));
    assert.ok(typeof pwd.avgResolutionHours === 'number');
    assert.ok(typeof pwd.avgCitizenSatisfaction === 'number');
  });

  // Test 10: Administrative Audit Logs
  it('GET /api/audit-logs returns recorded logs', async () => {
    const { status, body } = await request('GET', '/api/audit-logs');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 1, 'Should have audit records from updates');
  });

  // Test 11: Flag False Report
  it('POST /api/issues/:id/flag-false marks issue as Rejected and applies penalties', async () => {
    const { status, body } = await request('POST', `/api/issues/${createdIssueId}/flag-false`, {
      reason: 'No issue found at location',
      adminEmail: 'test.admin@civicresolve.gov'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.issue.status, 'Rejected');
    assert.strictEqual(body.issue.isFalseReport, true);
  });

  // Test 12: Duplicate Auto-Consolidation
  it('POST /api/issues auto-consolidates matching active complaints', async () => {
    const dupTestId = Date.now();
    // 1st report
    const initialReport = {
      title: `Water Pipe Rupture Near Clock Tower ${dupTestId}`,
      description: `Major water pipe burst flooding road near clock tower ${dupTestId}.`,
      location: `Clock Tower Junction, Ward ${dupTestId}`,
      category: 'Water Leakage & Supply'
    };
    const res1 = await request('POST', '/api/issues', initialReport);
    assert.strictEqual(res1.status, 201);
    const originalTrackingId = res1.body.trackingId;

    // 2nd report: similar title & description in same category
    const duplicateReport = {
      title: `Water Pipe Rupture Near Clock Tower ${dupTestId}`,
      description: `Major water pipe burst flooding road near clock tower ${dupTestId}.`,
      location: `Clock Tower Junction, Ward ${dupTestId}`,
      category: 'Water Leakage & Supply'
    };
    const res2 = await request('POST', '/api/issues', duplicateReport);
    assert.strictEqual(res2.status, 200); // 200 OK for consolidated
    assert.strictEqual(res2.body.consolidated, true);
    assert.strictEqual(res2.body.trackingId, originalTrackingId);
    assert.ok(res2.body.citizenReportCount >= 2);

    // Cleanup
    await request('DELETE', `/api/issues/${res1.body.id}`);
  });

  // Test 13: Delete an issue
  it('DELETE /api/issues/:id removes the issue', async () => {
    const { status } = await request('DELETE', `/api/issues/${createdIssueId}`);
    assert.strictEqual(status, 200);

    const { status: getStatus, body } = await request('GET', '/api/issues');
    assert.strictEqual(getStatus, 200);
    const found = body.find((i: any) => i.id === createdIssueId);
    assert.strictEqual(found, undefined);
  });

  // Test 14: Validation - missing fields
  it('POST /api/issues validates required fields', async () => {
    const { status } = await request('POST', '/api/issues', { title: 'x' });
    assert.ok(status >= 400);
  });

  // Test 15: Citizen Rating on Resolved Issue
  it('POST /api/issues/:id/rate saves citizen satisfaction score', async () => {
    const { body: resolvedIssues } = await request('GET', '/api/issues?status=Resolved');
    assert.ok(resolvedIssues.length >= 1, 'Should have at least 1 resolved issue');
    const target = resolvedIssues[0];

    const { status, body } = await request('POST', `/api/issues/${target.id}/rate`, {
      rating: 5,
      feedback: 'Excellent response and clean site repair.'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.citizenRating, 5);
    assert.strictEqual(body.citizenFeedback, 'Excellent response and clean site repair.');
  });

  // Test 16: Reopen Resolved Issue
  it('POST /api/issues/:id/reopen moves ticket to Reported and increments reopenCount', async () => {
    const { body: resolvedIssues } = await request('GET', '/api/issues?status=Resolved');
    assert.ok(resolvedIssues.length >= 1);
    const target = resolvedIssues[0];
    const prevReopenCount = target.reopenCount || 0;

    const { status, body } = await request('POST', `/api/issues/${target.id}/reopen`, {
      reason: 'Pothole opened up again after rain'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'Reported');
    assert.strictEqual(body.reopenCount, prevReopenCount + 1);
    assert.ok(body.statusHistory.some((h: any) => h.note.includes('Pothole opened up again after rain')));
  });

  // Test 17: Notifications stream
  it('GET /api/notifications returns active notifications', async () => {
    const { status, body } = await request('GET', '/api/notifications');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body[0].channel);
  });

  // Test 18: Mark notification as read
  it('PATCH /api/notifications/:id/read marks notification as read', async () => {
    const { body: list } = await request('GET', '/api/notifications');
    const target = list[0];
    const { status, body } = await request('PATCH', `/api/notifications/${target.id}/read`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'read');
  });

  // Test 19: Add internal case note
  it('POST /api/issues/:id/notes adds internal authority note', async () => {
    const { body: list } = await request('GET', '/api/issues');
    assert.ok(list.length > 0);
    const targetId = list[0].id;
    const { status, body } = await request('POST', `/api/issues/${targetId}/notes`, {
      note: 'Field technician inspected area; tools requisitioned.',
      author: 'officer@civicresolve.gov'
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.internalAdminNotes));
    assert.ok(body.internalAdminNotes.some((n: any) => n.note.includes('tools requisitioned')));
  });

  // Test 20: Add public citizen update
  it('POST /api/issues/:id/public-updates publishes public progress update', async () => {
    const { body: list } = await request('GET', '/api/issues');
    assert.ok(list.length > 0);
    const targetId = list[0].id;
    const { status, body } = await request('POST', `/api/issues/${targetId}/public-updates`, {
      update: 'Site survey completed. Repair crew scheduled for tomorrow 9 AM.',
      author: 'Public Works Division'
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.publicUpdates));
    assert.ok(body.publicUpdates.some((u: any) => u.update.includes('Repair crew scheduled')));
  });

  // Test 21: Security Headers
  it('Applies HTTP security headers (X-Content-Type-Options, X-Frame-Options)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
  });

  // Test 22: Hashed Password Login & 2-Step MFA verification
  it('POST /api/auth/login requires MFA and rejects invalid credentials', async () => {
    // Bad password
    const failRes = await request('POST', '/api/auth/login', {
      email: 'commissioner@civicresolve.gov',
      password: 'wrongpassword'
    });
    assert.strictEqual(failRes.status, 401);

    // Good password -> step 2 MFA required
    const mfaRes = await request('POST', '/api/auth/login', {
      email: 'commissioner@civicresolve.gov',
      password: 'super123'
    });
    assert.strictEqual(mfaRes.status, 200);
    assert.strictEqual(mfaRes.body.mfaRequired, true);
    assert.ok(mfaRes.body.tempToken);
    assert.strictEqual(mfaRes.body.demoOtp, '123456');

    // Step 2 Verify MFA
    const verifyRes = await request('POST', '/api/auth/verify-mfa', {
      tempToken: mfaRes.body.tempToken,
      otp: '123456'
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.ok(verifyRes.body.token);
    assert.strictEqual(verifyRes.body.user.email, 'commissioner@civicresolve.gov');
    assert.strictEqual(verifyRes.body.user.role, 'super_admin');
  });

  // Test 23: Direct 1-Step Auth with demo OTP and Login History Recording
  it('Records login attempts in GET /api/audit-logs/logins', async () => {
    // Quick login for PWD Head
    const quickRes = await request('POST', '/api/auth/login', {
      email: 'pwd@civicresolve.gov',
      password: 'pwd123',
      otp: '123456'
    });
    assert.strictEqual(quickRes.status, 200);
    assert.ok(quickRes.body.token);

    // Fetch login history
    const { status, body } = await request('GET', '/api/audit-logs/logins');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.some((l: any) => l.email === 'pwd@civicresolve.gov' && l.status === 'SUCCESS'));
  });

  // Test 24: Bounded Governance Config & Storage Usage Telemetry
  it('GET and PUT /api/governance/config enforces bounded audit retention', async () => {
    const getRes = await request('GET', '/api/governance/config');
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.config.auditLogRetentionDays);
    assert.strictEqual(getRes.body.storageUsage.auditLogsCap, 1000);
    assert.strictEqual(getRes.body.storageUsage.loginHistoryCap, 500);

    const putRes = await request('PUT', '/api/governance/config', {
      auditLogRetentionDays: 30,
      updatedBy: 'commissioner@civicresolve.gov'
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.config.auditLogRetentionDays, 30);
    assert.strictEqual(putRes.body.storageUsage.retentionDays, 30);
  });

  // Test 25: Export Audit Logs CSV
  it('GET /api/audit-logs/export-csv returns RFC-4180 CSV archive', async () => {
    const res = await fetch(`${baseUrl}/api/audit-logs/export-csv`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('Timestamp'));
    assert.ok(text.includes('Action'));
  });

  // Test 26: Department Helplines Directory
  it('GET /api/helplines returns 24x7 control room and 5 department toll-free numbers', async () => {
    const { status, body } = await request('GET', '/api/helplines');
    assert.strictEqual(status, 200);
    assert.ok(body.emergencyControlRoom);
    assert.strictEqual(body.emergencyControlRoom.tollFree, '1800-425-7000');
    assert.ok(Array.isArray(body.departments));
    assert.strictEqual(body.departments.length, 5);
    assert.ok(body.departments.some((d: any) => d.tollFree === '1800-425-7001'));
    assert.ok(body.departments.some((d: any) => d.tollFree === '1800-425-7002'));
    assert.ok(body.departments.some((d: any) => d.tollFree === '1800-425-7003'));
    assert.ok(body.departments.some((d: any) => d.tollFree === '1800-425-7004'));
  });

  // Test 27: Demo Citizen Login
  let citizenToken: string;
  it('POST /api/citizens/login validates credentials and returns session token', async () => {
    // Bad login
    const badRes = await request('POST', '/api/citizens/login', {
      email: 'citizen@civicresolve.in',
      password: 'wrongpassword'
    });
    assert.strictEqual(badRes.status, 401);

    // Good login
    const goodRes = await request('POST', '/api/citizens/login', {
      email: 'citizen@civicresolve.in',
      password: 'citizen123'
    });
    assert.strictEqual(goodRes.status, 200);
    assert.ok(goodRes.body.token);
    assert.strictEqual(goodRes.body.citizen.email, 'citizen@civicresolve.in');
    assert.strictEqual(goodRes.body.citizen.civicScore, 100);
    citizenToken = goodRes.body.token;
  });

  // Test 28: Citizen Registration & Mobile OTP Verification
  it('POST /api/citizens/register and verify-otp onboard new citizen with mobile verification', async () => {
    const id = Date.now();
    const testEmail = `tester_${id}@example.com`;
    const testMobile = `+91 ${id.toString().slice(-10)}`;
    const regRes = await request('POST', '/api/citizens/register', {
      name: 'Priya Sundaram',
      email: testEmail,
      mobile: testMobile,
      password: 'password123'
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.body.tempId);
    assert.strictEqual(regRes.body.demoOtp, '482910');

    // Verify with invalid OTP
    const badOtpRes = await request('POST', '/api/citizens/verify-otp', {
      tempId: regRes.body.tempId,
      otp: '000000'
    });
    assert.strictEqual(badOtpRes.status, 400);

    // Verify with valid demo OTP
    const goodOtpRes = await request('POST', '/api/citizens/verify-otp', {
      tempId: regRes.body.tempId,
      otp: regRes.body.demoOtp
    });
    assert.strictEqual(goodOtpRes.status, 200);
    assert.ok(goodOtpRes.body.token);
    assert.strictEqual(goodOtpRes.body.citizen.email, testEmail);
    assert.strictEqual(goodOtpRes.body.citizen.isMobileVerified, true);
    assert.strictEqual(goodOtpRes.body.citizen.civicScore, 0);
  });

  // Test 29: Authenticated Citizen Profile
  it('GET /api/citizens/profile returns authenticated citizen with valid token', async () => {
    const url = `${baseUrl}/api/citizens/profile`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.email, 'citizen@civicresolve.in');
  });

  // Test 30: Photo Authenticity Check field initialization on issue creation
  it('POST /api/issues initializes authenticityCheck status and imageUrls array', async () => {
    const res = await request('POST', '/api/issues', {
      title: 'Water Main Burst on Marina Radial Road',
      description: 'Major water pipeline rupture causing severe flooding on Marina Radial road.',
      location: 'Marina Beach Road, Chennai',
      citizenName: 'Deepak V.',
      reporterContact: '+91 98401 11223'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.ok(res.body.authenticityCheck);
    assert.ok(['Pending', 'Verified', 'Suspected Fake'].includes(res.body.authenticityCheck.status));
    assert.ok(Array.isArray(res.body.imageUrls));
  });

  // Test 31: Dynamic Multilingual Translation Endpoint
  it('POST /api/translate translates civic terminology into Tamil and Hindi with fallback dictionary', async () => {
    // Bad request
    const badRes = await request('POST', '/api/translate', { texts: 'invalid' });
    assert.strictEqual(badRes.status, 400);

    // Tamil translation
    const taRes = await request('POST', '/api/translate', {
      texts: ['Road & Potholes', 'Garbage & Sanitation', 'Critical'],
      targetLang: 'ta'
    });
    assert.strictEqual(taRes.status, 200);
    assert.ok(Array.isArray(taRes.body.translations));
    assert.strictEqual(taRes.body.translations.length, 3);
    assert.strictEqual(taRes.body.translations[0], 'சாலை மற்றும் பள்ளங்கள்');
    assert.strictEqual(taRes.body.translations[1], 'குப்பை மற்றும் துப்புரவு');
    assert.strictEqual(taRes.body.translations[2], 'மிக அவசரம்');

    // Hindi translation
    const hiRes = await request('POST', '/api/translate', {
      texts: ['Water Leakage & Supply', 'Critical', 'Resolved'],
      targetLang: 'hi'
    });
    assert.strictEqual(hiRes.status, 200);
    assert.ok(Array.isArray(hiRes.body.translations));
    assert.strictEqual(hiRes.body.translations.length, 3);
    assert.strictEqual(hiRes.body.translations[0], 'जल रिसाव और आपूर्ति');
    assert.strictEqual(hiRes.body.translations[1], 'अति गंभीर');
    assert.strictEqual(hiRes.body.translations[2], 'समाधान हो गया');
  });

  // Test 32: Citizen Champions Leaderboard
  it('GET /api/citizens/leaderboard returns ranked civic champions with masked contact info', async () => {
    const { status, body } = await request('GET', '/api/citizens/leaderboard');
    assert.strictEqual(status, 200);
    const list = Array.isArray(body) ? body : body.leaderboard;
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 4, 'Should contain at least 4 ranked champions');

    // Ensure sorted descending by civic score
    for (let i = 0; i < list.length - 1; i++) {
      assert.ok(list[i].civicScore >= list[i + 1].civicScore);
    }

    const first = list[0];
    assert.ok(first.name);
    assert.ok(first.rank === 1);
    assert.ok(typeof first.civicScore === 'number');
    assert.ok(typeof first.totalReports === 'number');
    assert.ok(typeof first.resolvedReports === 'number');
    assert.ok(first.maskedEmail.includes('***'), 'Email must be masked for citizen privacy');
    assert.ok(first.maskedMobile.includes('***'), 'Mobile must be masked for citizen privacy');
  });

  // Test 33: Citizen Civic Score Tracking on Resolution (+20) and False Report Flagging (-25)
  it('Updates citizen civic score on issue resolution (+20 pts) and false report flagging (-25 pts)', async () => {
    // 1. Get initial score for citizen@civicresolve.in
    const profRes1 = await fetch(`${baseUrl}/api/citizens/profile`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    assert.strictEqual(profRes1.status, 200);
    const initialScore = (await profRes1.json() as any).civicScore;

    // 2. Create a test issue reported by citizen@civicresolve.in
    const createRes = await request('POST', '/api/issues', {
      title: 'Broken Streetlamp Outside Ward 4 Community Centre',
      description: 'Streetlamp completely dead causing dark zone hazard on cross street.',
      location: 'Ward 4 Community Centre, Zone 2',
      reporterContact: 'citizen@civicresolve.in',
      citizenName: 'Priya Sundaram'
    });
    assert.strictEqual(createRes.status, 201);
    const issueId = createRes.body.id;

    // 3. Update status to 'Resolved' via PATCH /api/issues/:id -> awards +20 pts
    const patchRes = await request('PATCH', `/api/issues/${issueId}`, {
      status: 'Resolved',
      adminEmail: 'pwd@civicresolve.gov'
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.status, 'Resolved');

    // Verify +20 pts added
    const profRes2 = await fetch(`${baseUrl}/api/citizens/profile`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    const afterResolveScore = (await profRes2.json() as any).civicScore;
    assert.strictEqual(afterResolveScore, initialScore + 20);

    // 4. Flag another issue as false report -> deducts -25 pts
    const fakeIssueRes = await request('POST', '/api/issues', {
      title: 'Prank Report for Deduction Test',
      description: 'Completely fake hoax submission for negative score verification.',
      location: 'Non-existent Fake Road 99',
      reporterContact: 'citizen@civicresolve.in'
    });
    assert.strictEqual(fakeIssueRes.status, 201);

    const flagRes = await request('POST', `/api/issues/${fakeIssueRes.body.id}/flag-false`, {
      reason: 'Confirmed prank submission by evaluator test',
      adminEmail: 'admin@civicresolve.gov'
    });
    assert.strictEqual(flagRes.status, 200);

    // Verify -25 pts deducted
    const profRes3 = await fetch(`${baseUrl}/api/citizens/profile`, {
      headers: { Authorization: `Bearer ${citizenToken}` }
    });
    const afterDeductScore = (await profRes3.json() as any).civicScore;
    assert.strictEqual(afterDeductScore, afterResolveScore - 25);
  });

  // Test 34: 50-Notification FIFO Cap and Batch / Single Deletion
  it('Enforces 50-notification FIFO cap and supports single/batch deletion', async () => {
    const storageService = await import('../services/storageService');

    // Add 60 notifications to test FIFO rolling cap
    for (let i = 1; i <= 60; i++) {
      storageService.addNotification({
        issueId: `test-issue-${i}`,
        caseId: `CR-2026-${String(i).padStart(3, '0')}`,
        title: `Test Grievance Alert #${i}`,
        message: `Automated test dispatch update #${i}`,
        type: 'STATUS_UPDATE',
        channel: 'In-App',
      });
    }

    // Verify bounded cap at 50 notifications
    const getRes = await request('GET', '/api/notifications');
    assert.strictEqual(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body));
    assert.strictEqual(getRes.body.length, 50, 'Notifications list must be capped at 50 max FIFO');

    // Most recent notification should be at index 0 (#60)
    assert.ok(getRes.body[0].title.includes('#60'));

    // Test Batch Deletion: delete first 3 notifications
    const idsToDelete = [getRes.body[0].id, getRes.body[1].id, getRes.body[2].id];
    const batchRes = await request('POST', '/api/notifications/delete-batch', { ids: idsToDelete });
    assert.strictEqual(batchRes.status, 200);
    assert.strictEqual(batchRes.body.success, true);
    assert.strictEqual(batchRes.body.deletedCount, 3);

    // Verify length decreased to 47
    const getRes2 = await request('GET', '/api/notifications');
    assert.strictEqual(getRes2.body.length, 47);
    assert.ok(!getRes2.body.some((n: any) => idsToDelete.includes(n.id)));

    // Test Single Deletion: DELETE /api/notifications/:id
    const singleId = getRes2.body[0].id;
    const singleDelRes = await request('DELETE', `/api/notifications/${singleId}`);
    assert.strictEqual(singleDelRes.status, 200);
    assert.strictEqual(singleDelRes.body.success, true);

    const getRes3 = await request('GET', '/api/notifications');
    assert.strictEqual(getRes3.body.length, 46);
    assert.ok(!getRes3.body.some((n: any) => n.id === singleId));
  });

  // Test 35: Forgot Password with Email OTP and Password Reset (Citizen & Admin)
  it('Processes forgot password OTP requests and resets password for citizen and admin', async () => {
    // 1. Citizen Forgot Password OTP
    const cForgotRes = await request('POST', '/api/auth/forgot-password', {
      email: 'citizen@civicresolve.in',
      userType: 'citizen',
    });
    assert.strictEqual(cForgotRes.status, 200);
    assert.strictEqual(cForgotRes.body.success, true);
    assert.ok(cForgotRes.body.demoOtp);

    // 2. Citizen Reset Password
    const cResetRes = await request('POST', '/api/auth/reset-password', {
      email: 'citizen@civicresolve.in',
      userType: 'citizen',
      otp: cForgotRes.body.demoOtp,
      newPassword: 'test_citizen_new_pwd_123',
    });
    assert.strictEqual(cResetRes.status, 200);
    assert.strictEqual(cResetRes.body.success, true);

    // 3. Verify Citizen can login with new password
    const cLoginRes = await request('POST', '/api/citizens/login', {
      email: 'citizen@civicresolve.in',
      password: 'test_citizen_new_pwd_123',
    });
    assert.strictEqual(cLoginRes.status, 200);
    assert.ok(cLoginRes.body.token);

    // 4. Restore citizen default password
    await request('POST', '/api/auth/forgot-password', {
      email: 'citizen@civicresolve.in',
      userType: 'citizen',
    });
    await request('POST', '/api/auth/reset-password', {
      email: 'citizen@civicresolve.in',
      userType: 'citizen',
      otp: '654321',
      newPassword: 'citizen123',
    });

    // 5. Admin Forgot Password OTP
    const aForgotRes = await request('POST', '/api/auth/forgot-password', {
      email: 'pwd@civicresolve.gov',
      userType: 'admin',
    });
    assert.strictEqual(aForgotRes.status, 200);
    assert.strictEqual(aForgotRes.body.success, true);
    assert.ok(aForgotRes.body.demoOtp);

    // 6. Admin Reset Password
    const aResetRes = await request('POST', '/api/auth/reset-password', {
      email: 'pwd@civicresolve.gov',
      userType: 'admin',
      otp: aForgotRes.body.demoOtp,
      newPassword: 'test_admin_new_pwd_123',
    });
    assert.strictEqual(aResetRes.status, 200);
    assert.strictEqual(aResetRes.body.success, true);

    // 7. Verify Admin can login with new password
    const aLoginRes = await request('POST', '/api/auth/login', {
      email: 'pwd@civicresolve.gov',
      password: 'test_admin_new_pwd_123',
    });
    assert.strictEqual(aLoginRes.status, 200);
    assert.ok(aLoginRes.body.mfaRequired || aLoginRes.body.token);

    // 8. Restore admin default password
    await request('POST', '/api/auth/forgot-password', {
      email: 'pwd@civicresolve.gov',
      userType: 'admin',
    });
    await request('POST', '/api/auth/reset-password', {
      email: 'pwd@civicresolve.gov',
      userType: 'admin',
      otp: '654321',
      newPassword: 'pwd123',
    });
  });
});
