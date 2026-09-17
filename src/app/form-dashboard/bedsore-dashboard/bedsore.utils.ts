import { PatientDetails } from '../tumor-board/Tumor-data';

export const BEDSORE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const BEDSORE_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const BEDSORE_BODY_PARTS: { id: string; label: string }[] = [
  { id: 'head', label: 'ראש' },
  { id: 'torso', label: 'גו' },
  { id: 'left_arm', label: 'זרוע שמאל' },
  { id: 'right_arm', label: 'זרוע ימין' },
  { id: 'left_leg', label: 'רגל שמאל' },
  { id: 'right_leg', label: 'רגל ימין' },
];

export function getBodyPartLabel(id: string): string {
  if (!id) {
    return '';
  }
  const part = BEDSORE_BODY_PARTS.find(p => p.id === id);
  return part ? part.label : id;
}

export function filterChamelleonPatients(patients: any[], filter: string): any[] {
  const q = (filter || '').trim().toLowerCase();
  if (!q) {
    return patients || [];
  }
  return (patients || []).filter(p => {
    const haystack = [
      p.DepartName,
      p.FirstName,
      p.FatherName,
      p.LastName,
      p.CaseNumber,
      p.IDNumber,
      p.Age
    ].map(v => (v == null ? '' : String(v).toLowerCase())).join(' ');
    return haystack.includes(q);
  });
}

export function groupPatientsByDepartment(patients: any[]): { departName: string; patients: any[] }[] {
  const map = new Map<string, any[]>();
  (patients || []).forEach(p => {
    const key = p.DepartName || 'ללא מחלקה';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(p);
  });
  return Array.from(map.entries())
    .map(([departName, groupPatients]) => ({ departName, patients: groupPatients }))
    .sort((a, b) => a.departName.localeCompare(b.departName, 'he'));
}

export function mapChamelleonToPatientDetails(source: any): PatientDetails {
  return {
    RowID: source?.RowID ?? source?.Row_ID ?? null,
    Passport: source?.Passport ?? source?.IDNumber ?? null,
    FirstName: source?.FirstName ?? null,
    FatherName: source?.FatherName ?? null,
    LastName: source?.LastName ?? null,
    PhoneNumber: source?.PhoneNumber ?? null,
    CaseNumber: source?.CaseNumber ?? null,
    Address: source?.Address ?? null,
    DOB: source?.DOB ?? source?.Age ?? null,
  };
}

export function escapeHtml(value: string): string {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function validateBedsoreImageFile(file: File): string | null {
  if (!file) {
    return 'לא נבחר קובץ';
  }
  if (!BEDSORE_ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'סוג קובץ לא נתמך';
  }
  if (file.size > BEDSORE_MAX_IMAGE_BYTES) {
    return 'גודל הקובץ חורג מ-5MB';
  }
  return null;
}
