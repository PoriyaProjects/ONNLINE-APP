import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

export interface OralPreparation {
  id: number;
  preparationName: string;
  concentration: string;
  finalVolume: string;
  routeOfAdministration: string;
  rawMaterials: string;
  suspendingAgent: string;
  shelfLife: string;
  storageConditions: string;
  usageNotes: string;
}

@Component({
  selector: 'app-medication-selector-modal',
  template: `
    <div class="modal-wrapper" dir="rtl">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-title">
            <mat-icon class="title-icon">local_pharmacy</mat-icon>
            <span>בחר תרופה / הוסף חדשה</span>
          </div>
          <button type="button" class="btn-close" aria-label="סגור" (click)="activeModal.dismiss()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner [diameter]="40"></mat-spinner>
          <p class="loading-text">טוען תרופות...</p>
        </div>

        <!-- List View with Data Table -->
        <div *ngIf="!showAddNewForm && !isLoading" class="list-view">
          <div class="search-section">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>חפש תרופה</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchText" 
                (keyup)="applyFilter($event)"
              />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>

          <!-- Data Table -->
          <div class="table-container">
            <table mat-table [dataSource]="dataSource" matSort class="medications-table">
              <!-- Preparation Name Column -->
              <ng-container matColumnDef="preparationName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>שם הכנה</th>
                <td mat-cell *matCellDef="let element" class="cell-bold">
                  {{ element.preparationName }}
                </td>
              </ng-container>

              <!-- Concentration Column -->
              <ng-container matColumnDef="concentration">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>ריכוז</th>
                <td mat-cell *matCellDef="let element">{{ element.concentration }}</td>
              </ng-container>

              <!-- Final Volume Column -->
              <ng-container matColumnDef="finalVolume">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>נפח סופי</th>
                <td mat-cell *matCellDef="let element">{{ element.finalVolume }}</td>
              </ng-container>

              <!-- Route of Administration Column -->
              <ng-container matColumnDef="routeOfAdministration">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>דרך מתן</th>
                <td mat-cell *matCellDef="let element">{{ element.routeOfAdministration }}</td>
              </ng-container>

              <!-- Storage Conditions Column -->
              <ng-container matColumnDef="storageConditions">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>תנאי אחסון</th>
                <td mat-cell *matCellDef="let element">{{ element.storageConditions }}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions">פעולות</th>
                <td mat-cell *matCellDef="let element" class="col-actions">
                  <button 
                    type="button" 
                    class="action-btn btn-select"
                    (click)="selectMedication(element)"
                    matTooltip="בחר תרופה זו">
                    <mat-icon>check_circle</mat-icon>
                    בחר
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>

              <!-- Empty State Row -->
              <tr class="mat-row empty-row" *ngIf="dataSource.filteredData.length === 0">
                <td class="empty-message" [attr.colspan]="displayedColumns.length">
                  <mat-icon>inbox</mat-icon>
                  <span>לא נמצאו תרופות התואמות לחיפוש</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Paginator -->
          <mat-paginator 
            [pageSizeOptions]="[5, 10, 25]" 
            showFirstLastButtons
            aria-label="בחר עמוד">
          </mat-paginator>

          <!-- Results Info -->
          <div class="results-footer">
            <span>נמצאו {{ dataSource.filteredData.length }} תרופות</span>
          </div>
        </div>

        <!-- Form View for Adding New Medication -->
        <div *ngIf="showAddNewForm && !isLoading" class="form-view">
          <h5 class="form-title">
            <mat-icon>add_circle</mat-icon>
            <span>הוסף תרופה חדשה</span>
          </h5>

          <form [formGroup]="newMedicationForm" class="medication-form">
            <!-- Row 1: Preparation Name & Concentration -->
            <div class="form-row">
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>שם תרופה <span class="required">*</span></mat-label>
                  <input matInput formControlName="preparationName" type="text" />
                  <mat-error *ngIf="newMedicationForm.get('preparationName').invalid">
                    שדה זה הוא חובה
                  </mat-error>
                </mat-form-field>
              </div>
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>ריכוז</mat-label>
                  <input matInput formControlName="concentration" type="text" />
                </mat-form-field>
              </div>
            </div>

            <!-- Row 2: Final Volume & Route of Administration -->
            <div class="form-row">
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>נפח סופי (מ"ל)</mat-label>
                  <input matInput formControlName="finalVolume" type="text" />
                </mat-form-field>
              </div>
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>דרך מתן</mat-label>
                  <input matInput formControlName="routeOfAdministration" type="text" />
                </mat-form-field>
              </div>
            </div>

            <!-- Row 3: Raw Materials & Suspending Agent -->
            <div class="form-row">
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>חומרי גלם</mat-label>
                  <input matInput formControlName="rawMaterials" type="text" />
                </mat-form-field>
              </div>
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>חומר מרחף</mat-label>
                  <input matInput formControlName="suspendingAgent" type="text" />
                </mat-form-field>
              </div>
            </div>

            <!-- Row 4: Shelf Life & Storage Conditions -->
            <div class="form-row">
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>תוקף</mat-label>
                  <input matInput formControlName="shelfLife" type="text" />
                </mat-form-field>
              </div>
              <div class="form-group">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>תנאי אחסון</mat-label>
                  <input matInput formControlName="storageConditions" type="text" />
                </mat-form-field>
              </div>
            </div>

            <!-- Row 5: Usage Notes (Full Width) -->
            <div class="form-row full-width">
              <div class="form-group w-100">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>הערות שימוש</mat-label>
                  <textarea matInput formControlName="usageNotes" rows="3"></textarea>
                </mat-form-field>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <div class="footer-actions">
          <!-- Left Section -->
          <div class="actions-left">
            <button 
              type="button" 
              class="btn btn-secondary"
              (click)="activeModal.dismiss()">
              <mat-icon>close</mat-icon>
              <span>ביטול</span>
            </button>
          </div>

          <!-- Right Section -->
          <div class="actions-right">
            <button 
              type="button" 
              class="btn btn-outline-primary"
              (click)="toggleAddNewForm()">
              <mat-icon>{{ showAddNewForm ? 'arrow_back' : 'add' }}</mat-icon>
              <span>{{ showAddNewForm ? 'חזור לרשימה' : 'הוסף תרופה חדשה' }}</span>
            </button>

            <button 
              *ngIf="showAddNewForm"
              type="button" 
              class="btn btn-primary"
              [disabled]="newMedicationForm.invalid || isSaving"
              (click)="saveAndSelectNewMedication()">
              <mat-icon *ngIf="!isSaving">check_circle</mat-icon>
              <span class="spinner" *ngIf="isSaving"></span>
              <span>{{ isSaving ? 'שומר...' : 'שמור ובחר' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      direction: rtl;
      text-align: right;
    }

    /* ===== HEADER ===== */
    .modal-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom: none;
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .btn-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .btn-close:hover {
      opacity: 0.8;
    }

    /* ===== BODY ===== */
    .modal-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
    }

    .loading-text {
      margin-top: 1rem;
      color: #666;
      font-size: 0.95rem;
    }

    /* ===== LIST VIEW ===== */
    .list-view {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
    }

    .search-section {
      flex-shrink: 0;
    }

    .search-field {
      width: 100%;
      max-width: 350px;
      margin-right: auto;
    }

    .search-field ::ng-deep .mat-form-field-wrapper {
      padding-bottom: 0.5rem;
    }

    .table-container {
      flex: 1;
      overflow: auto;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      background: white;
    }

    .medications-table {
      width: 100%;
      border-collapse: collapse;
    }

    .medications-table th {
      background-color: #f5f5f5;
      color: #333;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 1rem 0.75rem;
      text-align: right;
      border-bottom: 2px solid #e0e0e0;
      white-space: nowrap;
    }

    .medications-table td {
      padding: 0.95rem 0.75rem;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.9rem;
      color: #333;
    }

    .table-row {
      transition: background-color 0.2s ease;
    }

    .table-row:hover {
      background-color: #f9f9f9;
    }

    .cell-bold {
      font-weight: 600;
      color: #222;
    }

    .col-actions {
      width: 120px;
      text-align: center;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .action-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .btn-select {
      background-color: #667eea;
      color: white;
    }

    .btn-select:hover {
      background-color: #5568d3;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .empty-row {
      height: 200px;
      background-color: #fafafa;
    }

    .empty-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: #999;
      font-size: 0.95rem;
      text-align: center;
    }

    .empty-message mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
    }

    .results-footer {
      flex-shrink: 0;
      padding: 0.75rem 1rem;
      background-color: #f0f4ff;
      border-top: 1px solid #e0e0e0;
      font-size: 0.9rem;
      color: #667eea;
      text-align: center;
      border-radius: 0 0 8px 8px;
    }

    /* ===== FORM VIEW ===== */
    .form-view {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
    }

    .form-title mat-icon {
      color: #667eea;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .medication-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 900px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-row.full-width {
      grid-template-columns: 1fr;
    }

    .form-group {
      width: 100%;
    }

    .form-group mat-form-field {
      width: 100%;
    }

    .required {
      color: #d32f2f;
      font-weight: 600;
    }

    mat-form-field {
      width: 100%;
    }

    mat-form-field ::ng-deep .mat-form-field-label {
      text-align: right;
      transform-origin: right;
    }

    /* ===== FOOTER ===== */
    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e9ecef;
      background-color: #f8f9fa;
      flex-shrink: 0;
    }

    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .actions-left,
    .actions-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-primary {
      background-color: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #5568d3;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline-primary {
      background-color: white;
      color: #667eea;
      border: 1.5px solid #667eea;
    }

    .btn-outline-primary:hover {
      background-color: #f0f4ff;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* ===== PAGINATION ===== */
    ::ng-deep .mat-paginator {
      background-color: #f8f9fa !important;
      border-top: 1px solid #e0e0e0;
    }

    ::ng-deep .mat-paginator-container {
      justify-content: center !important;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .modal-body {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .medications-table th,
      .medications-table td {
        padding: 0.75rem 0.5rem;
        font-size: 0.85rem;
      }

      .footer-actions {
        flex-direction: column;
        gap: 0.5rem;
      }

      .actions-left,
      .actions-right {
        width: 100%;
        flex-wrap: wrap;
        justify-content: center;
      }
    }
  `]
})
export class MedicationSelectorModalComponent implements OnInit {
  medications: OralPreparation[] = [];
  dataSource: MatTableDataSource<OralPreparation>;
  displayedColumns: string[] = [
    'preparationName',
    'concentration',
    'finalVolume',
    'routeOfAdministration',
    'storageConditions',
    'actions'
  ];

