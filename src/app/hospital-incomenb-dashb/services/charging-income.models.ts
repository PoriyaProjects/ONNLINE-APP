export interface ChargingIncomeResponse {
    request: RequestInfo;
    meta: MetaInfo;
    data: ChargingIncomeRow[];
    totals: TotalsInfo;
  }
  
  export interface RequestInfo {
    groupId?: number | null;
    deptId?: number | null;
    incomeCategory: string;
    fromYear?: number | null;
    toYear?: number | null;
    isYtd: boolean;
  }
  
  export interface MetaInfo {
    currency: string;          // "ILS"
    isYtd: boolean;
    throughDate: string;       // ISO
    language: string;          // "he-IL"
    version: string;           // "1.0"
    notes: string[];
  }
  
  export interface TotalsInfo {
    byYear: YearTotal[];
  }
  
  export interface YearTotal {
    year: number;
    totalCharging: number;
  }
  
  export interface ChargingIncomeRow {
    groupName: string;         // Hebrew ok
    groupId: number;
    deptName: string;          // Hebrew ok
    deptId: number;
    year: number;
    totalCharging?: number;
    totalGovrament?: number;
    totalTagid?: number;
    totalOther?: number;
    prevCharging?: number | null;
    chargingDiff?: number | null;
    chargingPct?: number | null; // fraction 0..1 (NOT %)
    // ... other *_Diff / *_Pct exist but we only use the charging ones here
  }
  