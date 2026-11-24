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
  templateUrl: './medication-selector-modal.component.html',
  styleUrls: ['./medication-selector-modal.component.scss']
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
  editingMedication: OralPreparation | null = null;
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
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
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
    
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
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

  /**
   * Parse shelf life string to extract number of days
   * Examples: "יציבות 60 ימים" -> 60, "יציבות של 7 ימים" -> 7
   */
  private extractDaysFromShelfLife(shelfLife: string): number {
    if (!shelfLife) return 0;
    const match = shelfLife.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Calculate expiration datetime based on shelf life
   * Takes current datetime + days from shelf life
   */
  private calculateExpirationDateTime(shelfLife: string): string {
    const days = this.extractDaysFromShelfLife(shelfLife);
    if (days === 0) return '';

    const now = new Date();
    now.setDate(now.getDate() + days);

    return this.formatDateTime(now);
  }

  /**
   * Format date to string (YYYY-MM-DD HH:mm or similar format)
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  selectMedication(medication: OralPreparation): void {
    const expirationDateTime = this.calculateExpirationDateTime(medication.shelfLife);
    const result = {
      ...medication,
      expirationDateTime
    };
    this.activeModal.close(result);
  }

  editMedication(medication: OralPreparation): void {
    this.editingMedication = medication;
    this.showAddNewForm = true;
    this.newMedicationForm.patchValue({
      preparationName: medication.preparationName,
      concentration: medication.concentration,
      finalVolume: medication.finalVolume,
      routeOfAdministration: medication.routeOfAdministration,
      rawMaterials: medication.rawMaterials,
      suspendingAgent: medication.suspendingAgent,
      shelfLife: medication.shelfLife,
      storageConditions: medication.storageConditions,
      usageNotes: medication.usageNotes
    });
  }

  toggleAddNewForm(): void {
    this.showAddNewForm = !this.showAddNewForm;
    this.editingMedication = null;
    if (!this.showAddNewForm) {
      this.newMedicationForm.reset();
    }
  }

  saveAndSelectNewMedication(): void {
    if (this.newMedicationForm.invalid) {
      return;
    }

    this.isSaving = true;
    const formValue = this.newMedicationForm.value;
    const payload = this.editingMedication 
      ? { ...formValue, id: this.editingMedication.id }
      : formValue;

    this.http.post<number>(environment.url + 'SaveOrUpdatePreparation', payload)
      .subscribe(
        (resultId: number) => {
          this.isSaving = false;
          
          if (this.editingMedication) {
            const index = this.medications.findIndex(m => m.id === this.editingMedication.id);
            if (index !== -1) {
              this.medications[index] = { ...payload, id: resultId };
            }
            this.snackBar.open('תרופה עדכנה בהצלחה', 'סגור', { duration: 2000 });
          } else {
            const newMed = { ...payload, id: resultId };
            this.medications.push(newMed);
            this.snackBar.open('תרופה נוצרה בהצלחה', 'סגור', { duration: 2000 });
          }

          this.updateDataSource();
          this.showAddNewForm = false;
          this.editingMedication = null;
          this.newMedicationForm.reset();
        },
        (error) => {
          this.isSaving = false;
          console.error('Error saving medication:', error);
          this.snackBar.open('שגיאה בשמירת התרופה', 'סגור', { duration: 3000 });
        }
      );
  }
}