  searchText = '';
  showAddNewForm = false;
  newMedicationForm: FormGroup;
  isSaving = false;
  isLoading = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<OralPreparation>([]);
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMedications();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private initializeForm(): void {
    this.newMedicationForm = this.formBuilder.group({
      preparationName: ['', Validators.required],
      concentration: [''],
      finalVolume: [''],
      routeOfAdministration: [''],
      rawMaterials: [''],
      suspendingAgent: [''],
      shelfLife: [''],
      storageConditions: [''],
      usageNotes: ['']
    });
  }

  loadMedications(): void {
    this.isLoading = true;
    this.http.get(environment.url + 'GetAllPreparations', { responseType: 'text' })
      .subscribe(
        (response: string) => {
          this.isLoading = false;
          try {
            let data: OralPreparation[] = JSON.parse(response);
            this.medications = this.normalizePreparations(Array.isArray(data) ? data : []);
            this.updateDataSource();
          } catch (e) {
            try {
              this.medications = this.parseXmlResponse(response);
              this.updateDataSource();
            } catch (xmlError) {
              console.error('Error parsing response:', xmlError);
              this.snackBar.open('שגיאה בעיבוד תגובת השרת', 'סגור', { duration: 3000 });
            }
          }
        },
        (error) => {
          this.isLoading = false;
          console.error('Error loading medications:', error);
          this.snackBar.open('שגיאה בטעינת רשימת התרופות', 'סגור', { duration: 3000 });
        }
      );
  }

