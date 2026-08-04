import { TrainingCourseStatus, TrainingSessionStatus } from '../models';
import {
  canActivateCourse,
  canCancelSession,
  canDeactivateCourse,
  canEditSession,
  canManualConfirmAttendance,
  canManualMarkAbsent,
} from './training-status-transition.util';
import { TrainingAttendanceStatus } from '../models';

describe('training-status-transition.util', () => {
  it('allows activate from draft/inactive only', () => {
    expect(canActivateCourse(TrainingCourseStatus.Draft)).toBe(true);
    expect(canActivateCourse(TrainingCourseStatus.Inactive)).toBe(true);
    expect(canActivateCourse(TrainingCourseStatus.Active)).toBe(false);
  });

  it('allows deactivate from active only', () => {
    expect(canDeactivateCourse(TrainingCourseStatus.Active)).toBe(true);
    expect(canDeactivateCourse(TrainingCourseStatus.Draft)).toBe(false);
  });

  it('restricts session edit/cancel by status', () => {
    expect(canEditSession(TrainingSessionStatus.Open)).toBe(true);
    expect(canEditSession(TrainingSessionStatus.Cancelled)).toBe(false);
    expect(canCancelSession(TrainingSessionStatus.Open)).toBe(true);
    expect(canCancelSession(TrainingSessionStatus.Completed)).toBe(false);
  });

  it('restricts manual attendance transitions', () => {
    expect(canManualConfirmAttendance(TrainingAttendanceStatus.Pending)).toBe(true);
    expect(canManualConfirmAttendance(TrainingAttendanceStatus.Confirmed)).toBe(false);
    expect(canManualMarkAbsent(TrainingAttendanceStatus.Confirmed)).toBe(true);
    expect(canManualMarkAbsent(TrainingAttendanceStatus.Revoked)).toBe(false);
  });
});
