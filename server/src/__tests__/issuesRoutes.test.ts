import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = '';

import app from '../index';
import * as storageService from '../services/storageService';

describe('issuesRoutes Integration Tests (Consolidation, RBAC & Validation)', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await storageService.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function request(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; body: any; headers: Headers }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    return { status: res.status, body: json, headers: res.headers };
  }

  // ==========================================
  // 1. 500m Duplicate Consolidation Tests
  // ==========================================
  describe('500m Duplicate Consolidation Engine', () => {
    it('creates a fresh issue on first report', async () => {
      const res = await request('POST', '/api/issues', {
        title: 'Deep Crater Pothole on North Ring Road',
        description: 'Large asphalt crater at intersection causing severe vehicular damage.',
        location: 'North Ring Road KM 4, Near Overpass',
        category: 'Road & Potholes',
        latitude: 11.0150,
        longitude: 76.9550,
        reporterContact: 'citizen_alpha@civicresolve.in',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.consolidated, false);
      assert.ok(res.body.trackingId);
      assert.strictEqual(res.body.category, 'Road & Potholes');
    });

    it('auto-consolidates duplicate complaint submitted within 500m with same category', async () => {
      // Coordinate ~60m away from 11.0150, 76.9550
      const res = await request('POST', '/api/issues', {
        title: 'Another report of road damage near Overpass',
        description: 'Second citizen reporting vehicle tire rupture on the same pothole.',
        location: 'North Ring Road Overpass Corner',
        category: 'Road & Potholes',
        latitude: 11.0154,
        longitude: 76.9554,
        reporterContact: 'citizen_beta@civicresolve.in',
      });

      assert.strictEqual(res.status, 200); // 200 OK for consolidated
      assert.strictEqual(res.body.consolidated, true);
      assert.ok(res.body.message.includes('Consolidated with existing work order'));
      assert.ok(res.body.citizenReportCount >= 2);
    });

    it('does not consolidate report > 500m away (creates separate issue)', async () => {
      // Coordinate > 5km away
      const res = await request('POST', '/api/issues', {
        title: 'Damaged pavement on East Bypass',
        description: 'Pavement bricks broken along East Bypass near toll gate.',
        location: 'East Bypass KM 18, Sector 14',
        category: 'Road & Potholes',
        latitude: 11.0850,
        longitude: 77.0250,
        reporterContact: 'citizen_gamma@civicresolve.in',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.consolidated, false);
    });

    it('does not consolidate report at same location if category is different', async () => {
      const res = await request('POST', '/api/issues', {
        title: 'Defective Streetlight Luminaire in Sector 4',
        description: 'Streetlight luminaire blackout and blown fuse causing dark corridor.',
        location: 'Sector 4 Corridor Junction',
        category: 'Streetlights & Power',
        latitude: 11.0150,
        longitude: 76.9550,
        reporterContact: 'citizen_delta@civicresolve.in',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.consolidated, false);
      assert.strictEqual(res.body.category, 'Streetlights & Power');
    });
  });

  // ==========================================
  // 2. RBAC & Department Scoping Tests
  // ==========================================
  describe('RBAC & Department Scoping', () => {
    it('scopes issues by department filter for department heads', async () => {
      const pwdRes = await request('GET', '/api/issues?department=Public Works Department');
      assert.strictEqual(pwdRes.status, 200);
      assert.ok(Array.isArray(pwdRes.body));
      assert.ok(pwdRes.body.every((i: any) => i.department === 'Public Works Department'));

      const waterRes = await request('GET', '/api/issues?department=Water Supply Department');
      assert.strictEqual(waterRes.status, 200);
      assert.ok(Array.isArray(waterRes.body));
      assert.ok(waterRes.body.every((i: any) => i.department === 'Water Supply Department'));
    });

    it('allows Super Admin full access without department restrictions', async () => {
      const allRes = await request('GET', '/api/issues');
      assert.strictEqual(allRes.status, 200);
      assert.ok(allRes.body.length >= 6);
      const departments = new Set(allRes.body.map((i: any) => i.department));
      assert.ok(departments.size >= 3);
    });

    it('handles false report flagging with penalties and civic score deduction', async () => {
      // Create a test issue first
      const createRes = await request('POST', '/api/issues', {
        title: 'Prank issue for testing flagging',
        description: 'Completely fabricated complaint intended to test authority flagging.',
        location: 'Test Location Plaza',
        category: 'Public Safety',
        reporterContact: 'prankster@civicresolve.in',
      });

      assert.strictEqual(createRes.status, 201);
      const issueId = createRes.body.id;

      // Flag as false report
      const flagRes = await request('POST', `/api/issues/${issueId}/flag-false`, {
        reason: 'Confirmed prank report with fake address during site inspection',
        adminEmail: 'commissioner@civicresolve.gov',
      });

      assert.strictEqual(flagRes.status, 200);
      assert.strictEqual(flagRes.body.issue.status, 'Rejected');
      assert.ok(flagRes.body.penalty);
      assert.strictEqual(flagRes.body.penalty.strikes, 1);
    });
  });

  // ==========================================
  // 3. Strict Input Validation & Error Handling
  // ==========================================
  describe('Input Validation & Error Handling', () => {
    it('rejects issue creation with missing or short title (< 3 chars)', async () => {
      const res = await request('POST', '/api/issues', {
        title: 'No',
        description: 'Valid description that has sufficient length.',
        location: 'Main Street',
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Title'));
    });

    it('rejects issue creation with short description (< 10 chars)', async () => {
      const res = await request('POST', '/api/issues', {
        title: 'Valid Long Title',
        description: 'Too short',
        location: 'Main Street',
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Description'));
    });

    it('rejects issue creation with missing location', async () => {
      const res = await request('POST', '/api/issues', {
        title: 'Valid Long Title',
        description: 'Valid description that has sufficient length.',
        location: '',
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Location'));
    });

    it('rejects invalid coordinates outside valid geographic range', async () => {
      // Invalid latitude (> 90)
      const latRes = await request('POST', '/api/issues', {
        title: 'Invalid Latitude Issue',
        description: 'Testing coordinate bounds validation.',
        location: 'Somewhere',
        latitude: 120.5,
        longitude: 76.9,
      });
      assert.strictEqual(latRes.status, 400);
      assert.ok(latRes.body.error.includes('Latitude'));

      // Invalid longitude (> 180)
      const lngRes = await request('POST', '/api/issues', {
        title: 'Invalid Longitude Issue',
        description: 'Testing coordinate bounds validation.',
        location: 'Somewhere',
        latitude: 11.0,
        longitude: 250.0,
      });
      assert.strictEqual(lngRes.status, 400);
      assert.ok(lngRes.body.error.includes('Longitude'));
    });

    it('returns 404 when updating or deleting non-existent issue', async () => {
      const patchRes = await request('PATCH', '/api/issues/non-existent-uuid-999', {
        status: 'In Progress',
      });
      assert.strictEqual(patchRes.status, 404);

      const delRes = await request('DELETE', '/api/issues/non-existent-uuid-999');
      assert.strictEqual(delRes.status, 404);
    });

    it('rejects PATCH with invalid status or priority strings', async () => {
      // Fetch an existing issue
      const issues = await request('GET', '/api/issues');
      const targetId = issues.body[0].id;

      const badStatusRes = await request('PATCH', `/api/issues/${targetId}`, {
        status: 'InvalidBogusStatus',
      });
      assert.strictEqual(badStatusRes.status, 400);
      assert.ok(badStatusRes.body.error.includes('Invalid status'));

      const badPriorityRes = await request('PATCH', `/api/issues/${targetId}`, {
        priority: 'MegaUrgent',
      });
      assert.strictEqual(badPriorityRes.status, 400);
      assert.ok(badPriorityRes.body.error.includes('Invalid priority'));
    });

    it('validates citizen rating range (1-5) and checks resolved status', async () => {
      // Find an un-resolved issue
      const issues = await request('GET', '/api/issues');
      const unResolved = issues.body.find((i: any) => i.status !== 'Resolved');

      if (unResolved) {
        // Rating un-resolved issue rejected
        const rateUnresolved = await request('POST', `/api/issues/${unResolved.id}/rate`, {
          rating: 5,
        });
        assert.strictEqual(rateUnresolved.status, 400);
        assert.ok(rateUnresolved.body.error.includes('resolved'));
      }

      // Rating > 5 rejected
      const rateInvalid = await request('POST', '/api/issues/seed-1/rate', {
        rating: 10,
      });
      assert.strictEqual(rateInvalid.status, 400);
    });

    it('sanitizes XSS script tags from title and description inputs', async () => {
      const res = await request('POST', '/api/issues', {
        title: '<script>alert("xss")</script>Pothole Alert',
        description: '<script>document.cookie</script>Deep pothole on highway road.',
        location: 'Highway KM 12',
        category: 'Road & Potholes',
      });

      assert.strictEqual(res.status, 201);
      assert.ok(!res.body.title.includes('<script>'));
      assert.ok(!res.body.description.includes('<script>'));
    });
  });
});
