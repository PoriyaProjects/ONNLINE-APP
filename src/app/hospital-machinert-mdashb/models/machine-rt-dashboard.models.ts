export type MachineRoomCode = 'cath-1' | 'cath-2' | 'gastro' | 'angio';

export interface MachineRoomSlot {
  code: MachineRoomCode;
  label: string;
}

export interface MachineRoomProcedureItem {
  surgeryId: string | null;
  caseNumber: string | null;
  surgeryName: string | null;
  department: string | null;
  surgeonName: string | null;
  status: string | null;
  surgeryRoom: string | null;
  roomEntryTime: string | null;
  procedureStartTime: string | null;
  procedureEndTime: string | null;
  roomExitTime: string | null;
  plannedStartTime: string | null;
  plannedEndTime: string | null;
}

export interface MachineRoomRealtimeState {
  roomCode: MachineRoomCode;
  roomLabel: string;
  status: string;
  lastUpdated: string | null;
  completedCount: number;
  plannedCount: number;
  inProgress: MachineRoomProcedureItem | null;
  completedToday: MachineRoomProcedureItem[];
  plannedToday: MachineRoomProcedureItem[];
}

export interface MachineRoomsRealtimeResponse {
  date: string;
  rooms: MachineRoomRealtimeState[];
  error?: string | null;
}
