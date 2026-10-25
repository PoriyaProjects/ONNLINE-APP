/** Street heatmap for the births dashboard. No new map library — draws on the Google map already loaded by @agm/core. */

export type StreetHeatKind = 'לידה' | 'ללא לידה' | string;

export type StreetHeatMode = 'births' | 'missed' | 'loss' | 'potential';

export interface BirthStreetHeatRow {
  Kind: string;
  City: string;
  Street: string;
  PostCode: string;
  PatientId: string;
  EventDate: string;
  PregnancyWeek: string;
  ValidStreet: number;
  CountByStreetKind: number;
  StreetPotential: number;
  MissPercent: number;
  Lat: number | null;
  Lng: number | null;
}

export interface StreetHeatPoint {
  city: string;
  street: string;
  label: string;
  postCode: string;
  lat: number | null;
  lng: number | null;
  births: number;
  missed: number;
  potential: number;
  missPercent: number;
  validStreet: number;
}

export interface StreetHeatRank extends StreetHeatPoint {
  weight: number;
}

export interface StreetHeatAggregate {
  points: StreetHeatPoint[];
  unmapped: string[];
}

interface LatLng {
  lat: number;
  lng: number;
}

function normName(value: string): string {
  return (value || '')
    .replace(/['׳״"`´]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function num(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (let i = 0; i < keys.length; i++) {
    const value = row[keys[i]];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** Locality centers. Street positions are a stable offset around the center unless the server sends Lat/Lng. */
const LOCALITY_ENTRIES: Array<[string, number, number]> = [
  ['אביבים', 33.0894, 35.4716],
  ['אביגדור', 31.7108, 34.6803],
  ['אבני איתן', 32.8245, 35.766],
  ['מגאר', 32.889, 35.411],
  ['עראבה', 32.851, 35.339],
  ['דייר חנא', 32.862, 35.368],
  ['סחנין', 32.864, 35.297],
  ['עילבון', 32.838, 35.4],
  ['שעב', 32.889, 35.239],
  ['כאבול', 32.869, 35.209],
  ['טמרה', 32.853, 35.198],
  ['אעבלין', 32.826, 35.192],
  ['שפרעם', 32.806, 35.17],
  ['כאוכב אבו אל היגא', 32.831, 35.248],
  ['ביר אל מכסור', 32.777, 35.221],
  ['כפר מנדא', 32.81, 35.26],
  ['בועיינה נוג\'ידאת', 32.807, 35.364],
  ['טורעאן', 32.777, 35.374],
  ['כפר כנא', 32.746, 35.341],
  ['משהד', 32.741, 35.323],
  ['עין מאהל', 32.722, 35.351],
  ['דבוריה', 32.692, 35.371],
  ['אכסאל', 32.681, 35.325],
  ['עילוט', 32.718, 35.256],
  ['ריינה', 32.719, 35.316],
  ['יפיע', 32.689, 35.274],
  ['נצרת', 32.699, 35.303],
  ['נוף הגליל', 32.708, 35.324],
  ['מגדל העמק', 32.677, 35.24],
  ['עפולה', 32.607, 35.289],
  ['בית שאן', 32.497, 35.498],
  ['טבריה', 32.795, 35.531],
  ['פוריה', 32.756, 35.541],
  ['מגדל', 32.839, 35.501],
  ['גינוסר', 32.847, 35.522],
  ['ארבל', 32.813, 35.484],
  ['כפר תבור', 32.687, 35.421],
  ['יבנאל', 32.709, 35.504],
  ['כפר כמא', 32.721, 35.441],
  ['יקנעם', 32.659, 35.11],
  ['קריית טבעון', 32.723, 35.127],
  ['בסמת טבעון', 32.736, 35.154],
  ['רמת ישי', 32.705, 35.166],
  ['רכסים', 32.751, 35.099],
  ['נשר', 32.771, 35.044],
  ['דלית אל כרמל', 32.693, 35.051],
  ['עוספיא', 32.719, 35.064],
  ['טירת כרמל', 32.762, 34.972],
  ['חיפה', 32.794, 34.989],
  ['קריית אתא', 32.806, 35.105],
  ['קריית ביאליק', 32.827, 35.086],
  ['קריית מוצקין', 32.838, 35.077],
  ['קריית ים', 32.85, 35.07],
  ['קריית חיים', 32.824, 35.068],
  ['עכו', 32.928, 35.082],
  ['נהריה', 33.008, 35.098],
  ['מזרעה', 32.983, 35.098],
  ['כפר יאסיף', 32.954, 35.165],
  ['אבו סנאן', 32.958, 35.172],
  ['ירכא', 32.954, 35.164],
  ['ג\'וליס', 32.944, 35.178],
  ['ג\'דיידה מכר', 32.938, 35.147],
  ['כרמיאל', 32.919, 35.295],
  ['דיר אל אסד', 32.932, 35.271],
  ['בענה', 32.929, 35.274],
  ['מג\'ד אל כרום', 32.922, 35.255],
  ['נחף', 32.934, 35.317],
  ['סאג\'ור', 32.939, 35.341],
  ['ראמה', 32.938, 35.367],
  ['כסרא סמיע', 32.965, 35.3],
  ['פקיעין', 32.98, 35.334],
  ['בית ג\'ן', 32.965, 35.379],
  ['חורפיש', 33.015, 35.347],
  ['מעיליא', 33.027, 35.256],
  ['פסוטה', 33.049, 35.309],
  ['כפר ורדים', 32.993, 35.269],
  ['מעלות תרשיחא', 33.016, 35.277],
  ['שלומי', 33.072, 35.145],
  ['צפת', 32.965, 35.496],
  ['ראש פינה', 32.969, 35.542],
  ['חצור הגלילית', 32.98, 35.544],
  ['קריית שמונה', 33.208, 35.57],
  ['מטולה', 33.279, 35.579],
  ['קצרין', 32.992, 35.691],
  ['חיספין', 32.845, 35.794],
  ['אניעם', 32.956, 35.74],
  ['מרום גולן', 33.133, 35.773],
  ['אלוני הבשן', 33.038, 35.838],
  ['מג\'דל שמס', 33.269, 35.771],
  ['מסעדה', 33.233, 35.755],
  ['בוקעאתא', 33.206, 35.778],
  ['עין קנייא', 33.232, 35.731],
  ['זכרון יעקב', 32.57, 34.952],
  ['בנימינה', 32.522, 34.95],
  ['פרדס חנה כרכור', 32.476, 34.977],
  ['חדרה', 32.434, 34.919],
  ['אור עקיבא', 32.506, 34.92],
  ['קיסריה', 32.519, 34.904],
  ['עתלית', 32.69, 34.942],
  ['פוריידיס', 32.598, 34.951],
  ['ג\'סר א זרקא', 32.538, 34.912],
  ['אום אל פחם', 32.519, 35.153],
  ['ערערה', 32.495, 35.094],
  ['כפר קרע', 32.505, 35.053],
  ['באקה אל גרביה', 32.42, 35.042],
  ['חריש', 32.462, 35.043],
  ['נתניה', 32.322, 34.855],
  ['כפר יונה', 32.317, 34.935],
  ['טייבה', 32.266, 35.009],
  ['טירה', 32.234, 34.95],
  ['קלנסווה', 32.285, 34.983],
  ['תל אביב', 32.085, 34.782],
  ['יפו', 32.054, 34.756],
  ['ירושלים', 31.769, 35.214],
  ['חיפה', 32.794, 34.989],
  ['באר שבע', 31.252, 34.791],
  ['אשדוד', 31.804, 34.655],
  ['אשקלון', 31.669, 34.571],
  ['רחובות', 31.894, 34.811],
  ['ראשון לציון', 31.964, 34.804],
  ['נס ציונה', 31.929, 34.798],
  ['יבנה', 31.878, 34.74],
  ['גדרה', 31.812, 34.778],
  ['פתח תקווה', 32.087, 34.888],
  ['בני ברק', 32.083, 34.833],
  ['רמת גן', 32.068, 34.824],
  ['גבעתיים', 32.07, 34.812],
  ['חולון', 32.016, 34.779],
  ['בת ים', 32.023, 34.75],
  ['הרצליה', 32.163, 34.844],
  ['רעננה', 32.185, 34.871],
  ['כפר סבא', 32.175, 34.907],
  ['הוד השרון', 32.15, 34.889],
  ['רמת השרון', 32.146, 34.839],
  ['ראש העין', 32.095, 34.956],
  ['אלעד', 32.052, 34.951],
  ['אור יהודה', 32.028, 34.856],
  ['רמלה', 31.929, 34.866],
  ['לוד', 31.952, 34.895],
  ['מודיעין', 31.898, 35.01],
  ['בית שמש', 31.747, 34.988],
  ['מעלה אדומים', 31.777, 35.298],
  ['אריאל', 32.106, 35.174],
  ['נתיבות', 31.423, 34.589],
  ['שדרות', 31.525, 34.596],
  ['קריית גת', 31.61, 34.764],
  ['קריית מלאכי', 31.73, 34.746],
  ['אופקים', 31.314, 34.62],
  ['דימונה', 31.069, 35.033],
  ['ערד', 31.259, 35.213],
  ['אילת', 29.558, 34.948],
  ['ירוחם', 30.988, 34.931],
  ['מצפה רמון', 30.61, 34.801],
];

const LOCALITIES: Record<string, LatLng> = {};
LOCALITY_ENTRIES.forEach((entry) => {
  LOCALITIES[normName(entry[0])] = { lat: entry[1], lng: entry[2] };
});

function aliasTo(from: string, to: string): void {
  const target = LOCALITIES[normName(to)];
  if (target) LOCALITIES[normName(from)] = target;
}

aliasTo('מגר', 'מגאר');
aliasTo('מגרר', 'מגאר');
aliasTo('ערבה', 'עראבה');
aliasTo('דיר חנה', 'דייר חנא');
aliasTo('דיר חנא', 'דייר חנא');
aliasTo('סכנין', 'סחנין');
aliasTo('נצרת עילית', 'נוף הגליל');
aliasTo('תל אביב יפו', 'תל אביב');
aliasTo('מעלות', 'מעלות תרשיחא');
aliasTo('תרשיחא', 'מעלות תרשיחא');
aliasTo('בועיינה', 'בועיינה נוג\'ידאת');
aliasTo('נוג\'ידאת', 'בועיינה נוג\'ידאת');
aliasTo('ג\'דידה', 'ג\'דיידה מכר');
aliasTo('מכר', 'ג\'דיידה מכר');
aliasTo('יוקנעם', 'יקנעם');
aliasTo('יוקנעם עילית', 'יקנעם');
aliasTo('מודיעין מכבים רעות', 'מודיעין');
aliasTo('כאוכב', 'כאוכב אבו אל היגא');
aliasTo('עוספיה', 'עוספיא');
aliasTo('דליית אל כרמל', 'דלית אל כרמל');

function hash32(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function lookupLocality(city: string): LatLng | null {
  if (!city) return null;
  return LOCALITIES[normName(city)] || null;
}

export function locateStreet(
  city: string,
  street: string,
  validStreet: number,
  lat?: number | null,
  lng?: number | null
): LatLng | null {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  const base = lookupLocality(city);
  if (!base) return null;
  const streetName = (street || '').trim();
  const sameAsCity = normName(streetName) === normName(city);
  if (!validStreet || !streetName || sameAsCity) return { lat: base.lat, lng: base.lng };
  const h = hash32(normName(city) + '|' + normName(streetName));
  const angle = ((h % 3600) / 3600) * Math.PI * 2;
  const meters = 220 + (h % 900);
  const dLat = (meters * Math.cos(angle)) / 111320;
  const dLng = (meters * Math.sin(angle)) / (111320 * Math.cos((base.lat * Math.PI) / 180));
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export function normalizeStreetHeatRow(input: unknown): BirthStreetHeatRow {
  const row = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const lat = num(pick(row, ['Lat', 'lat', 'Latitude', 'latitude']));
  const lng = num(pick(row, ['Lng', 'lng', 'Lon', 'lon', 'Longitude', 'longitude']));
  const hasCoord = lat !== 0 || lng !== 0;
  return {
    Kind: str(pick(row, ['Kind', 'kind', 'סוג'])),
    City: str(pick(row, ['City', 'city', 'Yishuv', 'יישוב'])),
    Street: str(pick(row, ['Street', 'street', 'רחוב'])),
    PostCode: str(pick(row, ['PostCode', 'postCode', 'מיקוד'])),
    PatientId: str(pick(row, ['PatientId', 'patientId', 'ת"ז', 'ת״ז'])),
    EventDate: str(pick(row, ['EventDate', 'eventDate', 'תאריך'])).slice(0, 10),
    PregnancyWeek: str(pick(row, ['PregnancyWeek', 'pregnancyWeek', 'שבוע הריון'])),
    ValidStreet: num(pick(row, ['ValidStreet', 'validStreet', 'רחוב תקין'])),
    CountByStreetKind: num(pick(row, ['CountByStreetKind', 'countByStreetKind', 'כמות לפי רחוב וסוג'])),
    StreetPotential: num(pick(row, ['StreetPotential', 'streetPotential', 'פוטנציאל לרחוב'])),
    MissPercent: num(pick(row, ['MissPercent', 'missPercent', 'אחוז פספוס ברחוב'])),
    Lat: hasCoord ? lat : null,
    Lng: hasCoord ? lng : null,
  };
}

export function aggregateStreetHeat(rows: BirthStreetHeatRow[]): StreetHeatAggregate {
  const grouped = new Map<string, StreetHeatPoint>();
  rows.forEach((row) => {
    const city = row.City || '';
    const street = row.Street || '';
    const key = normName(city) + '\n' + normName(street);
    let point = grouped.get(key);
    if (!point) {
      const coord = locateStreet(city, street, row.ValidStreet, row.Lat, row.Lng);
      point = {
        city,
        street,
        label: street || 'ללא רחוב',
        postCode: row.PostCode || '',
        lat: coord ? coord.lat : null,
        lng: coord ? coord.lng : null,
        births: 0,
        missed: 0,
        potential: 0,
        missPercent: 0,
        validStreet: row.ValidStreet,
      };
      grouped.set(key, point);
    }
    if (row.Lat != null && row.Lng != null) {
      point.lat = row.Lat;
      point.lng = row.Lng;
    }
    if (row.Kind === 'לידה') point.births = Math.max(point.births, row.CountByStreetKind);
    if (row.Kind === 'ללא לידה') point.missed = Math.max(point.missed, row.CountByStreetKind);
    point.potential = Math.max(point.potential, row.StreetPotential);
    point.missPercent = Math.max(point.missPercent, row.MissPercent);
    if (row.PostCode) point.postCode = row.PostCode;
  });

  const points = Array.from(grouped.values());
  const unmappedSet = new Set<string>();
  points.forEach((point) => {
    if (point.lat == null || point.lng == null) {
      if (point.city) unmappedSet.add(point.city);
    }
  });
  return { points, unmapped: Array.from(unmappedSet).sort((a, b) => a.localeCompare(b, 'he')) };
}

export function streetHeatWeight(point: StreetHeatPoint, mode: StreetHeatMode): number {
  if (mode === 'births') return point.births;
  if (mode === 'missed') return point.missed;
  if (mode === 'loss') return point.missPercent > 0 ? point.missPercent : 0;
  return point.potential;
}

export function rankStreetHeat(points: StreetHeatPoint[], mode: StreetHeatMode): StreetHeatRank[] {
  return points
    .map((point) => ({ ...point, weight: streetHeatWeight(point, mode) }))
    .filter((point) => point.weight > 0 && point.lat != null && point.lng != null)
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (mode === 'loss' && b.missed !== a.missed) return b.missed - a.missed;
      return a.city.localeCompare(b.city, 'he');
    });
}

export function filterStreetHeatRows(
  rows: BirthStreetHeatRow[],
  filters: { startDate: string; endDate: string; year: number | null; month: number | null; yishuv: string }
): BirthStreetHeatRow[] {
  return rows.filter((row) => {
    if (filters.yishuv && normName(row.City) !== normName(filters.yishuv)) return false;
    const date = (row.EventDate || '').slice(0, 10);
    if (!date) return true;
    if (filters.startDate && date < filters.startDate) return false;
    if (filters.endDate && date >= filters.endDate) return false;
    if (filters.year != null && !date.startsWith(String(filters.year))) return false;
    if (filters.month != null && Number(date.slice(5, 7)) !== filters.month) return false;
    return true;
  });
}

function pair(
  city: string,
  street: string,
  post: string,
  births: number,
  missed: number,
  valid: number,
  birthDate: string,
  missDate: string,
  week: string
): BirthStreetHeatRow[] {
  const potential = births + missed;
  const miss = potential ? Math.round((1000 * missed) / potential) / 10 : 0;
  const rows: BirthStreetHeatRow[] = [];
  if (births > 0) {
    rows.push({
      Kind: 'לידה',
      City: city,
      Street: street,
      PostCode: post,
      PatientId: '',
      EventDate: birthDate,
      PregnancyWeek: '',
      ValidStreet: valid,
      CountByStreetKind: births,
      StreetPotential: potential,
      MissPercent: miss,
      Lat: null,
      Lng: null,
    });
  }
  if (missed > 0) {
    rows.push({
      Kind: 'ללא לידה',
      City: city,
      Street: street,
      PostCode: post,
      PatientId: '',
      EventDate: missDate,
      PregnancyWeek: week,
      ValidStreet: valid,
      CountByStreetKind: missed,
      StreetPotential: potential,
      MissPercent: miss,
      Lat: null,
      Lng: null,
    });
  }
  return rows;
}

/** Shown only when GetBirthStreetHeatmap is unreachable. Not hospital data. */
export function buildStreetHeatmapSample(): BirthStreetHeatRow[] {
  return [
    ...pair('אביבים', 'אביבים 4', '1385000', 0, 1, 1, '2025-01-10', '2025-07-04', '38+3'),
    ...pair('אביגדור', 'אביגדור 14', '8380000', 1, 0, 1, '2025-01-10', '2025-01-10', ''),
    ...pair('אבני איתן', '', '1292500', 1, 0, 0, '2025-03-10', '2025-03-10', ''),
    ...pair('אבני איתן', 'אבני איתן', '1292500', 21, 1, 0, '2025-06-06', '2026-02-26', ''),
    ...pair('מגאר', 'רחוב הראשי', '2012800', 34, 6, 1, '2025-04-02', '2025-08-11', '36+2'),
    ...pair('מגאר', 'רחוב אלעין', '2012800', 18, 11, 1, '2025-05-19', '2025-09-01', '34+0'),
    ...pair('מגאר', 'רחוב הזיתים', '2012800', 12, 2, 1, '2025-02-14', '2025-11-03', '37+1'),
    ...pair('סחנין', 'רחוב הגליל', '3081000', 40, 9, 1, '2025-03-22', '2025-07-18', '35+4'),
    ...pair('סחנין', 'רחוב אלביאדר', '3081000', 15, 14, 1, '2025-01-28', '2025-10-09', '33+2'),
    ...pair('עראבה', 'רחוב השקד', '3081200', 22, 4, 1, '2025-06-12', '2025-12-01', '39+0'),
    ...pair('עראבה', 'רחוב אלבלד', '3081200', 9, 8, 1, '2025-04-30', '2026-01-15', '32+6'),
    ...pair('דייר חנא', 'רחוב המעיין', '2497300', 11, 7, 1, '2025-02-02', '2025-09-20', '36+5'),
    ...pair('נצרת', 'רחוב פאולוס השישי', '1600000', 28, 5, 1, '2025-05-05', '2025-08-22', '38+1'),
    ...pair('נצרת', 'רחוב אלמוטראן', '1600000', 16, 10, 1, '2025-03-03', '2025-11-11', '31+3'),
    ...pair('טבריה', 'רחוב הגליל', '1420000', 19, 3, 1, '2025-07-07', '2025-12-19', '37+4'),
    ...pair('כרמיאל', 'רחוב הגליל', '2161000', 14, 1, 1, '2025-01-21', '2025-06-30', '40+0'),
    ...pair('שפרעם', 'רחוב הראשי', '2020000', 17, 9, 1, '2025-04-16', '2025-10-28', '34+2'),
    ...pair('טמרה', 'רחוב אלקודס', '3081100', 13, 6, 1, '2025-08-08', '2026-01-04', '35+0'),
    ...pair('צפת', 'רחוב ירושלים', '1310000', 8, 2, 1, '2025-02-25', '2025-09-09', '36+0'),
    ...pair('עכו', 'רחוב בן עמי', '2410000', 10, 4, 1, '2025-05-27', '2025-11-27', '33+5'),
  ];
}

const HEAT_STOPS: Array<[number, number, number]> = [
  [20, 40, 180],
  [0, 90, 255],
  [0, 210, 170],
  [255, 214, 0],
  [255, 50, 0],
];

function heatRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const scaled = x * (HEAT_STOPS.length - 1);
  const i = Math.min(HEAT_STOPS.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = HEAT_STOPS[i];
  const b = HEAT_STOPS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Canvas heatmap on an existing google.maps.Map. Does not load the visualization library. */
export class StreetHeatmapOverlay {
  private overlay: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private points: StreetHeatRank[] = [];

  attach(map: any): void {
    const maps = (window as any).google && (window as any).google.maps;
    if (!maps || !map) return;
    if (this.overlay) {
      this.overlay.setMap(map);
      this.draw();
      return;
    }
    const overlay = new maps.OverlayView();
    const self = this;
    overlay.onAdd = function () {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      self.canvas = canvas;
      const panes = overlay.getPanes();
      if (panes && panes.overlayLayer) panes.overlayLayer.appendChild(canvas);
    };
    overlay.draw = function () {
      self.draw();
    };
    overlay.onRemove = function () {
      if (self.canvas && self.canvas.parentNode) self.canvas.parentNode.removeChild(self.canvas);
      self.canvas = null;
    };
    this.overlay = overlay;
    overlay.setMap(map);
  }

  setPoints(points: StreetHeatRank[]): void {
    this.points = points || [];
    this.draw();
  }

  detach(): void {
    if (this.overlay) {
      this.overlay.setMap(null);
      this.overlay = null;
    }
    this.canvas = null;
  }

  draw(): void {
    if (!this.overlay || !this.canvas) return;
    const projection = this.overlay.getProjection();
    const map = this.overlay.getMap();
    if (!projection || !map || !map.getBounds) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
    const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
    if (!sw || !ne) return;
    const left = Math.min(sw.x, ne.x);
    const top = Math.min(sw.y, ne.y);
    const width = Math.max(1, Math.abs(ne.x - sw.x));
    const height = Math.max(1, Math.abs(sw.y - ne.y));
    const canvas = this.canvas;
    canvas.style.left = left + 'px';
    canvas.style.top = top + 'px';
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!this.points.length) return;

    let max = 0;
    this.points.forEach((point) => {
      if (point.weight > max) max = point.weight;
    });
    if (max <= 0) return;

    const zoom = map.getZoom ? map.getZoom() || 10 : 10;
    const radius = Math.max(16, Math.min(72, 14 * Math.pow(1.35, zoom - 9)));
    const maps = (window as any).google.maps;
    ctx.globalCompositeOperation = 'lighter';
    this.points.forEach((point) => {
      if (point.lat == null || point.lng == null) return;
      const px = projection.fromLatLngToDivPixel(new maps.LatLng(point.lat, point.lng));
      if (!px) return;
      const x = px.x - left;
      const y = px.y - top;
      const alpha = 0.25 + 0.75 * (point.weight / max);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    const image = ctx.getImageData(0, 0, width, height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const intensity = pixels[i] / 255;
      if (intensity <= 0.02) {
        pixels[i + 3] = 0;
        continue;
      }
      const curve = Math.pow(intensity, 0.72);
      const rgb = heatRgb(curve);
      pixels[i] = rgb[0];
      pixels[i + 1] = rgb[1];
      pixels[i + 2] = rgb[2];
      pixels[i + 3] = Math.min(210, Math.round(40 + curve * 190));
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.putImageData(image, 0, 0);
  }
}

export function runStreetHeatmapSelfCheck(): string[] {
  const errors: string[] = [];
  const expect = (cond: boolean, message: string) => {
    if (!cond) errors.push(message);
  };

  const avivim = lookupLocality('אביבים');
  const avigdor = lookupLocality('אביגדור');
  const eitan = lookupLocality('אבני איתן');
  expect(!!avivim && avivim.lat > 33, 'אביבים missing');
  expect(!!avigdor && avigdor.lat < 32, 'אביגדור missing');
  expect(!!eitan && eitan.lng > 35.7, 'אבני איתן missing');
  expect(!!lookupLocality('סכנין') && !!lookupLocality("סח'נין"), 'סחנין alias');
  const sakhninA = lookupLocality('סכנין');
  const sakhninB = lookupLocality('סחנין');
  expect(!!sakhninA && !!sakhninB && sakhninA.lat === sakhninB.lat, 'סכנין coords');
  expect(lookupLocality('מגרר') != null && lookupLocality('דיר חנה') != null, 'city aliases');

  const center = locateStreet('אבני איתן', 'אבני איתן', 0, null, null);
  expect(!!center && !!eitan && center.lat === eitan.lat && center.lng === eitan.lng, 'invalid street stays on center');
  const offset = locateStreet('אביבים', 'אביבים 4', 1, null, null);
  expect(!!offset && !!avivim && (offset.lat !== avivim.lat || offset.lng !== avivim.lng), 'valid street is offset');
  const pinned = locateStreet('אביבים', 'אביבים 4', 1, 32.1, 35.2);
  expect(!!pinned && pinned.lat === 32.1 && pinned.lng === 35.2, 'server lat/lng wins');

  const hebrew = normalizeStreetHeatRow({
    'סוג': 'ללא לידה',
    'יישוב': 'אביבים',
    'רחוב': 'אביבים 4',
    'מיקוד': '1385000',
    'ת"ז': '',
    'תאריך': '2025-07-04',
    'שבוע הריון': '38+3',
    'רחוב תקין': 1,
    'כמות לפי רחוב וסוג': 1,
    'פוטנציאל לרחוב': 1,
    'אחוז פספוס ברחוב': 100,
  });
  expect(hebrew.Kind === 'ללא לידה' && hebrew.MissPercent === 100 && hebrew.City === 'אביבים', 'hebrew columns');

  const doubled: BirthStreetHeatRow[] = [
    ...buildStreetHeatmapSample().filter((row) => row.City === 'אבני איתן' && row.Street === 'אבני איתן'),
    ...buildStreetHeatmapSample().filter((row) => row.City === 'אבני איתן' && row.Street === 'אבני איתן'),
  ];
  const agg = aggregateStreetHeat(doubled);
  const eitanStreet = agg.points.find((point) => point.city === 'אבני איתן' && point.street === 'אבני איתן');
  expect(!!eitanStreet && eitanStreet.births === 21 && eitanStreet.missed === 1, 'window count is not summed twice');
  expect(streetHeatWeight(eitanStreet as StreetHeatPoint, 'loss') === 4.5, 'loss weight is miss percent');

  const sample = aggregateStreetHeat(buildStreetHeatmapSample());
  expect(sample.unmapped.length === 0, 'sample cities are mapped: ' + sample.unmapped.join(','));
  const unknown = aggregateStreetHeat([
    {
      Kind: 'לידה',
      City: 'כפר לא קיים',
      Street: 'רחוב 1',
      PostCode: '',
      PatientId: '',
      EventDate: '2025-01-01',
      PregnancyWeek: '',
      ValidStreet: 1,
      CountByStreetKind: 3,
      StreetPotential: 3,
      MissPercent: 0,
      Lat: null,
      Lng: null,
    },
  ]);
  expect(unknown.unmapped.length === 1, 'unknown city listed');

  const ranked = rankStreetHeat(sample.points, 'missed');
  expect(ranked.length > 0 && ranked[0].missed >= ranked[ranked.length - 1].missed, 'missed ranking');
  const births = rankStreetHeat(sample.points, 'births');
  expect(births.some((point) => point.city === 'סחנין'), 'births include סחנין');
  const loss = rankStreetHeat(sample.points, 'loss');
  expect(loss[0].missPercent === 100 && loss[0].city === 'אביבים', 'highest miss percent first');

  const filtered = filterStreetHeatRows(buildStreetHeatmapSample(), {
    startDate: '2025-01-01',
    endDate: '2027-01-01',
    year: null,
    month: null,
    yishuv: 'מגאר',
  });
  expect(filtered.every((row) => row.City === 'מגאר') && filtered.length > 0, 'yishuv filter');

  return errors;
}
