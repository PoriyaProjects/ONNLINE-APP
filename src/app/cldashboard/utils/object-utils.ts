// export function deepMerge<T>(target: T, source: Partial<T>): T {
//     const isObject = (obj: any) =>
//       obj && typeof obj === 'object' && !Array.isArray(obj);
  
//     const output = { ...target };
  
//     Object.keys(source).forEach(key => {
//       const targetValue = (target as any)[key];
//       const sourceValue = (source as any)[key];
  
//       if (isObject(targetValue) && isObject(sourceValue)) {
//         (output as any)[key] = deepMerge(targetValue, sourceValue);
//       } else {
//         (output as any)[key] = sourceValue;
//       }
//     });
  
//     return output;
//   }
  
export function deepMerge<T>(target: T, source: Partial<T>): T {
    const isObject = (obj: any) =>
      obj && typeof obj === 'object' && !Array.isArray(obj);
  
    const output = { ...target };
  
    Object.keys(source).forEach(key => {
      const targetValue = (target as any)[key];
      const sourceValue = (source as any)[key];
  
      if (isObject(targetValue) && isObject(sourceValue)) {
        (output as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue;
      }
    });
  
    return output;
  }
  
  export function shallowMerge<T>(target: T, source: Partial<T>): T {
    return { ...target, ...source };
  }
  