import {
  normalizeSurgeryPriceCodes,
  resolveSurgeryPriceMeta,
} from './surgery-room-prices.models';

describe('surgery-room-prices.models', () => {
  it('groups nested Codes and picks the highest price only', () => {
    const resolved = resolveSurgeryPriceMeta({
      Row_ID: '138832',
      IsEstimated: false,
      Codes: [
        { ServiceCode: '01999', GrossPrice: '1745.00' },
        { ServiceCode: 'L5990', GrossPrice: '446.00' },
      ],
    }, (value) => value === true);

    expect(resolved).toEqual({
      grossPrice: 1745,
      isEstimated: false,
      serviceCode: '01999',
      codes: [
        { ServiceCode: '01999', GrossPrice: '1745.00' },
        { ServiceCode: 'L5990', GrossPrice: '446.00' },
      ],
    });
  });

  it('supports legacy flat SurgeryPriceItem payloads', () => {
    const codes = normalizeSurgeryPriceCodes({
      Row_ID: '1',
      IsEstimated: true,
      ServiceCode: '31205',
      GrossPrice: '2890',
    });

    expect(codes).toEqual([
      { ServiceCode: '31205', GrossPrice: '2890' },
    ]);
  });
});
