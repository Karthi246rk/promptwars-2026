import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import * as slaService from '../services/slaService';

describe('slaService Unit Tests', () => {
  before(() => {
    slaService.updateSlaPolicies({
      'Road & Potholes': 72,
      'Water Leakage & Supply': 24,
      'Streetlights & Power': 48,
      'Garbage & Sanitation': 24,
      'Public Safety': 12,
      'Other': 72,
    });
  });

  it('returns default SLA policies for all civic grievance categories', () => {
    const policies = slaService.getSlaPolicies();
    assert.strictEqual(policies['Road & Potholes'], 72);
    assert.strictEqual(policies['Water Leakage & Supply'], 24);
    assert.strictEqual(policies['Streetlights & Power'], 48);
    assert.strictEqual(policies['Garbage & Sanitation'], 24);
    assert.strictEqual(policies['Public Safety'], 12);
    assert.strictEqual(policies['Other'], 72);
  });

  it('updates SLA policy target hours and ignores invalid values', () => {
    const updated = slaService.updateSlaPolicies({
      'Road & Potholes': 48,
      'InvalidCategory': -10, // should be ignored
    });
    assert.strictEqual(updated['Road & Potholes'], 48);

    // Reset back to 72
    slaService.updateSlaPolicies({ 'Road & Potholes': 72 });
    assert.strictEqual(slaService.getSlaPolicies()['Road & Potholes'], 72);
  });

  it('computes SLA deadline accurately from createdAt timestamp', () => {
    const createdAt = '2026-11-20T10:00:00.000Z';
    const { targetHours, slaDeadline } = slaService.computeSlaDeadline('Water Leakage & Supply', createdAt);

    assert.strictEqual(targetHours, 24);
    const expectedDeadline = new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString();
    assert.strictEqual(slaDeadline, expectedDeadline);
  });

  it('evaluates SLA status: active issue well within target window', () => {
    const now = Date.now();
    const createdAt = new Date(now - 2 * 3600000).toISOString(); // 2 hours ago
    const sla = slaService.evaluateSlaStatus({
      status: 'Reported',
      category: 'Road & Potholes',
      createdAt,
      slaTargetHours: 72,
    });

    assert.strictEqual(sla.slaBreached, false);
    assert.strictEqual(sla.isEscalated, false);
    assert.strictEqual(sla.hoursOverdue, 0);
    assert.ok(sla.hoursRemaining > 60);
  });

  it('evaluates SLA status: issue approaching deadline (< 6 hours remaining) escalates', () => {
    const now = Date.now();
    const createdAt = new Date(now - 68 * 3600000).toISOString(); // 68 hours ago on 72h SLA (4h left)
    const sla = slaService.evaluateSlaStatus({
      status: 'In Progress',
      category: 'Road & Potholes',
      createdAt,
      slaTargetHours: 72,
    });

    assert.strictEqual(sla.slaBreached, false);
    assert.strictEqual(sla.isEscalated, true); // Escalated alert triggered!
    assert.strictEqual(sla.hoursOverdue, 0);
    assert.ok(sla.hoursRemaining <= 6 && sla.hoursRemaining > 0);
  });

  it('evaluates SLA status: issue past deadline breaches and escalates', () => {
    const now = Date.now();
    const createdAt = new Date(now - 80 * 3600000).toISOString(); // 80 hours ago on 72h SLA (8h overdue)
    const sla = slaService.evaluateSlaStatus({
      status: 'Reported',
      category: 'Road & Potholes',
      createdAt,
      slaTargetHours: 72,
    });

    assert.strictEqual(sla.slaBreached, true);
    assert.strictEqual(sla.isEscalated, true);
    assert.strictEqual(sla.hoursRemaining, 0);
    assert.ok(sla.hoursOverdue >= 7);
  });

  it('evaluates SLA status: resolved or rejected issue is frozen and not breached', () => {
    const now = Date.now();
    const createdAt = new Date(now - 100 * 3600000).toISOString(); // 100 hours ago
    const slaResolved = slaService.evaluateSlaStatus({
      status: 'Resolved',
      category: 'Road & Potholes',
      createdAt,
      slaTargetHours: 72,
    });

    assert.strictEqual(slaResolved.slaBreached, false);
    assert.strictEqual(slaResolved.isEscalated, false);
    assert.strictEqual(slaResolved.hoursOverdue, 0);
  });
});
