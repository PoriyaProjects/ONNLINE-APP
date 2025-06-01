// export function sanitizeApiJson(
//   response: any,
//   mode: 'label-value' | 'id-name' = 'label-value'
// ): { label: string; value: number }[] | { id: number; name: string }[] {
//   try {
//     let data: any[] = [];

//     // Strip BOM if present
//     if (typeof response === 'string') {
//       response = response.replace(/^\uFEFF/, '').trim();
//     }

//     // Case 1: Raw JSON array string
//     if (typeof response === 'string' && response.startsWith('[')) {
//       data = JSON.parse(response);
//     }

//     // Case 2: XML <string> containing JSON array
//     else if (typeof response === 'string' && response.includes('<string')) {
//       const parser = new window.DOMParser();
//       const xml = parser.parseFromString(response, 'text/xml');
//       const stringNode = xml.getElementsByTagName('string')[0];
//       const jsonText = stringNode?.textContent?.trim() || '[]';
//       data = JSON.parse(jsonText);
//     }

//     // Case 3: Specific XML (e.g. GetTimeTypes)
//     else if (typeof response === 'string' && response.includes('<ArrayOfDW_DimTimeTypes')) {
//       const parser = new window.DOMParser();
//       const xml = parser.parseFromString(response, 'text/xml');
//       const items = Array.from(xml.getElementsByTagName('DW_DimTimeTypes'));
//       return items.map(item => ({
//         id: parseInt(item.getElementsByTagName('DimTimeTypeID')[0]?.textContent || '0', 10),
//         name: item.getElementsByTagName('DimTimeTypeDesc')[0]?.textContent?.trim() || ''
//       }));
//     }

//     // Case 4: Already-parsed array
//     else if (Array.isArray(response)) {
//       data = response;
//     }

//     if (!Array.isArray(data)) {
//       throw new Error('Invalid or unrecognized data format');
//     }

//     // Normalize based on requested mode
//     if (mode === 'label-value') {
//       return data
//         .filter(item => item && (item.Label || item.label))
//         .map(item => ({
//           label: (item.Label || item.label || '').toString().trim(),
//           value: Number(item.Value !== undefined ? item.Value : item.value)
//         }));
//     } else {
//       return data
//         .filter(item => item && (item.name || item.Name))
//         .map(item => ({
//           id: Number(item.id !== undefined ? item.id : item.ID),
//           name: (item.name || item.Name || '').toString().trim()
//         }));
//     }
//   } catch (err) {
//     console.warn('[sanitizeApiJson] Failed to sanitize response:', err);
//     return [];
//   }
// }
export function sanitizeApiJson(response: any, mode: 'label-value' | 'id-name' = 'label-value') {
  try {
    if (typeof response === 'string') {
      response = response.replace(/^\uFEFF/, '').trim();

      if (response.includes('<string')) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(response, 'text/xml');
        const stringNode = xml.getElementsByTagName('string')[0];
        const jsonText = stringNode?.textContent?.trim() || '[]';
        const data = JSON.parse(jsonText);

        return mode === 'label-value'
          ? data.map((item: any) => ({
              label: item.Label || item.label || '',
              value: Number(item.Value || item.value || 0)
            }))
          : data.map((item: any) => ({
              id: Number(item.id || item.ID || 0),
              name: item.name || item.Name || ''
            }));
      }
    }

    return [];
  } catch (e) {
    console.warn('[sanitizeApiJson] Error:', e);
    return [];
  }
}
