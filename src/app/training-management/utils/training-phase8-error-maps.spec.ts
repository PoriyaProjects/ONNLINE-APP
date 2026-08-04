import { TRAINING_ERROR_MESSAGE_HE, TrainingErrorCodes } from '../models';
import { excelSafeCell, assertExportRowLimit } from './training-report-excel.util';
import { TRAINING_REPORT_EXPORT_MAX_ROWS } from '../models';

describe('Phase 8 report error maps and excel safety', () => {
  const codes = [
    TrainingErrorCodes.ReportUnauthorized,
    TrainingErrorCodes.ReportInvalidFilter,
    TrainingErrorCodes.ReportInvalidDateRange,
    TrainingErrorCodes.ReportDateRangeTooLarge,
    TrainingErrorCodes.ReportInvalidSort,
    TrainingErrorCodes.ReportEmployeeNotFound,
    TrainingErrorCodes.ReportDepartmentNotAllowed,
    TrainingErrorCodes.ReportDataUnavailable,
    TrainingErrorCodes.ReportExportFailed,
    TrainingErrorCodes.ReportExportTooLarge,
    TrainingErrorCodes.ReportComplianceRulesMissing,
    TrainingErrorCodes.ReportDependencyMissing,
  ];

  it('maps Phase 8 report error codes to Hebrew', () => {
    codes.forEach((c) => expect(TRAINING_ERROR_MESSAGE_HE[c]).toBeTruthy());
  });

  it('prefixes formula-like Excel cells', () => {
    expect(excelSafeCell('=1+1')).toBe("'=1+1");
    expect(excelSafeCell('+cmd')).toBe("'+cmd");
    expect(excelSafeCell('-1')).toBe("'-1");
    expect(excelSafeCell('@x')).toBe("'@x");
    expect(excelSafeCell('safe')).toBe('safe');
    expect(excelSafeCell(12)).toBe(12);
  });

  it('rejects oversized exports', () => {
    expect(assertExportRowLimit(TRAINING_REPORT_EXPORT_MAX_ROWS)).toBeNull();
    expect(assertExportRowLimit(TRAINING_REPORT_EXPORT_MAX_ROWS + 1)).toContain('גדול מדי');
  });
});
