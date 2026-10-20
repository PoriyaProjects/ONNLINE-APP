import { Component, OnInit } from '@angular/core';
import { Supplier, SupplierOptions } from '../supplier-compliance.models';
import { SupplierComplianceService } from '../supplier-compliance.service';

type FilterKey =
  | 'division' | 'criticality'
  | 'cloud' | 'systemType' | 'nature' | 'activeStatus';

interface FilterOption {
  key: string;
  label: string;
  count: number;
  predicate: (s: Supplier) => boolean;
}

// Every filter renders as a plain native <select> — the custom checkbox dropdown
// never opened reliably inside the ONN-LINE shell, so single-choice it is.
interface FilterGroup {
  key: FilterKey;
  label: string;
  hint: string;
  options: FilterOption[];
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

// Legacy rows still carry bare numeric codes (e.g. ConnectionEssence = "1") imported
// from the original Excel — they are data errors, not categories, so filters hide them.
const NUMERIC_CODE = /^\d+$/;

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
  generalSearchText = '';
  selected: Record<FilterKey, string[]> = {
    division: [], criticality: [],
    cloud: [], systemType: [], nature: [], activeStatus: [],
  };

  // Rebuilt only when data arrives — as a getter the option objects were recreated on
  // every change-detection pass and the native <select> kept falling back to "הכל".
  filterGroups: FilterGroup[] = [];

  // Distinct supplier names for the search box's dropdown (native <datalist>).
  supplierNames: string[] = [];

  sortDir: 1 | -1 = 1;

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
      next: (opts) => { this.options = opts; this.rebuildFilterGroups(); },
      error: () => { this.errorMessage = 'טעינת רשימות הבחירה נכשלה'; },
    });
    this.supplierService.getAll().subscribe({
      next: (list) => { this.suppliers = list; this.loading = false; this.rebuildFilterGroups(); },
      error: () => { this.errorMessage = 'טעינת רשימת הספקים נכשלה — יש לבדוק את החיבור לשרת'; this.loading = false; },
    });
  }

  // Filter options for free-text fields come from the values actually present in the data,
  // not from the fixed option list — in production OperationType holds "אבטחת מידע" while
  // the fixed list says "מערכת אבטחת מידע", so the fixed-list filter matched 0 suppliers.
  private dataValueOptions(get: (s: Supplier) => string | null | undefined): FilterOption[] {
    const counts = new Map<string, number>();
    for (const s of this.suppliers) {
      const v = (get(s) || '').trim();
      if (!v || NUMERIC_CODE.test(v)) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return Array.from(counts.keys())
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b, 'he'))
      .map((v) => ({
        key: v, label: v, count: counts.get(v) || 0,
        predicate: (s: Supplier) => ((get(s) || '').trim()) === v,
      }));
  }

  private rebuildFilterGroups(): void {
    const all = this.suppliers;
    const count = (pred: (s: Supplier) => boolean) => all.filter(pred).length;

    const groups: FilterGroup[] = [
      {
        key: 'division', label: 'חטיבה/משרד הבריאות', hint: 'מגיע דרך משרד הבריאות?',
        options: [
          { key: 'not-division', label: 'לא מהחטיבה', count: count((s) => !s.isDivision), predicate: (s) => !s.isDivision },
          { key: 'division', label: 'רק חטיבה', count: count((s) => s.isDivision), predicate: (s) => s.isDivision },
        ],
      },
      {
        key: 'criticality', label: 'קריטיות של ספק', hint: 'לפי טבלת הסיכונים (DB)',
        options: ['קריטי', 'לא קריטי', 'לא ידוע'].map((tier) => ({
          key: tier, label: tier, count: count((s) => s.criticalityTier === tier),
          predicate: (s: Supplier) => s.criticalityTier === tier,
        })),
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
        options: this.dataValueOptions((s) => s.systemType),
      },
      {
        key: 'nature', label: 'מהות הספק', hint: 'סוג ההתקשרות עם הספק',
        options: this.dataValueOptions((s) => s.nature),
      },
      {
        key: 'activeStatus', label: 'פעיל/לא פעיל', hint: 'הספק עדיין פעיל?',
        options: [
          { key: 'פעיל', label: 'פעיל', count: count((s) => s.status === 'פעיל'), predicate: (s) => s.status === 'פעיל' },
          { key: 'לא פעיל', label: 'לא פעיל', count: count((s) => s.status === 'לא פעיל'), predicate: (s) => s.status === 'לא פעיל' },
        ],
      },
    ];
    this.filterGroups = groups;

    const names = new Set<string>();
    for (const s of all) {
      const n = (s.name || '').trim();
      if (n) names.add(n);
    }
    this.supplierNames = Array.from(names).sort((a, b) => a.localeCompare(b, 'he', { sensitivity: 'base' }));
  }

  // General search looks at every value in the supplier card, not just the name.
  // Cached per supplier object — the getter below runs on every change-detection pass,
  // and the cache resets naturally because reload() replaces the supplier objects.
  private haystackCache = new WeakMap<Supplier, string>();

  private generalHaystack(s: Supplier): string {
    let hay = this.haystackCache.get(s);
    if (hay !== undefined) return hay;
    const parts: string[] = [];
    for (const key of Object.keys(s)) {
      const v = (s as any)[key];
      if (typeof v === 'string' || typeof v === 'number') parts.push(String(v));
    }
    for (const d of s.extraDocuments || []) {
      parts.push(d.label || '', d.status || '', d.notes || '');
    }
    hay = parts.join(' | ').toLowerCase();
    this.haystackCache.set(s, hay);
    return hay;
  }

  get filteredSuppliers(): Supplier[] {
    const groups = this.filterGroups;
    const text = this.searchText.trim().toLowerCase();
    const general = this.generalSearchText.trim().toLowerCase();
    return this.suppliers.filter((s) => {
      if (text) {
        const hay = `${s.name} ${s.contactPerson || ''} ${s.id}`.toLowerCase();
        if (hay.indexOf(text) < 0) return false;
      }
      if (general && this.generalHaystack(s).indexOf(general) < 0) return false;
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
    this.generalSearchText = '';
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
