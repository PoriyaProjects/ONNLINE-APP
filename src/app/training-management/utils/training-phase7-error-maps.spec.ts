import { TRAINING_ERROR_MESSAGE_HE, TrainingErrorCodes } from '../models';

describe('Phase 7 TRAINING_ERROR_MESSAGE_HE', () => {
  const codes = [
    TrainingErrorCodes.CertificateNotFound,
    TrainingErrorCodes.CertificateAlreadyExists,
    TrainingErrorCodes.CertificateTemplateMissing,
    TrainingErrorCodes.CertificateSignatureMissing,
    TrainingErrorCodes.CertificateNumberFailed,
    TrainingErrorCodes.CertificateFileNotFound,
    TrainingErrorCodes.CertificateAccessDenied,
    TrainingErrorCodes.CertificateCancelled,
    TrainingErrorCodes.CertificateEmployeeEmailMissing,
    TrainingErrorCodes.CertificateDownloadFailed,
    TrainingErrorCodes.EmailConfigurationMissing,
    TrainingErrorCodes.EmailRecipientMissing,
    TrainingErrorCodes.EmailAttachmentTooLarge,
    TrainingErrorCodes.EmailAlreadySent,
    TrainingErrorCodes.EmailSendInProgress,
    TrainingErrorCodes.EmailRetryLimitReached,
    TrainingErrorCodes.NotificationConfigurationMissing,
    TrainingErrorCodes.NotificationRecipientMissing,
    TrainingErrorCodes.NotificationDeliveryFailed,
    TrainingErrorCodes.NotificationAlreadySent,
    TrainingErrorCodes.NotificationSendInProgress,
    TrainingErrorCodes.NotificationRetryLimitReached,
    TrainingErrorCodes.SessionNotCompleted,
    TrainingErrorCodes.AttendanceNotConfirmed,
  ];

  it('maps Phase 7 certificate/email/reminder error codes to Hebrew', () => {
    codes.forEach((c) => expect(TRAINING_ERROR_MESSAGE_HE[c]).toBeTruthy());
  });
});
