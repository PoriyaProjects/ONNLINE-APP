import { NappWaitingRow, PlannedWaitingSlot } from './virtual-room-waiting.models';

const SETUP_MINUTES = 20;
const DAY_START_MINUTES = 7 * 60 + 30;
const DAY_END_MINUTES = 15 * 60;
const MIN_SURGERY_DURATION_MINUTES = 15;

const NON_SURGERY_DEPARTMENT_PATTERN =
  /דימות|קרדיו|אקו|קונבנציונאלי|פט-|דימ-|ממוגרפיה|צנתור אבחנתי/i;

export interface RoomBoardColumn {
  roomName: string;
  uniqueDepartments?: string[];
  departmentFilter?: string | null;
  Surgeries?: any[];
}

function normalizeLabel(value: any): string {
  return String(value ?? '')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeKey(value: any): string {
  return normalizeLabel(value).replace(/\s+/g, '');
}

export function parseRequestDate(value: any): number {
  const raw = normalizeLabel(value);
  if (!raw) {
    return 0;
  }

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return Date.parse(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return Date.parse(iso[0]);
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildScheduledCompositeKey(caseNumber: any, requestId: any): string | null {
  const caseKey = normalizeKey(caseNumber);
  const requestKey = normalizeKey(requestId);
  if (!caseKey || !requestKey) {
    return null;
  }
  return `${caseKey}|${requestKey}`;
}

export function isElectiveWaitingRow(row: NappWaitingRow): boolean {
  const urgency = normalizeLabel(row.Urgency ?? row.SurgeryType ?? '');
  const type = normalizeKey(row.SurgeryType ?? '');

  if (type.includes('ססיה') || urgency.includes('ססיה')) {
    return false;
  }
  if (urgency === 'לא דחוף' || urgency.startsWith('לא דחוף')) {
    return true;
  }
  if (urgency.includes('דחוף') || type === 'דחוף') {
    return false;
  }
  return true;
}

export function hasValidVkgid(vkgid: any): boolean {
  const value = String(vkgid ?? '').trim();
  if (!value) {
    return false;
  }
  return !/^0+$/.test(value);
}

/** Exclude imaging / cardiology clinic rows; keep OR-relevant NAPP waiting rows. */
export function isSurgeryWaitingRow(row: NappWaitingRow): boolean {
  const requestDepart = normalizeLabel(row.RequestDepart ?? row.Department ?? '');
  const seodeDepart = normalizeLabel(row.SeodeDepart ?? '');
  const combined = `${requestDepart} ${seodeDepart}`;

  if (NON_SURGERY_DEPARTMENT_PATTERN.test(combined)) {
    return false;
  }

  if (/^דימ-/i.test(seodeDepart)) {
    return false;
  }

  if (/ניתוח/i.test(requestDepart)) {
    return true;
  }

  if (/^(חנ-|מר-|רא)/i.test(seodeDepart)) {
    return true;
  }

  if (/^מר-/i.test(requestDepart)) {
    return true;
  }

  return getWaitingRowDurationMinutes(row) >= MIN_SURGERY_DURATION_MINUTES;
}

export function getWaitingRowDepartment(row: NappWaitingRow): string {
  return normalizeLabel(row.Department ?? row.RequestDepart ?? row.SeodeDepart ?? '');
}

export function getWaitingRowDepartmentCandidates(row: NappWaitingRow): string[] {
  const values = [
    row.Department,
    row.RequestDepart,
    row.SeodeDepart,
  ]
    .map((value) => normalizeLabel(value))
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function getWaitingRowDurationMinutes(row: NappWaitingRow): number {
  const direct = Number(row.DurationMinutes);
  if (Number.isFinite(direct) && direct >= MIN_SURGERY_DURATION_MINUTES) {
    return Math.round(direct);
  }
  const dror = Number(row.DrorDuration);
  if (Number.isFinite(dror) && dror >= MIN_SURGERY_DURATION_MINUTES) {
    return Math.round(dror);
  }
  return 60;
}

function isOccupyingBoardEvent(event: any): boolean {
  if (!event || event.isWaitingRecommendation) {
    return false;
  }
  if (event.SurgeryStatus === 'Canceled') {
    return false;
  }
  if (event.Row_ID) {
    return true;
  }
  const cssClass = String(event.cssClass ?? '');
  return cssClass.includes('surgery-cal-event--setup');
}

function eventIntervalMinutes(event: any): { start: number; end: number } | null {
  if (!event?.start || !event?.end) {
    return null;
  }
  const start = event.start.getHours() * 60 + event.start.getMinutes();
  const end = event.end.getHours() * 60 + event.end.getMinutes();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end };
}

function buildOccupiedIntervals(room: RoomBoardColumn): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  (room.Surgeries ?? []).forEach((event) => {
    if (!isOccupyingBoardEvent(event)) {
      return;
    }
    const interval = eventIntervalMinutes(event);
    if (interval) {
      intervals.push(interval);
    }
  });
  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

function buildFreeGaps(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const gaps: Array<{ start: number; end: number }> = [];
  let cursor = DAY_START_MINUTES;

  intervals.forEach((interval) => {
    const clampedStart = Math.max(interval.start, DAY_START_MINUTES);
    const clampedEnd = Math.min(interval.end, DAY_END_MINUTES);
    if (clampedEnd <= DAY_START_MINUTES || clampedStart >= DAY_END_MINUTES) {
      return;
    }
    if (clampedStart > cursor) {
      gaps.push({ start: cursor, end: clampedStart });
    }
    cursor = Math.max(cursor, clampedEnd);
  });

  if (cursor < DAY_END_MINUTES) {
    gaps.push({ start: cursor, end: DAY_END_MINUTES });
  }

  return gaps.filter((gap) => gap.end > gap.start);
}

function departmentsMatch(candidateLabel: string, roomLabel: string): boolean {
  const candidateKey = normalizeKey(candidateLabel);
  const roomKey = normalizeKey(roomLabel);
  if (!candidateKey || !roomKey) {
    return false;
  }
  if (candidateKey === roomKey) {
    return true;
  }
  return candidateKey.includes(roomKey) || roomKey.includes(candidateKey);
}

function roomAcceptsCandidate(room: RoomBoardColumn, row: NappWaitingRow): boolean {
  const candidateLabels = getWaitingRowDepartmentCandidates(row);
  if (candidateLabels.length === 0) {
    return false;
  }

  const roomDepartments = (room.uniqueDepartments ?? [])
    .map((value) => normalizeLabel(value))
    .filter(Boolean);

  if (room.departmentFilter) {
    return candidateLabels.some((label) => departmentsMatch(label, room.departmentFilter));
  }

  if (roomDepartments.length === 0) {
    return true;
  }

  return candidateLabels.some((candidate) =>
    roomDepartments.some((roomDept) => departmentsMatch(candidate, roomDept))
  );
}

function compareCandidates(a: NappWaitingRow, b: NappWaitingRow): number {
  const waitA = Number(a.WaitingDays) || 0;
  const waitB = Number(b.WaitingDays) || 0;
  if (waitB !== waitA) {
    return waitB - waitA;
  }
  return parseRequestDate(a.RequestDate) - parseRequestDate(b.RequestDate);
}

function minutesToClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function planWaitingRecommendations(
  rooms: RoomBoardColumn[],
  candidates: NappWaitingRow[],
  scheduledKeys: Set<string>
): PlannedWaitingSlot[] {
  const elective = candidates
    .filter((row) => isSurgeryWaitingRow(row))
    .filter((row) => isElectiveWaitingRow(row))
    .filter((row) => {
      const key = buildScheduledCompositeKey(row.CaseNumber, row.RequestID);
      return key != null && !scheduledKeys.has(key);
    })
    .sort(compareCandidates);

  const planned: PlannedWaitingSlot[] = [];
  const assignedKeys = new Set<string>();

  rooms.forEach((room) => {
    const gaps = buildFreeGaps(buildOccupiedIntervals(room));

    elective.forEach((candidate) => {
      const key = buildScheduledCompositeKey(candidate.CaseNumber, candidate.RequestID);
      if (!key || assignedKeys.has(key)) {
        return;
      }

      if (!roomAcceptsCandidate(room, candidate)) {
        return;
      }

      const department = getWaitingRowDepartment(candidate);
      const durationMinutes = getWaitingRowDurationMinutes(candidate);

      for (const gap of gaps) {
        const surgeryStart = Math.max(gap.start + SETUP_MINUTES, DAY_START_MINUTES);
        const surgeryEnd = surgeryStart + durationMinutes;
        const setupStart = surgeryStart - SETUP_MINUTES;

        if (setupStart < gap.start) {
          continue;
        }
        if (surgeryEnd > DAY_END_MINUTES) {
          continue;
        }

        planned.push({
          roomName: room.roomName,
          department,
          candidate,
          surgeryStartMinutes: surgeryStart,
          surgeryEndMinutes: surgeryEnd,
          setupStartMinutes: setupStart,
          reasons: [
            `נכנס בחלון פנוי ${minutesToClock(gap.start)}–${minutesToClock(gap.end)}`,
            department ? `מחלקה תואמת: ${department}` : 'מחלקה תואמת',
            candidate.WaitingDays != null ? `המתנה ${candidate.WaitingDays} ימים` : 'ממתין מ-NAPP',
            'לשיבוץ ב-SAP בלבד',
          ],
        });

        assignedKeys.add(key);
        gaps.splice(gaps.indexOf(gap), 1, {
          start: surgeryEnd + SETUP_MINUTES,
          end: gap.end,
        });
        break;
      }
    });
  });

  return planned.sort((a, b) => {
    const roomCmp = a.roomName.localeCompare(b.roomName, 'he');
    if (roomCmp !== 0) {
      return roomCmp;
    }
    return a.surgeryStartMinutes - b.surgeryStartMinutes;
  });
}
