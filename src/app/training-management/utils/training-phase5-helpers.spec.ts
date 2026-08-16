import { TRAINING_ERROR_MESSAGE_HE, TrainingErrorCodes } from '../models';
import { buildTrainingAttendanceQrPayload } from './training-qr-payload.util';
import { summarizeLecturerAttendance } from './lecturer-attendance-summary.util';
import { TrainingAttendanceStatus } from '../models';

describe('Phase 5 error maps and helpers', () => {
  const codes = [
    TrainingErrorCodes.AttendanceAlreadyOpen,
    TrainingErrorCodes.AttendanceOpenNotAllowed,
    TrainingErrorCodes.AttendanceNotOpen,
    TrainingErrorCodes.AttendanceWindowStillOpen,
    TrainingErrorCodes.SessionNotReadyForCompletion,
    TrainingErrorCodes.LecturerNotAssigned,
  ];

  it('maps Phase 5 lecturer error codes to Hebrew', () => {
    codes.forEach((c) => expect(TRAINING_ERROR_MESSAGE_HE[c]).toBeTruthy());
  });

  it('builds attendance QR payload without exposing unrelated data', () => {
    const payload = buildTrainingAttendanceQrPayload('tok-abc');
    expect(payload.indexOf('training-management/attendance/tok-abc')).toBeGreaterThan(-1);
    expect(payload.indexOf('Employee')).toBe(-1);
  });

  it('summarizes attendance counts', () => {
    const summary = summarizeLecturerAttendance([
      {
        RegistrationId: 1,
        SessionId: 1,
        EmployeeID: '1',
        AttendanceStatus: TrainingAttendanceStatus.Confirmed,
        IsManualUpdate: false,
      },
      {
        RegistrationId: 2,
        SessionId: 1,
        EmployeeID: '2',
        AttendanceStatus: TrainingAttendanceStatus.Pending,
        IsManualUpdate: false,
      },
      {
        RegistrationId: 3,
        SessionId: 1,
        EmployeeID: '3',
        AttendanceStatus: TrainingAttendanceStatus.Revoked,
        IsManualUpdate: false,
      },
    ]);
    expect(summary.registered).toBe(2);
    expect(summary.confirmed).toBe(1);
    expect(summary.awaiting).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.remaining).toBe(1);
  });
});
