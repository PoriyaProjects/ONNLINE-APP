export type PciExploreGrain = "day" | "week" | "month";
export type PciExploreMetric = "count" | "duration" | "types" | "utilization";

export interface PciExploreRawRow {
    PeriodStart?: string | Date;
    periodStart?: string | Date;
    SurgeryType?: string;
    surgeryType?: string;
    Count?: number;
    count?: number;
    AvgDurationMin?: number;
    avgDurationMin?: number;
    UniqueRooms?: number;
    uniqueRooms?: number;
    UniqueDays?: number;
    uniqueDays?: number;
}

export interface PciExplorePeriodRow {
    periodStart: Date;
    label: string;
    count: number;
    avgDurationMin: number;
    uniqueRooms: number;
    uniqueDays: number;
    utilization: number;
    byType: { [type: string]: number };
    isHighOutlier: boolean;
    isLowOutlier: boolean;
}
