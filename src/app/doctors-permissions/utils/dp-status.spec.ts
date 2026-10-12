import {
  actionLabel,
  canApproveStatus,
  canRemoveStatus,
  canResubmitStatus,
  formatDay,
  statusClass,
  statusLabel,
} from './dp-status';

describe('doctor permission status helpers', () => {
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];

  it('maps every status to a Hebrew label and chip', () => {
    statuses.forEach((status) => {
      expect(statusLabel(status).length).toBeGreaterThan(0);
      expect(statusClass(status)).toContain('dp-chip');
    });
  });

  it('allows approval only before a decision and resubmit only after rejection', () => {
    expect(canApproveStatus('PENDING_APPROVAL')).toBeTruthy();
    expect(canApproveStatus('DRAFT')).toBeTruthy();
    expect(canApproveStatus('REJECTED')).toBeFalsy();
    expect(canApproveStatus('EXPIRED')).toBeFalsy();
    expect(canResubmitStatus('REJECTED')).toBeTruthy();
    expect(canResubmitStatus('PENDING_APPROVAL')).toBeFalsy();
    expect(canRemoveStatus('PENDING_APPROVAL')).toBeTruthy();
    expect(canRemoveStatus('APPROVED')).toBeFalsy();
  });

  it('labels audit actions in Hebrew', () => {
    expect(actionLabel('APPROVE')).toBe('אישור');
    expect(actionLabel('ADMIN_OVERRIDE')).toBe('חריגת מנהל');
    expect(actionLabel('REJECT')).not.toBe(actionLabel('APPROVE'));
  });

  it('formats date-only values without shifting the day', () => {
    expect(formatDay('2026-10-07')).toBe('07/10/2026');
    expect(formatDay('')).toBe('—');
  });
});
