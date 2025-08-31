/**
 * Extracts and parses JSON content from SOAP-wrapped strings.
 */

export function sanitizeSoapResponse(rawResponse: any): any {
  if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;

  const trimmed = rawResponse.trim();

  // Extract content from the <string> tags
  const stringTagOpenMatch = trimmed.match(/<string[^>]*>/);
  const stringTagCloseIndex = trimmed.indexOf('</string>');

  if (stringTagOpenMatch && stringTagCloseIndex !== -1) {
    const start = stringTagOpenMatch.index + stringTagOpenMatch[0].length;
    const content = trimmed.substring(start, stringTagCloseIndex).trim();

    // Remove quotes if the content is surrounded by quotes
    const unquoted = content.startsWith('"') && content.endsWith('"')
      ? content.slice(1, -1).replace(/\\"/g, '"')
      : content;

    try {
      return JSON.parse(unquoted);  // Parse the cleaned JSON string
    } catch (e) {
      console.warn('Failed to parse JSON from <string> content:', e);
      return unquoted;  // Return unparsed if JSON fails
    }
  }

  try {
    return JSON.parse(trimmed);  // Try parsing the whole string as JSON
  } catch (e) {
    console.warn('Failed to parse raw string as JSON:', e);
    return trimmed;
  }
}


// rename if you like, but you can keep the same name to minimize diffs
export function sanitizeSoapResponseAndFormatData(rawOrJson: any, label: string): any {
  let payload: any;

  if (typeof rawOrJson === 'string') {
    // Try SOAP-wrapped first
    const cleanRaw = rawOrJson.replace(/[\n\r]/g, '');
    const match = cleanRaw.match(/<string[^>]*>(.*?)<\/string>/);

    if (match) {
      // Old SOAP path
      let cleanedJsonString = match[1].trim();
      if (cleanedJsonString.startsWith('"') && cleanedJsonString.endsWith('"')) {
        cleanedJsonString = cleanedJsonString.slice(1, -1);
      }
      cleanedJsonString = cleanedJsonString.replace(/\\"/g, '"');
      payload = JSON.parse(cleanedJsonString);
    } else {
      // Plain JSON string path
      payload = JSON.parse(rawOrJson);
    }
  } else {
    // Already a JSON object (Angular HttpClient default)
    payload = rawOrJson;
  }

  // If the API already returns a Google DataTable JSON ({ cols, rows }), pass through
  if (payload && Array.isArray(payload.cols) && Array.isArray(payload.rows)) {
    return payload;
  }

  // Otherwise assume your legacy shape and map to DataTable JSON
  // Expected shape:
  // {
  //   yData: [
  //     { Year: { value: 2024, Months: [{ name: 'Jan', y: 123 }, ...] } },
  //     ...
  //   ]
  // }
  const dataTableJson = {
    cols: [
      { id: 'month', label: 'Month', type: 'string' },
      { id: label.toLowerCase(), label: label, type: 'number' }
    ],
    rows: [] as Array<{ c: Array<{ v: any }> }>
  };

  const yData = payload?.yData ?? [];
  yData.forEach((yearBlock: any) => {
    const year = yearBlock?.Year?.value;
    const months = yearBlock?.Year?.Months ?? [];
    months.forEach((m: any) => {
      const monthLabel = `${year} ${m?.name}`;
      dataTableJson.rows.push({ c: [{ v: monthLabel }, { v: Number(m?.y) || 0 }] });
    });
  });

  return dataTableJson;
}




export function sanitizeSoapResponseDept(rawResponse: any): any {
  if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;

  // Strip any leading/trailing whitespace
  const trimmed = rawResponse.trim();

  // Match the <string> tag and extract the JSON string content
  const stringTagOpenMatch = trimmed.match(/<string[^>]*>/);
  const stringTagCloseIndex = trimmed.indexOf('</string>');

  if (stringTagOpenMatch && stringTagCloseIndex !== -1) {
    const start = stringTagOpenMatch.index + stringTagOpenMatch[0].length;
    const content = trimmed.substring(start, stringTagCloseIndex).trim();

    // Remove surrounding quotes if present
    const unquoted = content.startsWith('"') && content.endsWith('"')
      ? content.slice(1, -1).replace(/\\"/g, '"') // Remove escaped quotes
      : content;

    try {
      // Parse the string into a JavaScript object
      return JSON.parse(unquoted);
    } catch (e) {
      console.warn('Failed to parse JSON from <string> content:', e);
      return unquoted; // Return the unparsed string if JSON parsing fails
    }
  }

  try {
    return JSON.parse(trimmed);  // Try to parse raw string as JSON if no <string> tags
  } catch (e) {
    console.warn('Failed to parse raw string as JSON:', e);
    return trimmed;
  }
}


/**
 * Extracts chart-style JSON (cols + rows) from a SOAP-wrapped <string>,
 * and returns a flat array of objects.
 */
export function sanitizeSoapChartData(rawResponse: string): any[] {
  if (!rawResponse || typeof rawResponse !== 'string') return [];

  const trimmed = rawResponse.trim();
  const openTag = trimmed.match(/<string[^>]*>/);
  const closeIndex = trimmed.indexOf('</string>');

  if (!openTag || closeIndex === -1) return [];

  const start = openTag.index! + openTag[0].length;
  const content = trimmed.substring(start, closeIndex).trim();

  const unquoted = content.startsWith('"') && content.endsWith('"')
    ? content.slice(1, -1).replace(/\\"/g, '"')
    : content;

  try {
    const parsed = JSON.parse(unquoted);

    if (!Array.isArray(parsed.rows) || !Array.isArray(parsed.cols)) return [];

    const colIds = parsed.cols.map((col: any) => col.id);

    return parsed.rows.map((row: any) => {
      const obj: any = {};
      row.c.forEach((cell: any, idx: number) => {
        obj[colIds[idx]] = cell?.v ?? null;
      });
      return obj;
    });
  } catch (e) {
    console.warn('Failed to parse chart-style SOAP response', e);
    return [];
  }
}

