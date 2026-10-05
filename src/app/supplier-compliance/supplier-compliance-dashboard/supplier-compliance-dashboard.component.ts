import { Component, HostListener, OnInit } from '@angular/core';
import { Supplier, SupplierOptions } from '../supplier-compliance.models';
import { SupplierComplianceService } from '../supplier-compliance.service';
import { normalizeDocValue } from '../supplier-compliance-analysis';

type FilterKey =
  | 'division' | 'approval' | 'criticality' | 'missingDocs'
  | 'cloud' | 'systemType' | 'activeStatus';

interface FilterOption {
  key: string;
  label: string;
  count: number;
  predicate: (s: Supplier) => boolean;
}

interface FilterGroup {
  key: FilterKey;
  label: string;
  hint: string;
  options: FilterOption[];
  type?: 'single' | 'multi';
}

// Which alphabet does the name *start* with, ignoring leading punctuation and digits?
const HEBREW_LETTER = /[֐-׿]/;
const LATIN_LETTER = /[A-Za-z]/;

function startsWithHebrew(name: string): boolean {
  for (const ch of name) {
    if (HEBREW_LETTER.test(ch)) return true;
    if (LATIN_LETTER.test(ch)) return false;
  }
  return false;
}

function docSatisfied(v: string | null | undefined): boolean {
  const n = normalizeDocValue(v);
  return n === 'כן' || n === 'לא רלוונטי';
}

function isCloud(s: Supplier): 'yes' | 'no' | 'unset' {
  if (s.isCloudProduct === '1') return 'yes';
  if (s.isCloudProduct === '0') return 'no';
  if (!s.nature) return 'unset';
  return s.nature.indexOf('ענן') >= 0 ? 'yes' : 'no';
}

@Component({
  selector: 'app-supplier-compliance-dashboard',
  templateUrl: './supplier-compliance-dashboard.component.html',
  styleUrls: ['./supplier-compliance-dashboard.component.scss'],
})
export class SupplierComplianceDashboardComponent implements OnInit {
  suppliers: Supplier[] = [];
  options: SupplierOptions | null = null;
  loading = true;
  errorMessage = '';

  searchText = '';
  selected: Record<FilterKey, string[]> = {
    division: [], approval: [], criticality: [], missingDocs: [],
    cloud: [], systemType: [], activeStatus: [],
  };

