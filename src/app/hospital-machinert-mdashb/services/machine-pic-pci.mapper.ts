import {
  MachineRoomCode,
  MachineRoomProcedureItem,
  MachineRoomRealtimeState,
} from '../models/machine-rt-dashboard.models';

/** שורה אחרי מיפוי עמודות מ-GetPicDetailedDataCombined (תוויות עברית). */
export interface PicPciRow {
  caseNumber: string;
  patientNumber: string;
  dateIso: string;
  roomNumber: string;
  roomEntryTime: string | null;
  procedureEndTime: string | null;
  roomExitTime: string | null;
  endTimeRaw: string | null;
  surgeonName: string | null;
  surgeryName: string | null;
}

interface GoogleChartTable {
  cols?: Array<{ id?: string; label?: string }>;
  rows?: Array<{ c?: Array<{ v?: unknown } | null> }>;
}

const ROOM_LABELS: Record<MachineRoomCode, string> = {
  'cath-1': 'חדר צינתורים 1',
  'cath-2': 'חדר צינתורים 2',
  gastro: 'חדר גסטרו',
  angio: 'חדר אנגיו',
};

const COL_CASE = 'sf_case';
const COL_DATE = 'sf_date';
const COL_ROOM = 'room_number';
const COL_TEROOM = 'sf_teroom';
const COL_TIME = 'sf_time';
const COL_ENDCUT = 'sf_endcut';
const COL_EXROOM = 'sf_exroom';
const COL_DOC = 'doc_name';
const COL_DESC = 'drg_doc_desc_kabala';

export function buildCathRoomsFromPicCombined(
  payload: unknown,
  targetDateIso: string,
  lastUpdated: string,
): MachineRoomRealtimeState[] {
  const rows = parsePicCombinedPayload(payload).filter((r) => r.dateIso === targetDateIso);

  const byRoom: Record<'cath-1' | 'cath-2', PicPciRow[]> = {
    'cath-1': [],
    'cath-2': [],
  };

  rows.forEach((row) => {
    const code = mapRoomNumberToCode(row.roomNumber);
    if (code) {
      byRoom[code].push(row);
    }
  });

  return (['cath-1', 'cath-2'] as const).map((code) => toRoomState(code, byRoom[code], lastUpdated));
}

export function parsePicCombinedPayload(payload: unknown): PicPciRow[] {
  const table = unwrapChartTable(payload);
  if (!table?.cols?.length || !table.rows?.length) {
    return [];
  }

  const colIds = table.cols.map((c, i) => (c.id || c.label || `col${i}`).trim().toLowerCase());

  return table.rows
    .map((row) => rowToPicPciRow(row.c || [], colIds))
    .filter((r) => r.caseNumber.length > 0 && r.dateIso.length > 0);
}

function toRoomState(
  code: 'cath-1' | 'cath-2',
  rows: PicPciRow[],
  lastUpdated: string,
): MachineRoomRealtimeState {
  const items = rows.map(toProcedureItem);
  const inProgress = pickInProgress(items);
  const completedToday = items
    .filter((item) => item !== inProgress && isCompletedItem(item))
    .sort((a, b) => timeCompare(b.roomExitTime, a.roomExitTime));

  const plannedToday: MachineRoomProcedureItem[] = [];
  const status = buildStatusText(inProgress, completedToday.length, plannedToday.length);

  return {
    roomCode: code,
    roomLabel: ROOM_LABELS[code],
    status,
    lastUpdated,
    completedCount: completedToday.length,
    plannedCount: 0,
    inProgress,
    completedToday,
    plannedToday,
  };
}

function pickInProgress(items: MachineRoomProcedureItem[]): MachineRoomProcedureItem | null {
  const active = items.filter((item) => isInProgressItem(item));
  if (active.length === 0) {
    return null;
  }
  active.sort((a, b) => timeCompare(b.roomEntryTime, a.roomEntryTime));
  return active[0];
}

