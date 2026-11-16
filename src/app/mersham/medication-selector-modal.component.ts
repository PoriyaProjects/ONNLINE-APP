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
    <div class="modal-header">
      <h5 class="modal-title">בחר תרופה / הוסף חדשה</h5>
      <button 
        type="button" 
        class="btn-close" 
        aria-label="Close" 
        (click)="activeModal.dismiss()">
      </button>
    </div>
    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
      <!-- Existing Medications List -->
      <div *ngIf="!showAddNewForm" class="mb-3">
        <h6>בחר מתוך תרופות קיימות:</h6>
        <div class="row">
          <div class="col-12">
            <mat-form-field appearance="fill" class="w-100">
              <mat-label>חפש תרופה</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchText" 
                (keyup)="filterMedications()"
                placeholder="הקלד לחיפוש"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </div>
        
        <div class="list-group mt-3">
          <button 
            *ngFor="let med of filteredMedications; let i = index"
            type="button" 
            class="list-group-item list-group-item-action text-end"
            (click)="selectMedication(med)"
            [attr.aria-current]="i === 0 ? 'true' : 'false'">
            <h6 class="mb-1">{{ med.preparationName }}</h6>
            <p class="mb-1"><small><strong>מינון:</strong> {{ med.concentration }}</small></p>
            <p class="mb-1"><small><strong>דרך מתן:</strong> {{ med.routeOfAdministration }}</small></p>
            <small *ngIf="med.storageConditions" class="text-muted">
              <strong>תנאי אחסון:</strong> {{ med.storageConditions }}
            </small>
          </button>
        </div>
        
        <div *ngIf="filteredMedications.length === 0" class="alert alert-info mt-3">
          לא נמצאו תרופות התואמות לחיפוש
        </div>
      </div>

      <!-- Add New Medication Form -->
      <div *ngIf="showAddNewForm">
        <h6>הוסף תרופה חדשה:</h6>
        <form [formGroup]="newMedicationForm">
          <div class="row">
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>שם תרופה</mat-label>
                <input matInput formControlName="preparationName" type="text" />
                <mat-error *ngIf="newMedicationForm.get('preparationName').invalid">
                  שדה זה הוא חובה
                </mat-error>
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>מינון</mat-label>
                <input matInput formControlName="concentration" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>דרך מתן</mat-label>
                <input matInput formControlName="routeOfAdministration" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>נפח סופי (מ"ל)</mat-label>
                <input matInput formControlName="finalVolume" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>חומרי גלם</mat-label>
                <input matInput formControlName="rawMaterials" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>חומר מרחף</mat-label>
                <input matInput formControlName="suspendingAgent" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>תוקף</mat-label>
                <input matInput formControlName="shelfLife" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>תנאי אחסון</mat-label>
                <input matInput formControlName="storageConditions" type="text" />
              </mat-form-field>
            </div>
            <div class="col-12 mb-3">
              <mat-form-field appearance="fill" class="w-100">
                <mat-label>הערות שימוש</mat-label>
                <textarea matInput formControlName="usageNotes" rows="3"></textarea>
              </mat-form-field>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-footer">
      <button 
        type="button" 
        class="btn btn-secondary" 
        (click)="toggleAddNewForm()">
        {{ showAddNewForm ? 'חזור לרשימה' : 'הוסף תרופה חדשה' }}
      </button>
      
      <div *ngIf="showAddNewForm">
        <button 
          type="button" 
          class="btn btn-primary"
          [disabled]="newMedicationForm.invalid || isSaving"
          (click)="saveAndSelectNewMedication()">
          <span *ngIf="isSaving" class="spinner-border spinner-border-sm me-2"></span>
          שמור ובחר
        </button>
      </div>
      
      <button 
        type="button" 
        class="btn btn-light" 
        (click)="activeModal.dismiss()">
        ביטול
      </button>
    </div>
  `,
  styles: [`
    .modal-header {
      text-align: right;
    }
    .modal-body {
      text-align: right;
      direction: rtl;
    }
    .modal-footer {
      text-align: right;
      direction: rtl;
    }
    .list-group-item {
      text-align: right;
      direction: rtl;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .list-group-item:hover {
      background-color: #f0f0f0;
    }
    mat-icon {
      margin-right: 0.5rem;
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
    this.http.get(environment.url + 'GetAllPreparations', { responseType: 'text' })
      .subscribe(
        (response: string) => {
          try {
            // Try to parse as JSON first
            let data: OralPreparation[] = JSON.parse(response);
            this.medications = Array.isArray(data) ? data : [];
            this.filteredMedications = this.medications;
          } catch (e) {
            // If JSON parsing fails, try to extract JSON from XML response
            try {
              const jsonMatch = response.match(/d=\[([^]*?)\]/);
              if (jsonMatch && jsonMatch[1]) {
                let data = JSON.parse('[' + jsonMatch[1] + ']');
                this.medications = Array.isArray(data) ? data : [];
                this.filteredMedications = this.medications;
              } else {
                // Try another approach: look for string representation
                const stringMatch = response.match(/"([^"]*?)"/g);
                if (stringMatch && stringMatch.length > 0) {
                  this.medications = [];
                  this.filteredMedications = [];
                } else {
                  throw new Error('Could not parse response format');
                }
              }
            } catch (xmlParseError) {
              console.error('Error parsing XML response:', xmlParseError);
              console.error('Raw response:', response);
              this.snackBar.open('שגיאה בעיבוד תגובת השרת', 'סגור', { duration: 3000 });
            }
          }
        },
        (error) => {
          console.error('Error loading medications:', error);
          this.snackBar.open('שגיאה בטעינת רשימת התרופות', 'סגור', { duration: 3000 });
        }
      );
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
