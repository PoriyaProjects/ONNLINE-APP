export type MachineRoomCode = 'cath-1' | 'cath-2' | 'gastro' | 'angio';

export interface MachineRoomSlot {
  code: MachineRoomCode;
  label: string;
}

export interface MachineRoomRealtimeState {
  roomCode: MachineRoomCode;
  roomLabel: string;
  status: string;
  lastUpdated: string | null;
}

export interface MachineRoomsRealtimeResponse {
  date: string;
  rooms: MachineRoomRealtimeState[];
}
