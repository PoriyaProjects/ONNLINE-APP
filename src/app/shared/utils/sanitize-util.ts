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
