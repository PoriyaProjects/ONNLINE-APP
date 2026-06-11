import { Injectable } from "@angular/core";

interface LocalCacheEnvelope<T> {
    data: T;
    savedAt: number;
}

/** מטמון localStorage לדשבורד הכנסות — נשמר בין רענונים; השרת רק כשאין נתונים */
@Injectable({ providedIn: "root" })
export class DepartmentIncomeLocalCacheService {
    private readonly prefix = "incomeDash.v1.";
    private readonly maxItemBytes = 4_500_000;

    get<T>(key: string): T | null {
        try {
            const raw = localStorage.getItem(this.storageKey(key));
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw) as LocalCacheEnvelope<T>;
            return parsed?.data ?? null;
        } catch {
            return null;
        }
    }

    set<T>(key: string, data: T): boolean {
        try {
            const envelope: LocalCacheEnvelope<T> = {
                data,
                savedAt: Date.now(),
            };
            const payload = JSON.stringify(envelope);
            if (payload.length > this.maxItemBytes) {
                console.warn(
                    "Income dashboard cache skipped (payload too large):",
                    key,
                );
                return false;
            }
            localStorage.setItem(this.storageKey(key), payload);
            return true;
        } catch (err) {
            console.warn("Income dashboard local cache write failed:", key, err);
            return false;
        }
    }

    remove(key: string): void {
        try {
            localStorage.removeItem(this.storageKey(key));
        } catch {
            /* ignore */
        }
    }

    clearAll(): void {
        try {
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(this.prefix)) {
                    toRemove.push(k);
                }
            }
            for (const k of toRemove) {
                localStorage.removeItem(k);
            }
        } catch {
            /* ignore */
        }
    }

    private storageKey(key: string): string {
        return this.prefix + key;
    }
}
