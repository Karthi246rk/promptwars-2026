import { jsPDF } from 'jspdf';
import type { Issue } from '../types';

export function downloadCasePdf(issue: Issue): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 40;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, contentWidth, 54, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CIVICRESOLVE MUNICIPAL GRIEVANCE & RESOLUTION PORTAL', margin + 14, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('OFFICIAL DIGITAL CASE FILE & AUDIT RECORD', margin + 14, y + 42);

  y += 68;

  // Case ID & Meta Box
  const caseId = issue.caseId || issue.trackingId;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Case ID: ${caseId}`, margin + 12, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 12, y + 38);

  // Status & Priority on right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Status: ${issue.status.toUpperCase()}`, margin + contentWidth - 170, y + 22);
  doc.text(`Priority: ${issue.priority} (${issue.priorityScore}/100)`, margin + contentWidth - 170, y + 38);

  y += 62;

  // Section 1: Grievance & Citizen Details
  drawSectionHeader(doc, '1. CITIZEN & GRIEVANCE OVERVIEW', margin, y, contentWidth);
  y += 24;

  const citizenName = issue.citizenName || 'Concerned Citizen';
  const citizenContact = issue.citizenContact || issue.reporterContact || '+91 98401 23456';
  const subcategory = issue.subcategory || 'General Municipal Issue';

  const overviewRows = [
    ['Case Title:', issue.title],
    ['Citizen Name:', citizenName],
    ['Citizen Contact:', citizenContact],
    ['Location / Ward:', issue.location],
    ['Category:', issue.category],
    ['Subcategory:', subcategory],
    ['Reported On:', new Date(issue.createdAt).toLocaleString()],
  ];

  for (const [label, val] of overviewRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitText = doc.splitTextToSize(String(val), contentWidth - 130);
    doc.text(splitText, margin + 120, y);
    y += Math.max(14, splitText.length * 12);
  }

  y += 10;

  // Section 2: Departmental Assignment & SLA
  drawSectionHeader(doc, '2. DEPARTMENTAL ROUTING & SLA COMPLIANCE', margin, y, contentWidth);
  y += 24;

  const deptRows = [
    ['Assigned Dept:', issue.department],
    ['Assigned Officer:', issue.assignedOfficer || 'Pending Field Assignment'],
    ['Target Resolution:', `${issue.slaTargetHours || 48} Hours`],
    ['SLA Deadline:', issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleString() : 'Within 48h'],
    ['SLA Status:', issue.slaBreached ? 'BREACHED (+Escalated)' : 'Compliant / Active'],
  ];

  for (const [label, val] of deptRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, margin + 120, y);
    y += 14;
  }

  y += 10;

  // Section 3: AI Triage Diagnostic
  drawSectionHeader(doc, '3. GEMINI AI TRIAGE & FIELD RECOMMENDATION', margin, y, contentWidth);
  y += 24;

  const aiRows = [
    ['AI Summary:', issue.aiSummary || 'Automated triage completed.'],
    ['Impact Analysis:', issue.impactReasoning || 'Risk prioritized according to safety metrics.'],
    ['Field Action:', issue.recommendedAction || 'Field engineer dispatched for on-ground repair.'],
  ];

  for (const [label, val] of aiRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitText = doc.splitTextToSize(String(val), contentWidth - 130);
    doc.text(splitText, margin + 120, y);
    y += Math.max(14, splitText.length * 12);
  }

  y += 10;

  // Check if we need a new page for updates and action history
  if (y > pageHeight - 160) {
    doc.addPage();
    y = 40;
  }

  // Section 4: Public Updates (Citizen Visible)
  drawSectionHeader(doc, '4. CITIZEN PUBLIC UPDATES & PROGRESS', margin, y, contentWidth);
  y += 24;

  const updates = (issue.publicUpdates && issue.publicUpdates.length > 0)
    ? issue.publicUpdates
    : [{ id: '1', update: 'Case file opened and routed to municipal field department.', timestamp: issue.createdAt, author: 'System' }];

  for (const item of updates.slice(0, 5)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`[${new Date(item.timestamp).toLocaleDateString()}] ${item.author || 'Authority'}:`, margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const split = doc.splitTextToSize(item.update, contentWidth - 16);
    doc.text(split, margin + 8, y + 10);
    y += 14 + split.length * 10;

    if (y > pageHeight - 100) {
      doc.addPage();
      y = 40;
    }
  }

  y += 10;

  // Section 5: Complete Action History
  drawSectionHeader(doc, '5. COMPLETE ACTION & AUDIT TRAIL', margin, y, contentWidth);
  y += 24;

  const actions = (issue.actionHistory && issue.actionHistory.length > 0)
    ? issue.actionHistory
    : (issue.statusHistory || []).map((sh) => ({
        timestamp: sh.timestamp,
        action: `Status: ${sh.status} - ${sh.note}`,
        performedBy: 'Municipal Authority',
        role: 'Authority',
      }));

  for (const act of actions.slice(0, 8)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), margin + 8, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const actionDesc = `${act.action} (by ${act.performedBy} [${act.role}])`;
    const splitDesc = doc.splitTextToSize(actionDesc, contentWidth - 120);
    doc.text(splitDesc, margin + 110, y);
    y += Math.max(14, splitDesc.length * 11);

    if (y > pageHeight - 80) {
      doc.addPage();
      y = 40;
    }
  }

  // Official Footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 10, margin + contentWidth, footerY - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CivicResolve Official Digital Case Record | Verified Municipal Corporation Public Documentation | civicresolve.gov', margin, footerY);

  doc.save(`CivicResolve_Case_${caseId}.pdf`);
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x, y - 2, width, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 6, y + 10);
}
