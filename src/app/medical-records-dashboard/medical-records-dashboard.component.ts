import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {
  BoxDetailRow,
  BoxStatusSummary,
  CaseDetailRow,
  CasesPerDateSummary,
  MedicalRecordsDashboardDTO,
  MissingCasesSummary,
  WrongCaseDetailRow,
} from './medical-records.model';
import { MedicalRecordsService } from './medical-records.service';

interface StatusOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-medical-records-dashboard',
  templateUrl: './medical-records-dashboard.component.html',
  styleUrls: ['./medical-records-dashboard.component.css'],
})
export class MedicalRecordsDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) casePaginator?: MatPaginator;
  @ViewChild(MatSort) caseSort?: MatSort;

  readonly statusOptions: StatusOption[] = [
    { value: 'חזר ונקלט במלואו', label: 'חזר ונקלט במלואו' },
    { value: 'עוד לא נקלט', label: 'עוד לא נקלט' },
    { value: 'קליטה לא מלאה', label: 'קליטה לא מלאה' },
  ];

  readonly boxDetailsColumns = ['BoxID', 'InsertDate', 'QOnnline', 'QNamer', 'Remarks'];
  readonly caseDetailsColumns = ['BoxID', 'CaseNumber', 'SavedByImageStore', 'MDate'];

  loading = false;
  hasLoaded = false;
  errorMessage = '';

  boxIdSearch = '';
  selectedBoxIds: string[] = [];
  statusFilter = '';
  mDateFilter = '';

  selectedStatusCrossFilter: string | null = null;
  selectedMonthCrossFilter: string | null = null;
  selectedMissingBoxCrossFilter: string | null = null;

  boxIdOptions: string[] = [];

  dto: MedicalRecordsDashboardDTO = this.emptyDto();

  filteredBoxDetails: BoxDetailRow[] = [];
  filteredMissingCasesSummaries: MissingCasesSummary[] = [];
  filteredWrongCaseDetails: WrongCaseDetailRow[] = [];
  caseDetailsDataSource = new MatTableDataSource<CaseDetailRow>([]);

  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.caseDetailsDataSource.paginator = this.casePaginator || null;
    this.caseDetailsDataSource.sort = this.caseSort || null;
  }

  get totalProcessedBoxes(): number {
    return this.dto.BoxStatusSummaries.reduce((sum, row) => sum + (Number(row.BoxCount) || 0), 0);
  }

  get totalRecordedCases(): number {
    return this.dto.CasesPerDateSummaries.reduce((sum, row) => sum + (Number(row.TotalCases) || 0), 0);
  }

  get totalMissingCases(): number {
    return this.dto.MissingCasesSummaries.reduce((sum, row) => sum + (Number(row.MissingCount) || 0), 0);
  }

  get hasAnyCrossFilter(): boolean {
    return !!(this.selectedStatusCrossFilter || this.selectedMonthCrossFilter || this.selectedMissingBoxCrossFilter);
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    const boxFilter = this.selectedBoxIds.length ? this.selectedBoxIds.join(',') : this.boxIdSearch.trim();
    this.medicalRecordsService
      .getDashboardData(boxFilter, this.statusFilter, this.mDateFilter)
      .subscribe({
        next: dto => {
          this.dto = dto || this.emptyDto();
          this.hasLoaded = true;
          this.buildFilterOptions();
          this.applyClientFilters();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.hasLoaded = true;
          this.dto = this.emptyDto();
          this.applyClientFilters();
          this.errorMessage = 'אירעה שגיאה בטעינת נתוני הרשומות הרפואיות';
        },
      });
  }

  resetFilters(): void {
    this.boxIdSearch = '';
    this.selectedBoxIds = [];
    this.statusFilter = '';
    this.mDateFilter = '';
    this.selectedStatusCrossFilter = null;
    this.selectedMonthCrossFilter = null;
    this.selectedMissingBoxCrossFilter = null;
    this.loadData();
  }

  clearBoxSearch(): void {
    this.boxIdSearch = '';
    this.applyClientFilters();
  }

  toggleStatusCrossFilter(status: string): void {
    this.selectedStatusCrossFilter = this.selectedStatusCrossFilter === status ? null : status;
    this.applyClientFilters();
  }

  toggleMonthCrossFilter(mDate: string): void {
    this.selectedMonthCrossFilter = this.selectedMonthCrossFilter === mDate ? null : mDate;
    this.applyClientFilters();
  }

  toggleMissingBoxCrossFilter(boxId: string): void {
    this.selectedMissingBoxCrossFilter = this.selectedMissingBoxCrossFilter === boxId ? null : boxId;
    this.applyClientFilters();
  }

  clearCrossFilters(): void {
    this.selectedStatusCrossFilter = null;
    this.selectedMonthCrossFilter = null;
    this.selectedMissingBoxCrossFilter = null;
    this.applyClientFilters();
  }

  isWarningBoxRow(row: BoxDetailRow): boolean {
    const qOnnline = Number(row.QOnnline ?? 0);
    const qNamer = Number(row.QNamer ?? 0);
    return qOnnline !== qNamer || !this.isCompleteStatus(row.Remarks, row.BoxStatus);
  }

  isSavedByImageStoreOk(row: CaseDetailRow): boolean {
    return (row.SavedByImageStore || '').trim().toUpperCase() === 'V';
  }

  statusClass(status: string): string {
    const s = this.normalizeStatus(status);
    if (s.includes('במלואו')) {
      return 'status-chip status-chip--ok';
    }
    if (s.includes('לא נקלט')) {
      return 'status-chip status-chip--missing';
    }
    return 'status-chip status-chip--partial';
  }

  isActiveStatusChip(status: string): boolean {
    return this.selectedStatusCrossFilter === status;
  }

  applyClientFilters(): void {
    const normalizedSelectedStatus = this.normalizeStatus(this.selectedStatusCrossFilter || this.statusFilter);
    const monthFilter = this.selectedMonthCrossFilter || this.mDateFilter;
    const textBoxFilter = this.boxIdSearch.trim().toLowerCase();
    const boxSelectionSet = new Set(this.selectedBoxIds);

    const boxPasses = (boxId: string): boolean => {
      const clean = (boxId || '').toLowerCase();
      if (boxSelectionSet.size && !boxSelectionSet.has(boxId)) {
        return false;
      }
      if (textBoxFilter && !clean.includes(textBoxFilter)) {
        return false;
      }
      if (this.selectedMissingBoxCrossFilter && boxId !== this.selectedMissingBoxCrossFilter) {
        return false;
      }
      return true;
    };

    this.filteredBoxDetails = this.dto.BoxDetails.filter(row => {
      if (!boxPasses(row.BoxID)) {
        return false;
      }
      if (normalizedSelectedStatus && !this.normalizeStatus(row.Remarks).includes(normalizedSelectedStatus)) {
        return false;
      }
      if (monthFilter && this.toYearMonth(row.InsertDate) !== monthFilter) {
        return false;
      }
      return true;
    });

    const filteredBoxSet = new Set(this.filteredBoxDetails.map(r => r.BoxID));
    const boxRemarksById = new Map<string, string>(this.dto.BoxDetails.map(r => [r.BoxID, r.Remarks || '']));

    const filteredCaseDetails = this.dto.CaseDetails.filter(row => {
      if (!boxPasses(row.BoxID)) {
        return false;
      }
      if (monthFilter && (row.MDate || '') !== monthFilter) {
        return false;
      }
      if (normalizedSelectedStatus) {
        const remarks = boxRemarksById.get(row.BoxID) || '';
        if (!this.normalizeStatus(remarks).includes(normalizedSelectedStatus)) {
          return false;
        }
      }
      if (filteredBoxSet.size && !filteredBoxSet.has(row.BoxID) && (normalizedSelectedStatus || monthFilter)) {
        return false;
      }
      return true;
    });

    this.caseDetailsDataSource.data = filteredCaseDetails;
    if (this.casePaginator) {
      this.casePaginator.firstPage();
    }

    const monthFilteredBoxSet = new Set(filteredCaseDetails.map(r => r.BoxID));
    this.filteredMissingCasesSummaries = this.dto.MissingCasesSummaries.filter(row => {
      if (!boxPasses(row.BoxID)) {
        return false;
      }
      if (normalizedSelectedStatus) {
        const remarks = boxRemarksById.get(row.BoxID) || '';
        if (!this.normalizeStatus(remarks).includes(normalizedSelectedStatus)) {
          return false;
        }
      }
      if (monthFilter && monthFilteredBoxSet.size && !monthFilteredBoxSet.has(row.BoxID)) {
        return false;
      }
      return true;
    });

    const missingSet = new Set(this.filteredMissingCasesSummaries.map(r => r.BoxID));
    this.filteredWrongCaseDetails = this.dto.WrongCaseDetails.filter(row => {
      if (!boxPasses(row.BoxID)) {
        return false;
      }
      if (missingSet.size && !missingSet.has(row.BoxID) && this.selectedMissingBoxCrossFilter) {
        return false;
      }
      if (normalizedSelectedStatus) {
        const remarks = boxRemarksById.get(row.BoxID) || '';
        if (!this.normalizeStatus(remarks).includes(normalizedSelectedStatus)) {
          return false;
        }
      }
      if (monthFilter && monthFilteredBoxSet.size && !monthFilteredBoxSet.has(row.BoxID)) {
        return false;
      }
      return true;
    });
  }

  private buildFilterOptions(): void {
    const allBoxes = new Set<string>();
    [...this.dto.BoxDetails, ...this.dto.CaseDetails, ...this.dto.WrongCaseDetails].forEach(row => {
      allBoxes.add(row.BoxID);
    });
    this.boxIdOptions = Array.from(allBoxes).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status || '').trim().toLowerCase();
  }

  private isCompleteStatus(remarks: string, boxStatus: number): boolean {
    const normalized = this.normalizeStatus(remarks);
    if (normalized.includes('במלואו')) {
      return true;
    }
    return Number(boxStatus) === 1;
  }

  private toYearMonth(value: string): string {
    const v = (value || '').trim();
    if (!v) {
      return '';
    }
    if (/^\d{4}-\d{2}$/.test(v)) {
      return v;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      return v.slice(0, 7);
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }

  private emptyDto(): MedicalRecordsDashboardDTO {
    return {
      BoxStatusSummaries: [],
      CasesPerDateSummaries: [],
      MissingCasesSummaries: [],
      BoxDetails: [],
      CaseDetails: [],
      WrongCaseDetails: [],
    };
  }
}
