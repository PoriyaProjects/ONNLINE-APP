import { TRAINING_ERROR_MESSAGE_HE, TrainingErrorCodes } from '../models';

describe('Phase 6 TRAINING_ERROR_MESSAGE_HE', () => {
  const codes = [
    TrainingErrorCodes.QrRevoked,
    TrainingErrorCodes.AttendanceWindowNotOpen,
    TrainingErrorCodes.AttendanceWindowExpired,
    TrainingErrorCodes.IdentityMismatch,
    TrainingErrorCodes.EmployeeNotFound,
    TrainingErrorCodes.RegistrationCancelled,
    TrainingErrorCodes.SessionCancelled,
  ];

  it('maps Phase 6 attendance error codes to Hebrew', () => {
    codes.forEach((c) => expect(TRAINING_ERROR_MESSAGE_HE[c]).toBeTruthy());
  });
});
