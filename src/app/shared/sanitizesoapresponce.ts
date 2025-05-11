/**
 * Extracts and parses JSON content from SOAP-wrapped strings.
 */
export function sanitizeSoapResponse(rawResponse: any): any {
  if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;

  const trimmed = rawResponse.trim();

  const stringTagOpenMatch = trimmed.match(/<string[^>]*>/);
  const stringTagCloseIndex = trimmed.indexOf('</string>');

  if (stringTagOpenMatch && stringTagCloseIndex !== -1) {
    const start = stringTagOpenMatch.index! + stringTagOpenMatch[0].length;
    const content = trimmed.substring(start, stringTagCloseIndex).trim();
    const unquoted = content.startsWith('"') && content.endsWith('"')
      ? content.slice(1, -1).replace(/\\"/g, '"')
      : content;

    try {
      return JSON.parse(unquoted);
    } catch (e) {
      console.warn('Failed to parse JSON from <string> content:', e);
      return unquoted;
    }
  }

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.warn('Failed to parse raw string as JSON:', e);
    return trimmed;
  }
}
