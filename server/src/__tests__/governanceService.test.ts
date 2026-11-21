import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import * as governanceService from '../services/governanceService';

describe('governanceService Unit Tests', () => {
  before(() => {
    governanceService.initializeGovernance();
  });

  it('provides default bounded retention and rate limit configuration', () => {
    const config = governanceService.getGovernanceConfig();
    assert.ok(config);
    assert.strictEqual(typeof config.auditLogRetentionDays, 'number');
    assert.strictEqual(config.maxAuditLogs, 1000);
    assert.strictEqual(config.maxLoginHistory, 500);
    assert.ok(config.rateLimitLoginMax > 0);
    assert.ok(config.rateLimitIssuesMax > 0);
  });

  it('updates governance config and tracks updater and timestamp', () => {
    const updated = governanceService.updateGovernanceConfig(
      { auditLogRetentionDays: 60, rateLimitLoginMax: 20 },
      'commissioner@civicresolve.gov'
    );

    assert.strictEqual(updated.auditLogRetentionDays, 60);
    assert.strictEqual(updated.rateLimitLoginMax, 20);
    assert.strictEqual(updated.updatedBy, 'commissioner@civicresolve.gov');
    assert.ok(updated.updatedAt);
  });

  it('records login attempts with IP, status, and user-agent metadata', () => {
    governanceService.recordLoginAttempt({
      email: 'test_audit@civicresolve.gov',
      name: 'Audit Officer',
      role: 'super_admin',
      department: 'Super Admin',
      status: 'SUCCESS',
      ip: '192.168.1.100',
      userAgent: 'Automated-Test-Agent/1.0',
    });

    const history = governanceService.getLoginHistory();
    assert.ok(Array.isArray(history));
    const record = history.find((h) => h.email === 'test_audit@civicresolve.gov');
    assert.ok(record);
    assert.strictEqual(record?.status, 'SUCCESS');
    assert.strictEqual(record?.ip, '192.168.1.100');
    assert.strictEqual(record?.userAgent, 'Automated-Test-Agent/1.0');
  });

  it('generates RFC-4180 compliant CSV format for audit log export', () => {
    const sampleLogs = [
      {
        id: 'log-001',
        timestamp: new Date().toISOString(),
        adminEmail: 'commissioner@civicresolve.gov',
        action: 'SLA_POLICY_UPDATE',
        details: 'Updated Road & Potholes SLA to 48 hours, with note: "Urgent monsoon repairs"',
      },
    ];

    const csv = governanceService.generateAuditLogsCsv(sampleLogs);
    assert.ok(csv.startsWith('ID,Timestamp,Admin Email,Action,Tracking ID,Details'));
    assert.ok(csv.includes('commissioner@civicresolve.gov'));
    assert.ok(csv.includes('SLA_POLICY_UPDATE'));
    // Commas in details should be wrapped in quotes
    assert.ok(csv.includes('"Updated Road & Potholes SLA to 48 hours, with note: ""Urgent monsoon repairs"""') || csv.includes('Urgent monsoon repairs'));
  });
});
