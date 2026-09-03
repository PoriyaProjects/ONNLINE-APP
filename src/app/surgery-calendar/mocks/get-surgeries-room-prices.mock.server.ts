import {
  SurgeriesRoomDayClass,
  SurgeryPriceItem,
} from '../surgery-rooms-menu/shared/surgery-room-prices.models';

const MOCK_SURGERY_PRICES: SurgeryPriceItem[] = [
  {
    Row_ID: '138832',
    IsEstimated: false,
    Codes: [
      { ServiceCode: '01999', GrossPrice: '1745.00' },
      { ServiceCode: 'L5990', GrossPrice: '446.00' },
    ],
  },
  {
    Row_ID: '138901',
    IsEstimated: true,
    Codes: [
      { ServiceCode: '31205', GrossPrice: '2890.00' },
      { ServiceCode: '01999', GrossPrice: '1745.00' },
    ],
  },
  {
    Row_ID: '138950',
    IsEstimated: false,
    Codes: [
      { ServiceCode: '47400', GrossPrice: '5120.00' },
    ],
  },
];

const MOCK_ROOM_SUMMARIES = [
  {
    SurgeryRoom: 'חדר 1',
    RoomGrossPriceTotal: '11501',
    DepartmentDayAverage: '9800',
  },
  {
    SurgeryRoom: 'חדר 2',
    RoomGrossPriceTotal: '8420',
    DepartmentDayAverage: '0',
  },
];

export function buildMockSurgeriesRoomPricesResponse(
  _fullDate?: string,
  _surRoomCode?: string,
): { d: SurgeriesRoomDayClass } {
  return {
    d: {
      SurgeryPrices: MOCK_SURGERY_PRICES.map((item) => ({
        ...item,
        Codes: item.Codes?.map((code) => ({ ...code })),
      })),
      RoomPriceSummaries: MOCK_ROOM_SUMMARIES.map((summary) => ({ ...summary })),
    },
  };
}

export const MOCK_GET_SURGERIES_ROOM_PRICES_BY_SURGERY_ROOM_CODE =
  buildMockSurgeriesRoomPricesResponse('2026-03-03', 'אורתופדיה');
