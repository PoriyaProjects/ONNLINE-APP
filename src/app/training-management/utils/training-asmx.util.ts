/**
 * ASP.NET ASMX ScriptService response helpers.
 * Handles `{ d: T }`, JSON strings inside `d`, null/empty payloads.
 */

export function unwrapAsmxResponse<T>(raw: unknown): T {
  if (raw === null || raw === undefined) {
    return raw as T;
  }

  let payload: unknown = raw;
  if (typeof payload === 'object' && payload !== null && Object.prototype.hasOwnProperty.call(payload, 'd')) {
    payload = (payload as { d: unknown }).d;
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed === '') {
      return null as unknown as T;
    }
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return payload as unknown as T;
      }
    }
  }

  return payload as T;
}

export function isTrainingBusinessError(result: {
  Success?: boolean;
  ErrorCode?: string | null;
}): boolean {
  return result != null && result.Success === false;
}
