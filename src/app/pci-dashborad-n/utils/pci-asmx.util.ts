import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * ASP.NET ASMX returns XML-wrapped JSON for string WebMethods:
 * <?xml ...><string xmlns="...">[{...}]</string>
 * Angular HttpClient (responseType json) fails on that — parse as text first.
 */
export function parseAsmxPayload(raw: unknown): unknown {
    if (raw == null) {
        return raw;
    }

    let current: unknown = raw;
    if (typeof current === "string") {
        current = extractJsonFromAsmxText(current);
    }

    for (let depth = 0; depth < 5; depth++) {
        if (
            current &&
            typeof current === "object" &&
            !Array.isArray(current) &&
            Object.prototype.hasOwnProperty.call(current, "d")
        ) {
            current = (current as { d: unknown }).d;
            if (typeof current === "string") {
                current = extractJsonFromAsmxText(current);
            }
            continue;
        }
        break;
    }

    return current;
}

function extractJsonFromAsmxText(text: string): unknown {
    const trimmed = text.replace(/^\uFEFF/, "").trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.includes("<string")) {
        const tagStart = trimmed.indexOf("<string");
        const contentStart = trimmed.indexOf(">", tagStart) + 1;
        const contentEnd = trimmed.indexOf("</string>");
        if (contentStart > 0 && contentEnd > contentStart) {
            const inner = trimmed.substring(contentStart, contentEnd).trim();
            try {
                return JSON.parse(inner);
            } catch {
                return inner;
            }
        }
    }

    if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }

    return trimmed;
}

export function pciAsmxPost(
    http: HttpClient,
    url: string,
    body: Record<string, unknown> = {},
): Observable<unknown> {
    return http.post(url, body).pipe(map((raw) => parseAsmxPayload(raw)));
}
