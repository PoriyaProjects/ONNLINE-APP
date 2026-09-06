import {
  mapChamelleonToPatientDetails,
  escapeHtml,
  validateBedsoreImageFile,
  BEDSORE_MAX_IMAGE_BYTES,
  getBodyPartLabel,
  groupPatientsByDepartment,
  filterChamelleonPatients
} from './bedsore.utils';

describe('bedsore.utils', () => {
  it('maps Chamelleon patient fields to PatientDetails', () => {
    const result = mapChamelleonToPatientDetails({
      Row_ID: '1',
      IDNumber: '123',
      FirstName: 'A',
      FatherName: 'B',
      LastName: 'C',
      CaseNumber: '99',
      Age: '45'
    });
    expect(result.RowID).toBe('1');
    expect(result.Passport).toBe('123');
    expect(result.DOB).toBe('45');
    expect(result.CaseNumber).toBe('99');
  });

  it('preserves already-mapped PatientDetails', () => {
    const input = {
      RowID: null,
      Passport: '999',
      DOB: '30',
      FirstName: 'X',
      FatherName: 'Y',
      LastName: 'Z',
      CaseNumber: '1'
    };
    const result = mapChamelleonToPatientDetails(input);
    expect(result.Passport).toBe('999');
    expect(result.DOB).toBe('30');
  });

  it('escapes HTML in patient fields', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('rejects oversized or invalid image files', () => {
    const bigFile = new File([new ArrayBuffer(BEDSORE_MAX_IMAGE_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateBedsoreImageFile(bigFile)).toContain('5MB');

    const badType = new File([new ArrayBuffer(10)], 'x.txt', { type: 'text/plain' });
    expect(validateBedsoreImageFile(badType)).toContain('לא נתמך');
  });

  it('returns Hebrew body part labels', () => {
    expect(getBodyPartLabel('head')).toBe('ראש');
    expect(getBodyPartLabel('left_arm')).toBe('זרוע שמאל');
    expect(getBodyPartLabel('unknown')).toBe('unknown');
    expect(getBodyPartLabel('')).toBe('');
  });

  it('filters and groups Chamelleon patients by department', () => {
    const patients = [
      { DepartName: 'כירורגיה', FirstName: 'דן', FatherName: '', LastName: 'כהן', CaseNumber: '1', IDNumber: '111', Age: '40' },
      { DepartName: 'כירורגיה', FirstName: 'נועה', FatherName: '', LastName: 'לוי', CaseNumber: '2', IDNumber: '222', Age: '30' },
      { DepartName: 'פנימית', FirstName: 'יוסי', FatherName: '', LastName: 'ישראלי', CaseNumber: '3', IDNumber: '333', Age: '50' }
    ];
    const filtered = filterChamelleonPatients(patients, 'כירורגיה');
    expect(filtered.length).toBe(2);

    const byName = filterChamelleonPatients(patients, 'נועה');
    expect(byName.length).toBe(1);
    expect(byName[0].CaseNumber).toBe('2');

    const groups = groupPatientsByDepartment(patients);
    expect(groups.length).toBe(2);
    const surgery = groups.find(g => g.departName === 'כירורגיה');
    expect(surgery.patients.length).toBe(2);
  });
});
