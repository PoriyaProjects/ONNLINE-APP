/**
 * קובץ דמה לצד שרת — להעתקה לשרת האמיתי.
 * כאן יוגדרו ה-APIs לזמן אמת מכונים (צינתורים, גסטרו, אנגיו).
 */

import {
  MachineRoomCode,
  MachineRoomsRealtimeResponse,
} from '../models/machine-rt-dashboard.models';

/** GET — מצב חדרי מכונים לפי תאריך */
export function getMachineRoomsRealtimeByDate(
  _date: string,
): MachineRoomsRealtimeResponse {
  return {
    date: _date,
    rooms: [],
  };
}

/** GET — מצב חדר בודד */
export function getMachineRoomRealtimeByCode(
  _date: string,
  _roomCode: MachineRoomCode,
): { roomCode: MachineRoomCode; status: string } | null {
  return null;
}
