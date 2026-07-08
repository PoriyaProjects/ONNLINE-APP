import {
  NappWaitingRow,
  PlannedWaitingSlot,
  RoomDepartmentSurgerySummary,
} from './virtual-room-waiting.models';

const SETUP_MINUTES = 20;
const DAY_START_MINUTES = 7 * 60 + 30;
const DAY_END_MINUTES = 15 * 60;
const MIN_SURGERY_DURATION_MINUTES = 15;
export const MAX_WAITING_RECOMMENDATIONS = 50;

const NON_SURGERY_DEPARTMENT_PATTERN =
  /דימות|קרדיו|אקו|קונבנציונאלי|פט-|דימ-|ממוגרפיה|צנתור אבחנתי/i;

const GENERIC_SURGERY_DEPARTMENT_PATTERN = /חדרי ניתוח|^ניתוחים$/i;

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
  return normalizeLabel(row.SeodeDepart ?? row.Department ?? row.RequestDepart ?? '');
}

export function getWaitingRowDepartmentCandidates(row: NappWaitingRow): string[] {
  const values = [
    row.SeodeDepart,
    row.Department,
    row.RequestDepart,
  ]
    .map((value) => normalizeLabel(value))
    .filter(Boolean);

  return Array.from(new Set(values));
}

function getCandidateMatchingLabels(row: NappWaitingRow): string[] {
  const labels: string[] = [];
  const seodeDepart = normalizeLabel(row.SeodeDepart ?? '');
  const department = normalizeLabel(row.Department ?? '');
  const requestDepart = normalizeLabel(row.RequestDepart ?? '');

  if (seodeDepart) {
    labels.push(seodeDepart);
  }
  if (department && !labels.includes(department)) {
    labels.push(department);
  }
  if (
    requestDepart
    && !GENERIC_SURGERY_DEPARTMENT_PATTERN.test(requestDepart)
    && !labels.includes(requestDepart)
  ) {
    labels.push(requestDepart);
  }

  return labels;
}

function getRoomDepartmentsForMatching(room: RoomBoardColumn): string[] {
  if (room.departmentFilter) {
    return [normalizeLabel(room.departmentFilter)];
  }

  return (room.uniqueDepartments ?? [])
    .map((value) => normalizeLabel(value))
    .filter(Boolean);
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

function isScheduledSurgeryEvent(event: any): boolean {
  return !!(
    event?.Row_ID
    && event?.SurgeryPatientDetails
    && event?.SurgeryStatus !== 'Canceled'
    && !event?.isWaitingRecommendation
  );
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

function resolveMatchedDepartment(room: RoomBoardColumn, row: NappWaitingRow): string | null {
  const roomDepartments = getRoomDepartmentsForMatching(room);
  const candidateLabels = getCandidateMatchingLabels(row);

  for (const candidate of candidateLabels) {
    const match = roomDepartments.find((roomDept) => departmentsMatch(candidate, roomDept));
    if (match) {
      return match;
    }
  }

  return null;
}

function roomAcceptsCandidate(room: RoomBoardColumn, row: NappWaitingRow): boolean {
  return resolveMatchedDepartment(room, row) != null;
}

function buildRoomDepartmentSurgeries(
  room: RoomBoardColumn,
  matchedDepartment: string,
): RoomDepartmentSurgerySummary[] {
  return (room.Surgeries ?? [])
    .filter((event) => isScheduledSurgeryEvent(event))
    .filter((event) => departmentsMatch(event?.SurgeryRequestDepartments?.S_DEPARTMENT ?? '', matchedDepartment))
    .map((event) => ({
      caseNumber: String(event?.SurgeryPatientDetails?.PM_CASE_NUMBER ?? '').trim(),
      patientName: `${event?.SurgeryPatientDetails?.PM_FIRST_NAME ?? ''} ${event?.SurgeryPatientDetails?.PM_LAST_NAME ?? ''}`.trim(),
      department: normalizeLabel(event?.SurgeryRequestDepartments?.S_DEPARTMENT ?? matchedDepartment),
      startTime: String(event?.ArrivalTime ?? event?.ArrivalDate?.split?.(' ')?.[1] ?? '').trim(),
      endTime: String(event?.EndTime ?? '').trim(),
    }))
    .filter((row) => !!row.caseNumber)
    .sort((a, b) => a.startTime.localeCompare(b.startTime, 'he'));
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
    if (planned.length >= MAX_WAITING_RECOMMENDATIONS) {
      return;
    }

    const roomDepartments = getRoomDepartmentsForMatching(room);
    if (roomDepartments.length === 0) {
      return;
    }

    const gaps = buildFreeGaps(buildOccupiedIntervals(room));

    elective.forEach((candidate) => {
      if (planned.length >= MAX_WAITING_RECOMMENDATIONS) {
        return;
      }

      const key = buildScheduledCompositeKey(candidate.CaseNumber, candidate.RequestID);
      if (!key || assignedKeys.has(key)) {
        return;
      }

      const matchedDepartment = resolveMatchedDepartment(room, candidate);
      if (!matchedDepartment) {
        return;
      }

      const durationMinutes = getWaitingRowDurationMinutes(candidate);
      const roomDepartmentSurgeries = buildRoomDepartmentSurgeries(room, matchedDepartment);

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
          department: getWaitingRowDepartment(candidate),
          matchedDepartment,
          candidate,
          surgeryStartMinutes: surgeryStart,
          surgeryEndMinutes: surgeryEnd,
          setupStartMinutes: setupStart,
          roomDepartmentSurgeries,
          reasons: [
            `נכנס בחלון פנוי ${minutesToClock(gap.start)}–${minutesToClock(gap.end)}`,
            `מחלקה תואמת לחדר: ${matchedDepartment}`,
            roomDepartmentSurgeries.length > 0
              ? `לצד ${roomDepartmentSurgeries.length} ניתוחים באותה מחלקה בחדר`
              : 'מחלקה מתנחת בחדר ביום זה',
            'ממתין מ-NAPP',
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
