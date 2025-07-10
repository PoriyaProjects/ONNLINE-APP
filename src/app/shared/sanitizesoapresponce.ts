/**
 * Extracts and parses JSON content from SOAP-wrapped strings.
 */
// export function sanitizeSoapResponse(rawResponse: any): any {
//   if (!rawResponse || typeof rawResponse !== 'string') return rawResponse;

//   const trimmed = rawResponse.trim();

//   const stringTagOpenMatch = trimmed.match(/<string[^>]*>/);
//   const stringTagCloseIndex = trimmed.indexOf('</string>');

//   if (stringTagOpenMatch && stringTagCloseIndex !== -1) {
//     const start = stringTagOpenMatch.index! + stringTagOpenMatch[0].length;
//     const content = trimmed.substring(start, stringTagCloseIndex).trim();
//     const unquoted = content.startsWith('"') && content.endsWith('"')
//       ? content.slice(1, -1).replace(/\\"/g, '"')
//       : content;

//     try {
//       return JSON.parse(unquoted);
//     } catch (e) {
//       //console.warn('Failed to parse JSON from <string> content:', e);
//       return unquoted;
//     }
//   }

//   try {
//     return JSON.parse(trimmed);
//   } catch (e) {
//     //console.warn('Failed to parse raw string as JSON:', e);
//     return trimmed;
//   }
// }


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


export function sanitizeSoapResponseAndFormatData(raw: string, label: string): any {
  // Remove all line breaks to ensure safe matching in ES5
  const cleanRaw = raw.replace(/[\n\r]/g, '');
  const match = cleanRaw.match(/<string[^>]*>(.*?)<\/string>/);
  if (!match) throw new Error('Invalid SOAP response');

  let cleanedJsonString = match[1].trim();

  if (cleanedJsonString.startsWith('"') && cleanedJsonString.endsWith('"')) {
    cleanedJsonString = cleanedJsonString.slice(1, -1);
  }

  cleanedJsonString = cleanedJsonString.replace(/\\"/g, '"');

  //console.log("Cleaned JSON String Preview:", cleanedJsonString);

  const parsedData = JSON.parse(cleanedJsonString);

  const dataTableJson = {
    cols: [
      { id: 'month', label: 'Month', type: 'string' },
      { id: label.toLowerCase(), label: label, type: 'number' }
    ],
    rows: []
  };

  parsedData.yData.forEach((yearBlock: any) => {
    const year = yearBlock.Year.value;
    yearBlock.Year.Months.forEach((month: any) => {
      const monthLabel = `${year} ${month.name}`;
      dataTableJson.rows.push({ c: [{ v: monthLabel }, { v: month.y }] });
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

