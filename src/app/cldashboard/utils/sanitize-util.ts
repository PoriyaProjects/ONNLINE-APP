export function sanitizeApiJson(
  response: any,
  mode: 'label-value' | 'id-name' | 'label-value-dept' | 'revenue-data' = 'label-value'
) {
  try {
    if (typeof response === 'string') {
      response = response.replace(/^\uFEFF/, '').trim();

      let jsonText = '';

      if (response.includes('<string')) {
        // SAFE version 🚀
        const startTag = '<string';
        const startTagEnd = response.indexOf('>', response.indexOf(startTag)) + 1;
        const endTag = '</string>';
        const endTagStart = response.indexOf(endTag);

        jsonText = response.substring(startTagEnd, endTagStart).trim();

       // console.log('[sanitizeApiJson] Raw jsonText (ASMX):', jsonText);
      } else {
        // REST fallback
        jsonText = response.trim();
       // console.log('[sanitizeApiJson] Raw jsonText (REST fallback):', jsonText);
      }

      const data = JSON.parse(jsonText);

     // console.log('[sanitizeApiJson] Parsed data:', data);
     // console.log('[sanitizeApiJson] Is array?', Array.isArray(data));

      // 🚀 1️⃣ RevenueDataPoint mode
      if (mode === 'revenue-data') {
        return data.map((item: any) => ({
          label: item.Label || item.label || '',
          value: Number(item.Value || item.value || 0),
          deptGroupId: item.DeptGroupId || item.deptGroupId || 0,
          deptGroupName: item.DeptGroupName || item.deptGroupName || ''
        }));
      }

      // 🚀 2️⃣ label-value
      if (mode === 'label-value') {
        return data.map((item: any) => ({
          label: item.Label || item.label || '',
          value: Number(item.Value || item.value || 0)
        }));
      }

      // 🚀 3️⃣ label-value-dept
      if (mode === 'label-value-dept') {
        return data.map((item: any) => ({
          label: item.Label || item.label || '',
          value: Number(item.Value || item.value || 0),
          dept: item.Dept || item.dept || '',
          deptCode: item.DeptCode || item.deptCode || ''
        }));
      }

      // 🚀 4️⃣ id-name fallback
      return data.map((item: any) => ({
        id: Number(item.id || item.ID || 0),
        name: item.name || item.Name || ''
      }));
    }

    return [];
  } catch (e) {
   // console.warn('[sanitizeApiJson] Error:', e);
   // console.warn('Response was:', response);
    return [];
  }
}