  sortDir: 1 | -1 = 1;
  openFilterKey: FilterKey | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openFilterKey = null;
  }

  modalOpen = false;
  modalSupplier: Supplier | null = null;
  docTypesModalOpen = false;

  constructor(private supplierService: SupplierComplianceService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    this.supplierService.getOptions().subscribe({
      next: (opts) => { this.options = opts; },
      error: () => { this.errorMessage = 'טעינת רשימות הבחירה נכשלה'; },
    });
    this.supplierService.getAll().subscribe({
      next: (list) => { this.suppliers = list; this.loading = false; },
      error: () => { this.errorMessage = 'טעינת רשימת הספקים נכשלה — יש לבדוק את החיבור לשרת'; this.loading = false; },
    });
  }

  get filterGroups(): FilterGroup[] {
    const all = this.suppliers;
    const opts = this.options;
    const count = (pred: (s: Supplier) => boolean) => all.filter(pred).length;

    const groups: FilterGroup[] = [
      {
        key: 'division', label: 'שיוך לחטיבה', hint: 'מגיע דרך משרד הבריאות?', type: 'single',
        options: [
          { key: 'not-division', label: 'לא מהחטיבה', count: count((s) => !s.isDivision), predicate: (s) => !s.isDivision },
          { key: 'division', label: 'רק חטיבה', count: count((s) => s.isDivision), predicate: (s) => s.isDivision },
        ],
      },
      {
        key: 'approval', label: 'סטטוס', hint: 'הושלמו הסכם ושאלון?', type: 'single',
        options: [
          { key: 'approved', label: 'מאושרים', count: count((s) => s.isApproved), predicate: (s) => s.isApproved },
          { key: 'not-approved', label: 'לא מאושרים', count: count((s) => !s.isApproved), predicate: (s) => !s.isApproved },
        ],
      },
      {
        key: 'criticality', label: 'מדד קריטיות', hint: 'לפי טבלת הסיכונים (DB)',
        options: ['קריטי', 'לא קריטי', 'לא ידוע'].map((tier) => ({
          key: tier, label: tier, count: count((s) => s.criticalityTier === tier),
          predicate: (s: Supplier) => s.criticalityTier === tier,
        })),
      },
      {
        key: 'missingDocs', label: 'מה חסר להשלמה', hint: 'איזה מסמך טרם התקבל',
        options: [
          {
            key: 'both', label: 'חסר שניהם',
            count: count((s) => !docSatisfied(s.ndaSigned) && !docSatisfied(s.infosecQuestionnaireDocStatus)),
            predicate: (s) => !docSatisfied(s.ndaSigned) && !docSatisfied(s.infosecQuestionnaireDocStatus),
          },
          {
            key: 'nda', label: 'חסר הסכם סודיות',
            count: count((s) => !docSatisfied(s.ndaSigned) && docSatisfied(s.infosecQuestionnaireDocStatus)),
            predicate: (s) => !docSatisfied(s.ndaSigned) && docSatisfied(s.infosecQuestionnaireDocStatus),
          },
          {
            key: 'infosec', label: 'חסר שאלון',
            count: count((s) => docSatisfied(s.ndaSigned) && !docSatisfied(s.infosecQuestionnaireDocStatus)),
            predicate: (s) => docSatisfied(s.ndaSigned) && !docSatisfied(s.infosecQuestionnaireDocStatus),
          },
        ],
      },
      {
        key: 'cloud', label: 'ענן / לא ענן', hint: 'מבוסס שירותי ענן?',
        options: [
          { key: 'yes', label: 'ענן', count: count((s) => isCloud(s) === 'yes'), predicate: (s) => isCloud(s) === 'yes' },
          { key: 'no', label: 'לא ענן', count: count((s) => isCloud(s) === 'no'), predicate: (s) => isCloud(s) === 'no' },
          { key: 'unset', label: 'לא הוגדר', count: count((s) => isCloud(s) === 'unset'), predicate: (s) => isCloud(s) === 'unset' },
        ],
      },
      {
        key: 'systemType', label: 'סוג מערכת', hint: 'מה הספק מספק',
        options: (opts && opts.systemType ? opts.systemType : []).map((v) => ({
          key: v, label: v, count: count((s) => s.systemType === v), predicate: (s: Supplier) => s.systemType === v,
        })),
      },
      {
        key: 'activeStatus', label: 'מצב פעילות', hint: 'הספק עדיין פעיל?',
        options: [
          { key: 'פעיל', label: 'פעיל', count: count((s) => s.status === 'פעיל'), predicate: (s) => s.status === 'פעיל' },
          { key: 'לא פעיל', label: 'לא פעיל', count: count((s) => s.status === 'לא פעיל'), predicate: (s) => s.status === 'לא פעיל' },
        ],
      },
    ];
    return groups;
  }

  get filteredSuppliers(): Supplier[] {
    const groups = this.filterGroups;
    const text = this.searchText.trim().toLowerCase();
    return this.suppliers.filter((s) => {
      if (text) {
        const hay = `${s.name} ${s.contactPerson || ''} ${s.id}`.toLowerCase();
        if (hay.indexOf(text) < 0) return false;
      }
      const selected = this.selected;
      for (const group of groups) {
        const chosenKeys = selected[group.key];
        if (!chosenKeys.length) continue;
        const chosenOptions = group.options.filter((o) => chosenKeys.indexOf(o.key) >= 0);
        if (!chosenOptions.length) continue;
        if (!chosenOptions.some((o) => o.predicate(s))) return false;
      }
      return true;
    });
  }

  // English names first (A→Z), then Hebrew names (א→ת) — both ascending, no group headers.
  get sortedSuppliers(): Supplier[] {
    const dir = this.sortDir;
    const hebrew: Supplier[] = [];
    const latin: Supplier[] = [];
    for (const s of this.filteredSuppliers) {
      (startsWithHebrew((s.name || '').trim()) ? hebrew : latin).push(s);
    }
    const cmp = (a: Supplier, b: Supplier) =>
      dir * (a.name || '').localeCompare(b.name || '', 'he', { sensitivity: 'base', numeric: true });
    latin.sort(cmp);
    hebrew.sort(cmp);
    return [...latin, ...hebrew];
  }

  get kpis() {
    const all = this.suppliers;
    const total = all.length;
    const approved = all.filter((s) => s.isApproved).length;
    const neverContacted = all.filter((s) => s.category === 'לא נוצר קשר').length;
    return {
      total,
      approvalPct: total ? Math.round((approved / total) * 100) : 0,
      approved,
      neverContacted,
      needsAttention: total - approved,
    };
  }

  get statusDistribution() {
    const all = this.suppliers;
    const total = all.length;
    const segmentDefs = [
      { key: 'חטיבה', color: 'var(--series-blue)' },
      { key: 'מאושר', color: 'var(--status-good)' },
      { key: 'בטיפול', color: 'var(--series-yellow)' },
      { key: 'לא נוצר קשר', color: 'var(--text-muted)' },
      { key: 'לא פעיל', color: 'var(--status-critical)' },
    ];
    const segments = segmentDefs.map((def) => {
      const count = all.filter((s) => s.category === def.key).length;
      return { ...def, pct: total ? (count / total) * 100 : 0 };
    });
    const approved = all.filter((s) => s.isApproved).length;
    return {
      total,
      approvedPct: total ? Math.round((approved / total) * 100) : 0,
      segments,
    };
  }

  get criticalityDistribution() {
    const all = this.suppliers;
    const total = all.length;
    const countCritical = all.filter((s) => s.criticalityTier === 'קריטי').length;
    const countNotCritical = all.filter((s) => s.criticalityTier === 'לא קריטי').length;
    const countUnknown = total - countCritical - countNotCritical;
    const max = Math.max(countCritical, countNotCritical, countUnknown, 1);
    return {
      total,
      bars: [
        { label: 'קריטי', count: countCritical, pct: (countCritical / max) * 100, color: 'var(--status-critical)' },
        { label: 'לא קריטי', count: countNotCritical, pct: (countNotCritical / max) * 100, color: 'var(--status-good)' },
        { label: 'לא ידוע', count: countUnknown, pct: (countUnknown / max) * 100, color: 'var(--text-muted)' },
      ],
    };
  }

  get isoDistribution() {
    const all = this.suppliers;
    const total = all.length;
    const countYes = all.filter((s) => s.isoCertified === 'כן').length;
    const countNo = all.filter((s) => s.isoCertified === 'לא').length;
    const countUnset = total - countYes - countNo;
    const max = Math.max(countYes, countNo, countUnset, 1);
    return {
      total,
      bars: [
        { label: 'כן', count: countYes, pct: (countYes / max) * 100, color: 'var(--status-good)' },
        { label: 'לא', count: countNo, pct: (countNo / max) * 100, color: 'var(--status-critical)' },
        { label: 'לא הוגדר', count: countUnset, pct: (countUnset / max) * 100, color: 'var(--text-muted)' },
      ],
    };
  }

  groupSelection(key: FilterKey): string[] {
    return this.selected[key];
  }

  setGroupSelection(key: FilterKey, values: string[]): void {
    this.selected = { ...this.selected, [key]: values };
  }

  singleValue(group: FilterGroup): string {
    return this.selected[group.key][0] || '';
  }

  setSingleValue(group: FilterGroup, value: string): void {
    this.setGroupSelection(group.key, value ? [value] : []);
  }

  toggleFilterOpen(key: FilterKey): void {
    this.openFilterKey = this.openFilterKey === key ? null : key;
  }

  isOptionSelected(key: FilterKey, optionKey: string): boolean {
    return this.groupSelection(key).indexOf(optionKey) >= 0;
  }

  toggleOption(key: FilterKey, optionKey: string): void {
    const current = this.groupSelection(key);
    const next = current.indexOf(optionKey) >= 0
      ? current.filter((k) => k !== optionKey)
      : [...current, optionKey];
    this.setGroupSelection(key, next);
  }

  dropdownLabel(group: FilterGroup): string {
    const chosen = this.groupSelection(group.key);
    if (!chosen.length) return 'הכל';
    if (chosen.length === 1) {
      const found = group.options.filter((o) => o.key === chosen[0])[0];
      return found ? found.label : 'הכל';
    }
    return `${chosen.length} נבחרו`;
  }

  toggleSort(): void {
    this.sortDir = this.sortDir === 1 ? -1 : 1;
  }

  cloudStatus(s: Supplier): 'yes' | 'no' | 'unset' {
    return isCloud(s);
  }

  resetFilters(): void {
    const cleared = { ...this.selected };
    (Object.keys(cleared) as FilterKey[]).forEach((key) => { cleared[key] = []; });
    this.selected = cleared;
    this.searchText = '';
  }

  openCreate(): void {
    this.modalSupplier = null;
    this.modalOpen = true;
  }

  openEdit(supplier: Supplier): void {
    this.modalSupplier = supplier;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  onSaved(): void {
    this.modalOpen = false;
    this.reload();
  }

  openDocTypes(): void {
    this.docTypesModalOpen = true;
  }

  closeDocTypes(): void {
    this.docTypesModalOpen = false;
  }

  // A new or renamed document type changes what every supplier card shows, so the list has
  // to be refetched rather than left showing the previous set.
  onDocTypesChanged(): void {
    this.reload();
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }
}