function isInProgressItem(item: MachineRoomProcedureItem): boolean {
  const entered = hasTime(item.roomEntryTime);
  const exited = hasTime(item.roomExitTime);
  return entered && !exited;
}

function isCompletedItem(item: MachineRoomProcedureItem): boolean {
  return hasTime(item.roomExitTime) || hasTime(item.procedureEndTime);
}

function hasTime(value: string | null | undefined): boolean {
  const t = normalizeTime(value);
  return t != null && t !== '00:00:00';
}

function buildStatusText(
  inProgress: MachineRoomProcedureItem | null,
  completedCount: number,
  plannedCount: number,
): string {
  if (inProgress) {
    const caseNo = (inProgress.caseNumber || '').trim();
    return caseNo ? `בתהליך — ${caseNo}` : 'בתהליך';
  }
  if (plannedCount > 0) {
    return `מתוכנן (${plannedCount})`;
  }
  if (completedCount > 0) {
    return `הושלם (${completedCount})`;
  }
  return 'פנוי';
}

function toProcedureItem(row: PicPciRow): MachineRoomProcedureItem {
  return {
    surgeryId: null,
    caseNumber: row.caseNumber,
    surgeryName: row.surgeryName,
    department: null,
    surgeonName: row.surgeonName,
    status: isInProgressRow(row) ? 'InProgress' : isCompletedRow(row) ? 'Completed' : null,
    surgeryRoom: row.roomNumber,
    roomEntryTime: normalizeTime(row.roomEntryTime),
    procedureStartTime: normalizeTime(row.roomEntryTime),
    procedureEndTime: normalizeTime(row.procedureEndTime),
    roomExitTime: normalizeTime(row.roomExitTime),
    plannedStartTime: null,
    plannedEndTime: null,
  };
}

function isInProgressRow(row: PicPciRow): boolean {
  return hasTime(row.roomEntryTime) && !hasTime(row.roomExitTime);
}

function isCompletedRow(row: PicPciRow): boolean {
  return hasTime(row.roomExitTime) || hasTime(row.procedureEndTime);
}

function rowToPicPciRow(cells: Array<{ v?: unknown } | null>, colIds: string[]): PicPciRow {
  const get = (id: string): string => {
    const idx = colIds.indexOf(id);
    if (idx < 0) {
      return '';
    }
    return cellToString(cells[idx]?.v);
  };

  return {
    caseNumber: get(COL_CASE),
    patientNumber: get('patientnumber'),
    dateIso: normalizeDateIso(get(COL_DATE)),
    roomNumber: get(COL_ROOM),
    roomEntryTime: get(COL_TEROOM) || null,
    endTimeRaw: get(COL_TIME) || null,
    procedureEndTime: get(COL_ENDCUT) || null,
    roomExitTime: get(COL_EXROOM) || null,
    surgeonName: get(COL_DOC) || null,
    surgeryName: get(COL_DESC) || null,
  };
}

function mapRoomNumberToCode(roomNumber: string): 'cath-1' | 'cath-2' | null {
  const n = (roomNumber || '').trim();
  if (n === '1') {
    return 'cath-1';
  }
  if (n === '2') {
    return 'cath-2';
  }
  return null;
}

function unwrapChartTable(payload: unknown): GoogleChartTable | null {
  let value: unknown = payload;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as GoogleChartTable;
}

function cellToString(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (value instanceof Date) {
    return formatIsoDate(value);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return normalizeDateIso(text.slice(0, 10));
  }
  return text;
}

function normalizeDateIso(raw: string): string {
  const value = (raw || '').trim();
  if (!value) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return formatIsoDate(parsed);
  }
  return '';
}

function formatIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeTime(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (!value || value === '00:00:00' || value.startsWith('00:00:00')) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) {
    return null;
  }
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  const ss = (match[3] || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function timeCompare(a: string | null | undefined, b: string | null | undefined): number {
  return (normalizeTime(b) || '').localeCompare(normalizeTime(a) || '');
}
