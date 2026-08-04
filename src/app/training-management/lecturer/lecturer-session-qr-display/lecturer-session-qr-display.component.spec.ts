import { buildTrainingAttendanceQrPayload } from '../../utils/training-qr-payload.util';

describe('LecturerSessionQrDisplay token handling', () => {
  it('does not write tokens to localStorage/sessionStorage helpers', () => {
    const token = 'secret-token-xyz';
    const payload = buildTrainingAttendanceQrPayload(token);
    expect(payload).toContain(token);
    expect(localStorage.getItem('QrToken')).toBeNull();
    expect(sessionStorage.getItem('QrToken')).toBeNull();
    expect(localStorage.getItem('trainingQrToken')).toBeNull();
  });
});
