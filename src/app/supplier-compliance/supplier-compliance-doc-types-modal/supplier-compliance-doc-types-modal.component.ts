import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DocumentType } from '../supplier-compliance.models';
import { SupplierComplianceService } from '../supplier-compliance.service';

// Admin screen for the dynamic document/certification catalog. Adding a row here makes the
// document appear on every supplier card — the whole point being that a new type (SOC2, a
// privacy document, whatever comes next) doesn't need a developer or a deploy.
@Component({
  selector: 'app-supplier-compliance-doc-types-modal',
  templateUrl: './supplier-compliance-doc-types-modal.component.html',
  styleUrls: ['./supplier-compliance-doc-types-modal.component.scss'],
})
export class SupplierComplianceDocTypesModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  // Emitted when anything actually changed, so the dashboard can reload suppliers and pick up
  // the new type rather than showing a stale card.
  @Output() changed = new EventEmitter<void>();

  // The 4 built-in document fields on Supplier drive IsApproved / CriticalityTier /
  // RecommendedAction in SupplierAnalysis.cs — shown here read-only so the admin screen lists
  // every document type in one place, but they can't be renamed or removed like the dynamic
  // catalog below without also touching the calculation logic.
  readonly coreDocumentLabels = [
    'טופס NDA',
    'שאלון אבטחת מידע',
    'שאלון הכנסת רכש וטכנולוגיות רפואיות חדשות',
    'טופס ועדת ענן',
  ];

  types: DocumentType[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  newLabel = '';
  private dirty = false;

  // "מהות הספק" categories — same catalog pattern as document types, managed from the
  // same modal so there's one place to configure both.
  natureTypes: DocumentType[] = [];
  natureLoading = true;
  newNatureLabel = '';

  constructor(private supplierService: SupplierComplianceService) {}

  // Split for the two sections: live types the admin manages, and retired ones kept only so
  // they can be brought back without re-entering the label (and without losing the supplier
  // data already recorded against them).
  get activeTypes(): DocumentType[] {
    return this.types.filter((t) => t.isActive);
  }

  get inactiveTypes(): DocumentType[] {
    return this.types.filter((t) => !t.isActive);
  }

  get activeNatureTypes(): DocumentType[] {
    return this.natureTypes.filter((t) => t.isActive);
  }

  get inactiveNatureTypes(): DocumentType[] {
    return this.natureTypes.filter((t) => !t.isActive);
  }

  ngOnInit(): void {
    this.load();
    this.loadNatureTypes();
  }

  private load(): void {
    this.loading = true;
    this.supplierService.getDocumentTypes().subscribe({
      next: (types) => {
        this.types = types;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'טעינת סוגי המסמכים נכשלה — יש לבדוק את החיבור לשרת';
        this.loading = false;
      },
    });
  }

  add(): void {
    const label = this.newLabel.trim();
    if (!label) return;
    // Case-insensitive: "SOC2" and "soc2" are one document type to a human, and a duplicate
    // would appear as two separate rows on every supplier card. The server enforces this too
    // (DocumentTypesController returns 409) — this check just gives immediate feedback.
    if (this.types.some((t) => t.label.localeCompare(label, 'he', { sensitivity: 'base' }) === 0)) {
      this.errorMessage = `"${label}" כבר קיים ברשימה`;
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    const nextOrder = Math.max(0, ...this.types.map((t) => t.displayOrder)) + 1;
    this.supplierService
      .createDocumentType({ label, isActive: true, displayOrder: nextOrder })
      .subscribe({
        next: (created) => {
          this.types = [...this.types, created];
          this.newLabel = '';
          this.saving = false;
          this.dirty = true;
        },
        error: () => {
          this.errorMessage = 'ההוספה נכשלה';
          this.saving = false;
        },
      });
  }

  save(type: DocumentType): void {
    const label = type.label.trim();
    if (!label) {
      this.errorMessage = 'שם המסמך הוא שדה חובה';
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    this.supplierService
      .updateDocumentType(type.id, { label, isActive: type.isActive, displayOrder: type.displayOrder })
      .subscribe({
        next: () => {
          this.saving = false;
          this.dirty = true;
        },
        error: () => {
          this.errorMessage = 'השמירה נכשלה';
          this.saving = false;
        },
      });
  }

  // Toggle active state via an explicit button rather than mutating the object in place, so
  // the array reference changes and the active/history getters actually recompute.
  setActive(type: DocumentType, isActive: boolean): void {
    const updated = { ...type, isActive };
    this.types = this.types.map((t) => (t.id === type.id ? updated : t));
    this.save(updated);
  }

  private loadNatureTypes(): void {
    this.natureLoading = true;
    this.supplierService.getNatureTypes().subscribe({
      next: (types) => {
        this.natureTypes = types;
        this.natureLoading = false;
      },
      error: () => {
        this.errorMessage = 'טעינת קטגוריות מהות הספק נכשלה — יש לבדוק את החיבור לשרת';
        this.natureLoading = false;
      },
    });
  }

  addNature(): void {
    const label = this.newNatureLabel.trim();
    if (!label) return;
    if (this.natureTypes.some((t) => t.label.localeCompare(label, 'he', { sensitivity: 'base' }) === 0)) {
      this.errorMessage = `"${label}" כבר קיים ברשימה`;
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    const nextOrder = Math.max(0, ...this.natureTypes.map((t) => t.displayOrder)) + 1;
    this.supplierService
      .createNatureType({ label, isActive: true, displayOrder: nextOrder })
      .subscribe({
        next: (created) => {
          this.natureTypes = [...this.natureTypes, created];
          this.newNatureLabel = '';
          this.saving = false;
          this.dirty = true;
        },
        error: () => {
          this.errorMessage = 'ההוספה נכשלה';
          this.saving = false;
        },
      });
  }

  saveNature(type: DocumentType): void {
    const label = type.label.trim();
    if (!label) {
      this.errorMessage = 'שם הקטגוריה הוא שדה חובה';
      return;
    }

    this.errorMessage = '';
    this.saving = true;
    this.supplierService
      .updateNatureType(type.id, { label, isActive: type.isActive, displayOrder: type.displayOrder })
      .subscribe({
        next: () => {
          this.saving = false;
          this.dirty = true;
        },
        error: () => {
          this.errorMessage = 'השמירה נכשלה';
          this.saving = false;
        },
      });
  }

  setNatureActive(type: DocumentType, isActive: boolean): void {
    const updated = { ...type, isActive };
    this.natureTypes = this.natureTypes.map((t) => (t.id === type.id ? updated : t));
    this.saveNature(updated);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  close(): void {
    if (this.dirty) this.changed.emit();
    this.closed.emit();
  }
}
