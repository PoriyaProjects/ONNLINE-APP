import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    <div class="modal-content-rtl">
      <!-- Header -->
      <div class="modal-header">
        <button 
          type="button" 
          class="btn-close" 
          aria-label="Close" 
          (click)="activeModal.dismiss()">
        </button>
        <h5 class="modal-title">
          <mat-icon class="title-icon">local_pharmacy</mat-icon>
          בחר תרופה / הוסף חדשה
        </h5>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <mat-spinner [diameter]="40"></mat-spinner>
          <p class="mt-2">טוען תרופות...</p>
        </div>

        <!-- Existing Medications List -->
        <div *ngIf="!showAddNewForm && !isLoading" class="medications-section">
          <h6 class="section-title">
            <mat-icon>list</mat-icon>
            בחר מתוך תרופות קיימות
          </h6>
          
          <!-- Search Field -->
          <div class="search-container">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>חפש תרופה...</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchText" 
                (keyup)="filterMedications()"
              />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>

          <!-- Medications List -->
          <div class="medications-list">
            <button 
              *ngFor="let med of filteredMedications"
              type="button" 
              class="medication-card"
              (click)="selectMedication(med)">
              <div class="medication-header">
                <div class="medication-name">{{ med.preparationName }}</div>
                <mat-icon class="select-icon">arrow_forward</mat-icon>
              </div>
              <div class="medication-details">
                <div class="detail-item" *ngIf="med.concentration">
                  <span class="detail-label">מינון:</span>
                  <span class="detail-value">{{ med.concentration }}</span>
                </div>
                <div class="detail-item" *ngIf="med.routeOfAdministration">
                  <span class="detail-label">דרך מתן:</span>
                  <span class="detail-value">{{ med.routeOfAdministration }}</span>
                </div>
                <div class="detail-item" *ngIf="med.finalVolume">
                  <span class="detail-label">נפח:</span>
                  <span class="detail-value">{{ med.finalVolume }}</span>
                </div>
                <div class="detail-item" *ngIf="med.storageConditions">
                  <span class="detail-label">אחסון:</span>
                  <span class="detail-value">{{ med.storageConditions }}</span>
                </div>
              </div>
            </button>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredMedications.length === 0 && !isLoading" class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>לא נמצאו תרופות התואמות לחיפוש</p>
          </div>

          <!-- Results Count -->
          <div *ngIf="filteredMedications.length > 0" class="results-info">
            נמצאו {{ filteredMedications.length }} תרופות
          </div>
        </div>

        <!-- Add New Medication Form -->
        <div *ngIf="showAddNewForm && !isLoading" class="add-medication-section">
          <h6 class="section-title">
            <mat-icon>add_circle</mat-icon>
            הוסף תרופה חדשה
          </h6>
          <form [formGroup]="newMedicationForm" class="add-form">
            <div class="form-group">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>שם תרופה *</mat-label>
                <input matInput formControlName="preparationName" type="text" />
                <mat-error *ngIf="newMedicationForm.get('preparationName').invalid">
                  שדה חובה
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-group">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>מינון</mat-label>
                <input matInput formControlName="concentration" type="text" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>דרך מתן</mat-label>
                <input matInput formControlName="routeOfAdministration" type="text" />
              </mat-form-field>
            </div>

            <div class="form-group">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>נפח סופי (מ"ל)</mat-label>
                <input matInput formControlName="finalVolume" type="text" />
              </mat-form-field>
            </div>

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

            <div class="form-group">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>הערות שימוש</mat-label>
                <textarea matInput formControlName="usageNotes" rows="3"></textarea>
              </mat-form-field>
            </div>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn btn-outline-primary"
          (click)="toggleAddNewForm()">
          <mat-icon *ngIf="!showAddNewForm">add</mat-icon>
          <mat-icon *ngIf="showAddNewForm">arrow_back</mat-icon>
          {{ showAddNewForm ? 'חזור לרשימה' : 'הוסף תרופה חדשה' }}
        </button>
        
        <div class="button-group" *ngIf="showAddNewForm">
          <button 
            type="button" 
            class="btn btn-primary"
            [disabled]="newMedicationForm.invalid || isSaving"
            (click)="saveAndSelectNewMedication()">
            <mat-icon *ngIf="!isSaving">check_circle</mat-icon>
            <span *ngIf="isSaving" class="spinner-border spinner-border-sm"></span>
            {{ isSaving ? 'שומר...' : 'שמור ובחר' }}
          </button>
        </div>
        
        <button 
          type="button" 
          class="btn btn-secondary"
          (click)="activeModal.dismiss()">
          ביטול
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-content-rtl {
      direction: rtl;
      text-align: right;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1.5rem;
      border-bottom: 2px solid #e9ecef;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-header .modal-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      flex-grow: 1;
    }

    .title-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .modal-body {
      padding: 1.5rem;
      max-height: 550px;
      overflow-y: auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .medications-section,
    .add-medication-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 1rem 0;
    }

    .section-title mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-container {
      margin-bottom: 1rem;
    }

    .medications-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .medication-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: right;
      border-right: 3px solid #667eea;
    }

    .medication-card:hover {
      background-color: #f8f9ff;
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      transform: translateX(-4px);
    }

    .medication-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .medication-name {
      font-weight: 600;
      color: #333;
      font-size: 1rem;
    }

    .select-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .medication-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .detail-label {
      font-weight: 500;
      color: #666;
    }

    .detail-value {
      color: #333;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
      margin-bottom: 0.5rem;
    }

    .results-info {
      padding: 0.75rem 1rem;
      background-color: #f0f4ff;
      border-radius: 4px;
      font-size: 0.9rem;
      color: #667eea;
      text-align: center;
    }

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      width: 100%;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid #e9ecef;
      background-color: #f8f9fa;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-primary {
      background-color: #667eea;
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #5568d3;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-outline-primary {
      background-color: white;
      color: #667eea;
      border: 1px solid #667eea;
    }

    .btn-outline-primary:hover {
      background-color: #f0f4ff;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
      border: none;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
      border-width: 0.2em;
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class MedicationSelectorModalComponent implements OnInit {
  medications: OralPreparation[] = [];
  filteredMedications: OralPreparation[] = [];
  searchText = '';
  showAddNewForm = false;
  newMedicationForm: FormGroup;
  isSaving = false;
  isLoading = false;

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMedications();
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
            // Try to parse as JSON first
            let data: OralPreparation[] = JSON.parse(response);
            this.medications = this.normalizePreparations(Array.isArray(data) ? data : []);
            this.filteredMedications = this.medications;
          } catch (e) {
            // Parse XML response
            try {
              this.medications = this.parseXmlResponse(response);
              this.filteredMedications = this.medications;
            } catch (xmlError) {
              console.error('Error parsing response:', xmlError);
              console.error('Raw response:', response.substring(0, 500));
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

  filterMedications(): void {
    if (!this.searchText.trim()) {
      this.filteredMedications = this.medications;
      return;
    }

    const searchLower = this.searchText.toLowerCase();
    this.filteredMedications = this.medications.filter(med =>
      med.preparationName.toLowerCase().includes(searchLower) ||
      (med.concentration && med.concentration.toLowerCase().includes(searchLower)) ||
      (med.routeOfAdministration && med.routeOfAdministration.toLowerCase().includes(searchLower))
    );
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