import { MachineRoomCode } from './machine-rt-dashboard.models';

/** מזהה UI בלבד — לא חייב להתאים ל-roomCode בשרת */
export type MachineDashboardSlotId = string;

export interface MachineDashboardRoomSlot {
  code: MachineDashboardSlotId;
  label: string;
  /** כותרת משנה (למשל לב / מח) */
  subtitle?: string;
  /** חיבור ל-GetMachineRoomsRealtimeByDate כשקיים */
  apiCode?: MachineRoomCode;
}

export interface MachineDashboardCategory {
  id: string;
  label: string;
  rooms: MachineDashboardRoomSlot[];
}
