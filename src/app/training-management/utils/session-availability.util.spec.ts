import {
  buildSessionAvailability,
  SessionAvailabilityView,
} from './session-availability.util';
import { TrainingSessionStatus } from '../models';
import { trainingErrorMessage } from './training-error-message.util';
import { TrainingErrorCodes } from '../models';

describe('buildSessionAvailability', () => {
  it('allows register even when actor flag is registered (manager flow)', () => {
    const v: SessionAvailabilityView = buildSessionAvailability({
      Status: TrainingSessionStatus.Open,
      AvailablePlaces: 5,
      RegistrationCloseAt: '2099-01-01T00:00:00',
      IsRegisteredByCurrentEmployee: true,
    });
    expect(v.kind).toBe('available');
    expect(v.canShowRegister).toBe(true);
  });

  it('marks full sessions', () => {
    const v = buildSessionAvailability({
      Status: TrainingSessionStatus.Open,
      AvailablePlaces: 0,
      RegistrationCloseAt: '2099-01-01T00:00:00',
    });
    expect(v.kind).toBe('full');
    expect(v.canShowRegister).toBe(false);
  });

  it('marks few places remaining', () => {
    const v = buildSessionAvailability({
      Status: TrainingSessionStatus.Open,
      AvailablePlaces: 2,
      RegistrationCloseAt: '2099-01-01T00:00:00',
    });
    expect(v.kind).toBe('few');
    expect(v.canShowRegister).toBe(true);
  });

  it('marks closed when registration deadline passed', () => {
    const v = buildSessionAvailability({
      Status: TrainingSessionStatus.Open,
      AvailablePlaces: 10,
      RegistrationCloseAt: '2000-01-01T00:00:00',
    });
    expect(v.kind).toBe('closed');
    expect(v.canShowRegister).toBe(false);
  });
});

describe('trainingErrorMessage', () => {
  it('maps known business codes to Hebrew', () => {
    expect(
      trainingErrorMessage({
        ErrorCode: TrainingErrorCodes.SessionFull,
        Message: null,
      })
    ).toContain('מלא');
  });

  it('maps data store unavailable', () => {
    expect(
      trainingErrorMessage({
        ErrorCode: TrainingErrorCodes.DataStoreUnavailable,
        Message: null,
      })
    ).toContain('מאגר');
  });
});
