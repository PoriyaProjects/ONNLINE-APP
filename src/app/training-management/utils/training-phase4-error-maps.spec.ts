import { TRAINING_ERROR_MESSAGE_HE, TrainingErrorCodes } from '../models';

describe('Phase 4 TRAINING_ERROR_MESSAGE_HE', () => {
  const codes = [
    TrainingErrorCodes.CourseCodeExists,
    TrainingErrorCodes.CourseInactive,
    TrainingErrorCodes.InvalidStatusTransition,
    TrainingErrorCodes.SessionNotEditable,
    TrainingErrorCodes.SessionAlreadyCancelled,
    TrainingErrorCodes.SessionAlreadyCompleted,
    TrainingErrorCodes.SessionInvalidTimeRange,
    TrainingErrorCodes.SessionInvalidRegistrationDeadline,
    TrainingErrorCodes.SessionInvalidAttendanceWindow,
    TrainingErrorCodes.CapacityBelowRegistrations,
    TrainingErrorCodes.LecturerNotFound,
    TrainingErrorCodes.LocationInvalid,
    TrainingErrorCodes.InvalidAttendanceTransition,
    TrainingErrorCodes.DatabaseDependencyMissing,
  ];

  it('maps all Phase 4 admin error codes to Hebrew', () => {
    codes.forEach((code) => {
      expect(TRAINING_ERROR_MESSAGE_HE[code]).toBeTruthy();
    });
  });

  it('aliases database dependency missing to store-unavailable message', () => {
    expect(TRAINING_ERROR_MESSAGE_HE[TrainingErrorCodes.DatabaseDependencyMissing]).toBe(
      TRAINING_ERROR_MESSAGE_HE[TrainingErrorCodes.DataStoreUnavailable]
    );
  });
});
