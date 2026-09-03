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

// TODO: מימוש בשרת — GetMachineAppointmentsByDate
export interface GetMachineAppointmentsByDateRequest {
  _fullDate: string;
  _roomType: 'physical' | 'virtual';
  _roomCode?: string;
}

export interface GetMachineAppointmentsByDateResponseItem {
  RoomCode: string;
  ArrivalTime: string;
  EndTime: string;
  PatientName: string;
  CaseNumber: string;
}

export function GetMachineAppointmentsByDate(
  _request: GetMachineAppointmentsByDateRequest
): GetMachineAppointmentsByDateResponseItem[] {
  return [];
}

// TODO: מימוש בשרת — GetMachinesCalendarUserNamePermissions
export function GetMachinesCalendarUserNamePermissions(
  _request: GetMachinesCalendarUserNamePermissionsRequest
): Record<string, unknown> {
  return {};
}
