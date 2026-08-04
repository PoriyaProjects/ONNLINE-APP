import { TrainingSessionStatus } from '../models';
import {
  canCloseAttendanceWindow,
  canCompleteSession,
  canOpenAttendanceWindow,
  canShowQr,
} from './training-status-transition.util';

describe('Phase 5 attendance window / complete helpers', () => {
  it('opens only when not already open and session active', () => {
    expect(canOpenAttendanceWindow(TrainingSessionStatus.Open, false)).toBe(true);
    expect(canOpenAttendanceWindow(TrainingSessionStatus.Open, true)).toBe(false);
    expect(canOpenAttendanceWindow(TrainingSessionStatus.Cancelled, false)).toBe(false);
    expect(canOpenAttendanceWindow(TrainingSessionStatus.Completed, false)).toBe(false);
  });

  it('closes only when window open', () => {
    expect(canCloseAttendanceWindow(TrainingSessionStatus.Open, true)).toBe(true);
    expect(canCloseAttendanceWindow(TrainingSessionStatus.Open, false)).toBe(false);
  });

  it('shows QR only while window open', () => {
    expect(canShowQr(TrainingSessionStatus.Open, true)).toBe(true);
    expect(canShowQr(TrainingSessionStatus.Open, false)).toBe(false);
  });

  it('completes only when window closed and not finished', () => {
    expect(canCompleteSession(TrainingSessionStatus.Open, false)).toBe(true);
    expect(canCompleteSession(TrainingSessionStatus.Open, true)).toBe(false);
    expect(canCompleteSession(TrainingSessionStatus.Completed, false)).toBe(false);
    expect(canCompleteSession(TrainingSessionStatus.Cancelled, false)).toBe(false);
  });
});
