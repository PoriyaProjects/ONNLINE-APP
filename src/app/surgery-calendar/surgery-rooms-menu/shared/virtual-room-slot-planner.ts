import { NappWaitingRow, PlannedWaitingSlot } from './virtual-room-waiting.models';

const SETUP_MINUTES = 20;
const DAY_START_MINUTES = 7 * 60 + 30;
const DAY_END_MINUTES = 15 * 60;

export interface RoomBoardColumn {
  roomName: string;
  uniqueDepartments?: string[];
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

export function getWaitingRowDepartment(row: NappWaitingRow): string {
  return normalizeLabel(row.RequestDepart ?? row.SeodeDepart ?? row.Department ?? '');
}

export function getWaitingRowDurationMinutes(row: NappWaitingRow): number {
  const direct = Number(row.DurationMinutes);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }
  const dror = Number(row.DrorDuration);
  if (Number.isFinite(dror) && dror > 0) {
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

function roomAcceptsDepartment(room: RoomBoardColumn, department: string): boolean {
  if (!department) {
    return false;
  }
  const departments = (room.uniqueDepartments ?? [])
    .map((value) => normalizeKey(value))
    .filter(Boolean);
  if (departments.length === 0) {
    return true;
  }
  return departments.includes(normalizeKey(department));
}

function compareCandidates(a: NappWaitingRow, b: NappWaitingRow): number {
  const waitA = Number(a.WaitingDays) || 0;
  const waitB = Number(b.WaitingDays) || 0;
  if (waitB !== waitA) {
    return waitB - waitA;
  }
  const dateA = Date.parse(String(a.RequestDate ?? '')) || 0;
  const dateB = Date.parse(String(b.RequestDate ?? '')) || 0;
  return dateA - dateB;
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

      const department = getWaitingRowDepartment(candidate);
      if (!roomAcceptsDepartment(room, department)) {
        return;
      }

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
