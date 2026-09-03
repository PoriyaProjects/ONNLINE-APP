export interface ServiceCodePrice {
  ServiceCode: string;
  GrossPrice: string;
}

export interface SurgeryPriceItem {
  Row_ID: string;
  IsEstimated: boolean;
  Codes?: ServiceCodePrice[];
  ServiceCode?: string;
  GrossPrice?: string;
}

export interface SurgeryRoomPriceSummary {
  SurgeryRoom: string;
  RoomGrossPriceTotal: string;
  DepartmentDayAverage: string;
}

export interface SurgeriesRoomDayClass {
  SurgeryPrices: SurgeryPriceItem[];
  RoomPriceSummaries: SurgeryRoomPriceSummary[];
}

export interface ResolvedSurgeryPriceMeta {
  grossPrice: number;
  isEstimated: boolean;
  serviceCode: string;
  codes: ServiceCodePrice[];
}

export function parseSurgeryPriceValue(value: unknown): number | null {
  const price = parseFloat(String(value ?? '').trim());
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function normalizeSurgeryPriceCodes(item: SurgeryPriceItem | null | undefined): ServiceCodePrice[] {
  if (!item) {
    return [];
  }

  if (Array.isArray(item.Codes) && item.Codes.length > 0) {
    return item.Codes
      .map((code) => ({
        ServiceCode: String(code?.ServiceCode ?? '').trim(),
        GrossPrice: String(code?.GrossPrice ?? '0').trim() || '0',
      }))
      .filter((code) => code.ServiceCode || parseSurgeryPriceValue(code.GrossPrice) != null);
  }

  const legacyPrice = parseSurgeryPriceValue(item.GrossPrice);
  const legacyCode = String(item.ServiceCode ?? '').trim();
  if (legacyPrice == null && !legacyCode) {
    return [];
  }

  return [{
    ServiceCode: legacyCode,
    GrossPrice: legacyPrice != null ? String(legacyPrice) : String(item.GrossPrice ?? '0').trim() || '0',
  }];
}

export function resolveSurgeryPriceMeta(
  item: SurgeryPriceItem | null | undefined,
  isEstimatedFlag: (value: unknown) => boolean,
): ResolvedSurgeryPriceMeta | null {
  if (!item?.Row_ID) {
    return null;
  }

  const codes = normalizeSurgeryPriceCodes(item);
  if (codes.length === 0) {
    return null;
  }

  let grossPrice: number | null = null;
  let serviceCode = '';

  codes.forEach((code) => {
    const price = parseSurgeryPriceValue(code.GrossPrice);
    if (price == null) {
      return;
    }

    if (grossPrice == null || price > grossPrice) {
      grossPrice = price;
      serviceCode = code.ServiceCode;
    }
  });

  if (grossPrice == null) {
    return null;
  }

  return {
    grossPrice,
    isEstimated: isEstimatedFlag(item.IsEstimated),
    serviceCode,
    codes,
  };
}

export function formatServiceCodePriceLines(
  codes: ServiceCodePrice[],
  formatPrice: (value: number) => string,
): string[] {
  return codes
    .map((code) => {
      const price = parseSurgeryPriceValue(code.GrossPrice);
      if (price == null) {
        return null;
      }

      const label = code.ServiceCode ? `קוד ${code.ServiceCode}` : 'קוד שירות';
      return `${label}: ${formatPrice(price)} ₪`;
    })
    .filter((line): line is string => !!line);
}
