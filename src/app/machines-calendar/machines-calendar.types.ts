export type MachineRoomType = 'physical' | 'virtual';

export interface MachineRoom {
  code: string;
  name: string;
}

export interface MachineCalendarDayEvent {
  ArrivalDate: string;
  CalendarRoomsArea: string;
  Physical: number;
  Virtual: number;
  start?: Date;
  time?: string;
  title?: string;
}

export const MACHINE_ROOMS: MachineRoom[] = [
  { code: 'cath-1', name: 'חדר צינתורים 1' },
  { code: 'cath-2', name: 'חדר צינתורים 2' },
  { code: 'gastro', name: 'חדר גסטרו' },
  { code: 'angio', name: 'חדר אנגיו' },
];

export const MACHINE_ROOM_TYPE_LABELS: Record<MachineRoomType, string> = {
  physical: 'פיזים',
  virtual: 'מכונים וירטואליים',
};