  private updateDataSource(): void {
    this.dataSource = new MatTableDataSource(this.medications);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private parseXmlResponse(xmlString: string): OralPreparation[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML format');
    }

    const preparations: OralPreparation[] = [];
    const nodes = xmlDoc.getElementsByTagName('OralPreparation');

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const prep: OralPreparation = {
        id: this.getXmlValue(node, 'Id') ? parseInt(this.getXmlValue(node, 'Id'), 10) : 0,
        preparationName: this.getXmlValue(node, 'PreparationName') || '',
        concentration: this.getXmlValue(node, 'Concentration') || '',
        finalVolume: this.getXmlValue(node, 'FinalVolume') || '',
        routeOfAdministration: this.getXmlValue(node, 'RouteOfAdministration') || '',
        rawMaterials: this.getXmlValue(node, 'RawMaterials') || '',
        suspendingAgent: this.getXmlValue(node, 'SuspendingAgent') || '',
        shelfLife: this.getXmlValue(node, 'ShelfLife') || '',
        storageConditions: this.getXmlValue(node, 'StorageConditions') || '',
        usageNotes: this.getXmlValue(node, 'UsageNotes') || ''
      };
      preparations.push(prep);
    }

    return preparations;
  }

  private getXmlValue(node: Element, tagName: string): string {
    const elements = node.getElementsByTagName(tagName);
    if (elements && elements.length > 0) {
      return elements[0].textContent || '';
    }
    return '';
  }

  private normalizePreparations(data: any[]): OralPreparation[] {
    return data.map(item => ({
      id: item.id || item.Id || 0,
      preparationName: item.preparationName || item.PreparationName || '',
      concentration: item.concentration || item.Concentration || '',
      finalVolume: item.finalVolume || item.FinalVolume || '',
      routeOfAdministration: item.routeOfAdministration || item.RouteOfAdministration || '',
      rawMaterials: item.rawMaterials || item.RawMaterials || '',
      suspendingAgent: item.suspendingAgent || item.SuspendingAgent || '',
      shelfLife: item.shelfLife || item.ShelfLife || '',
      storageConditions: item.storageConditions || item.StorageConditions || '',
      usageNotes: item.usageNotes || item.UsageNotes || ''
    }));
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  selectMedication(medication: OralPreparation): void {
    this.activeModal.close(medication);
  }

  toggleAddNewForm(): void {
    this.showAddNewForm = !this.showAddNewForm;
    if (!this.showAddNewForm) {
      this.newMedicationForm.reset();
    }
  }

  saveAndSelectNewMedication(): void {
    if (this.newMedicationForm.invalid) {
      return;
    }

    this.isSaving = true;
    const newMed = this.newMedicationForm.value;

    this.http.post<number>(environment.url + 'SaveOrUpdatePreparation', newMed)
      .subscribe(
        (resultId: number) => {
          this.isSaving = false;
          newMed.id = resultId;
          this.medications.push(newMed);
          this.updateDataSource();
          this.snackBar.open('תרופה נוצרה בהצלחה', 'סגור', { duration: 2000 });
          this.selectMedication(newMed);
        },
        (error) => {
          this.isSaving = false;
          console.error('Error saving medication:', error);
          this.snackBar.open('שגיאה בשמירת התרופה', 'סגור', { duration: 3000 });
        }
      );
  }
}