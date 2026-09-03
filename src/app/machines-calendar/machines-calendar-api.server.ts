/**
 * קובץ זה מדמה את צד השרת עבור לוח שנה מכונים.
 * יש להעתיק את המימוש לשרת האמיתי כשה-APIs יהיו מוכנים.
 *
 * WebMethods מתוכננים:
 * - GetMachineRooms
 * - GetMachineRoomsByDate
 * - GetMachinesCalendarUserNamePermissions
 */

export interface GetMachineRoomsRequest {
  _month: string;
  _year: string;
}

export interface GetMachineRoomsResponseItem {
  ArrivalDate: string;
  CalendarRoomsArea: string;
  Physical: number;
  Virtual: number;
}

export interface GetMachineRoomsByDateRequest {
  _date: string;
}

export interface GetMachinesCalendarUserNamePermissionsRequest {
  _userName: string;
}

// TODO: מימוש בשרת — GetMachineRooms
export function GetMachineRooms(_request: GetMachineRoomsRequest): GetMachineRoomsResponseItem[] {
  return [];
}

// TODO: מימוש בשרת — GetMachineRoomsByDate
export function GetMachineRoomsByDate(_request: GetMachineRoomsByDateRequest): GetMachineRoomsResponseItem[] {
  return [];
}

// TODO: מימוש בשרת — GetMachinesCalendarUserNamePermissions
export function GetMachinesCalendarUserNamePermissions(
  _request: GetMachinesCalendarUserNamePermissionsRequest
): Record<string, unknown> {
  return {};
}
