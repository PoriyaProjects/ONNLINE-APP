import {
  RehabDashboardViewModel,
  RehabPeriodMode,
  RehabTableRow,
} from '../models/rehabilitation-dashboard.models';
import { buildRehabStackedColumnChartOptions, rehabMonthKeysInRange, rehabMonthShortLabel, buildRehabChartTooltipHtml, REHAB_HTML_TOOLTIP_COL } from '../utils/rehabilitation-chart.utils';
import {
  isUnassignedPayerName,
  normalizePayerName,
  REHAB_UNASSIGNED_PAYER_LABEL,
  RehabilitationAdmissionsByPayerDto,
} from '../models/rehabilitation-admissions-payer.models';
import {
  RehabStatusBlock,
  RehabStatusIndicator,
} from '../models/rehabilitation-status.models';
import { getStatusDailyWeekdayLabel } from './rehabilitation-occupancy.mapper';

const PAYER_CATEGORY_KUPOT = 'קופת חולים';
const PAYER_CATEGORY_DEFENCE = 'צה״ל + משרד הביטחון';
const PAYER_CATEGORY_OTHER = 'אחר';

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(n: number): string {
  return `${formatNumber(n, 1)}%`;
}

function toneFromDelta(delta: number): RehabStatusIndicator['tone'] {
  if (delta >= 4) return 'excellent';
  if (delta >= 0) return 'good';
  if (delta >= -4) return 'warn';
  return 'danger';
}

function makeIndicator(
  id: string,
  label: string,
  valuePct: number,
  displayValue: string,
  quantity: number,
  quantityMax: number,
  quantityLabel: string,
): RehabStatusIndicator {
  const avgPct = valuePct;
  return {
    id,
    label,
    valuePct: Math.min(100, Math.max(0, valuePct)),
    displayValue,
    averageDisplay: formatPct(avgPct),
    deltaVsAvg: 0,
    quantity,
    quantityMax: Math.max(quantity, quantityMax, 1),
    averageQuantity: quantity,
    quantityLabel,
    tone: toneFromDelta(0),
  };
}

function filterByDepartments(
  rows: RehabilitationAdmissionsByPayerDto[],
  selectedDepartments: string[],
): RehabilitationAdmissionsByPayerDto[] {
  if (!selectedDepartments.length) {
    return rows;
  }
  const selected = new Set(selectedDepartments);
  return rows.filter((row) => selected.has(row.departmentName));
}

interface PayerAggregate {
  payerName: string;
  payerCategory: string;
  count: number;
}

export interface RehabAdmissionsPeriodContext {
  fromDate: string;
  toDate: string;
  byMonth: boolean;
}

function resolvePayerCategory(row: RehabilitationAdmissionsByPayerDto): string {
  const category = String(row.payerCategory || '').trim();
  if (category === PAYER_CATEGORY_KUPOT || category === PAYER_CATEGORY_DEFENCE || category === PAYER_CATEGORY_OTHER) {
    return category;
  }
  const name = normalizePayerName(row.payerName);
  if (name === 'כללית' || name === 'מכבי' || name === 'לאומית' || name === 'מאוחדת') {
    return PAYER_CATEGORY_KUPOT;
  }
  if (name.includes('צה') || name.includes('מב״ט') || name.includes('ביטחון')) {
    return PAYER_CATEGORY_DEFENCE;
  }
  return PAYER_CATEGORY_OTHER;
}

function displayPayerName(row: RehabilitationAdmissionsByPayerDto): string {
  const category = resolvePayerCategory(row);
  if (category === PAYER_CATEGORY_DEFENCE) {
    return PAYER_CATEGORY_DEFENCE;
  }
  return normalizePayerName(row.payerName);
}

function isChartExcludedPayer(payer: PayerAggregate): boolean {
  return payer.payerCategory !== PAYER_CATEGORY_KUPOT
    && payer.payerCategory !== PAYER_CATEGORY_DEFENCE
    && isUnassignedPayerName(payer.payerName);
}

function admissionsPeriodLabel(isDaily: boolean, ctx?: RehabAdmissionsPeriodContext | null): string {
  if (isDaily) {
    return getStatusDailyWeekdayLabel();
  }
  if (ctx?.byMonth && ctx.fromDate && ctx.toDate) {
    const keys = rehabMonthKeysInRange(ctx.fromDate, ctx.toDate);
    if (keys.length === 1) {
      return rehabMonthShortLabel(keys[0]);
    }
    return `${keys.length} חודשים`;
  }
  return '30 ימים';
}

function aggregateByPayer(rows: RehabilitationAdmissionsByPayerDto[]): PayerAggregate[] {
  const map = new Map<string, PayerAggregate>();
  rows.forEach((row) => {
    const payerCategory = resolvePayerCategory(row);
    const payerName = displayPayerName(row);
    const existing = map.get(payerName);
    if (existing) {
      existing.count += row.admissionsCount;
    } else {
      map.set(payerName, {
        payerName,
        payerCategory,
        count: row.admissionsCount,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function sumByCategory(rows: PayerAggregate[], category: string): number {
  return rows
    .filter((row) => row.payerCategory === category)
    .reduce((sum, row) => sum + row.count, 0);
}

export function mapAdmissionsPayerRowsToStatusBlock(
  rows: RehabilitationAdmissionsByPayerDto[],
  isDaily: boolean,
  selectedDepartments: string[],
  period?: RehabAdmissionsPeriodContext | null,
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const payers = aggregateByPayer(filtered);
  const total = payers.reduce((sum, row) => sum + row.count, 0);
  const kupotCount = sumByCategory(payers, PAYER_CATEGORY_KUPOT);
  const defenceCount = sumByCategory(payers, PAYER_CATEGORY_DEFENCE);
  const otherCount = sumByCategory(payers, PAYER_CATEGORY_OTHER);
  const periodLabel = admissionsPeriodLabel(isDaily, period);
  const quantityLabel = `קבלות (${periodLabel})`;

  const share = (count: number): number => (total > 0 ? (count / total) * 100 : 0);

  const unassignedCount = payers
    .filter((payer) => isChartExcludedPayer(payer))
    .reduce((sum, payer) => sum + payer.count, 0);
  const chartPayers = payers.filter((payer) => !isChartExcludedPayer(payer));
  const unassignedSharePct = share(unassignedCount);

  const tableRows: RehabTableRow[] = payers.map((payer) => ({
    id: `payer-${payer.payerName}`,
    cells: {
      payer: payer.payerName,
      admissions: formatNumber(payer.count),
      share: formatPct(share(payer.count)),
    },
  }));

  const indicators: RehabStatusIndicator[] = [
    makeIndicator(
      'payer-kupot',
      'קופות חולים',
      share(kupotCount),
      formatPct(share(kupotCount)),
      kupotCount,
      total,
      quantityLabel,
    ),
    makeIndicator(
      'payer-defence',
      'צה״ל + מב״ט',
      share(defenceCount),
      formatPct(share(defenceCount)),
      defenceCount,
      total,
      quantityLabel,
    ),
    makeIndicator(
      'payer-other',
      'אחר',
      share(otherCount),
      formatPct(share(otherCount)),
      otherCount,
      total,
      quantityLabel,
    ),
  ];

  const byMonth = !!period?.byMonth && !!period.fromDate && !!period.toDate;
  const monthlyRows = byMonth
    ? buildMonthlyAdmissionChartRows(filtered, period.fromDate, period.toDate)
    : [];

  return {
    code: '1.4',
    title: 'קבלות – לפי קופות / צה״ל + משרד הביטחון / אחר',
    icon: 'account_balance',
    help: 'פילוח קבלות חדשות לפי גורם משלם (מקור: Chameleon). ריק מסווג כ״אחר״.',
    kpis: [
      { label: quantityLabel, value: formatNumber(total), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(share(kupotCount)), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(share(defenceCount)), accent: 'warn' },
    ],
    indicators,
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: periodLabel, align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: byMonth ? 'ColumnChart' : 'PieChart',
    chartColumns: byMonth
      ? [
        'חודש',
        'קופות חולים',
        REHAB_HTML_TOOLTIP_COL,
        'צה״ל + מב״ט',
        REHAB_HTML_TOOLTIP_COL,
        'אחר',
        REHAB_HTML_TOOLTIP_COL,
        { type: 'string', role: 'annotation' },
      ]
      : ['גורם משלם', 'קבלות', REHAB_HTML_TOOLTIP_COL],
    chartRows: byMonth
      ? monthlyRows
      : chartPayers.map((payer) => [
        payer.payerName,
        payer.count,
        buildRehabChartTooltipHtml(
          periodLabel,
          payer.payerName,
          `${formatNumber(payer.count)} קבלות`,
          `קבלות חדשות מ${payer.payerName}. גודל הפרוסה = נתח מכלל הקבלות בתקופה.`,
          `${formatPct(share(payer.count))} מכלל הקבלות (${formatNumber(total)})`,
        ),
      ]),
    chartNote: byMonth
      ? 'כל עמודה = קבלות חדשות בחודש. כחול = קופות, כתום = צה״ל+מב״ט, אפור = אחר.'
      : (unassignedCount > 0
        ? `${REHAB_UNASSIGNED_PAYER_LABEL}: ${formatPct(unassignedSharePct)}`
        : undefined),
  };
}

function sumAdmissionsByCategory(
  rows: RehabilitationAdmissionsByPayerDto[],
  category: string,
): number {
  return rows
    .filter((row) => resolvePayerCategory(row) === category)
    .reduce((sum, row) => sum + row.admissionsCount, 0);
}

function payerCategoryMeaning(category: string): string {
  if (category === PAYER_CATEGORY_KUPOT || category === 'קופות חולים') {
    return 'קבלות חדשות מקופות החולים. ציר X = חודש/גורם משלם, ציר Y = מספר קבלות.';
  }
  if (category === PAYER_CATEGORY_DEFENCE || category === 'צה״ל + מב״ט') {
    return 'קבלות חדשות מצה״ל ומשרד הביטחון. ציר X = חודש/גורם משלם, ציר Y = מספר קבלות.';
  }
  return 'קבלות חדשות מגורמים אחרים (כולל ללא סיווג). ציר X = חודש/גורם משלם, ציר Y = מספר קבלות.';
}

function formatAdmissionAnnotation(total: number): string {
  return total > 0 ? `${formatNumber(total)} קבלות` : '0 קבלות';
}

function buildMonthlyAdmissionChartRows(
  rows: RehabilitationAdmissionsByPayerDto[],
  fromDate: string,
  toDate: string,
): (string | number)[][] {
  return rehabMonthKeysInRange(fromDate, toDate).map((key) => {
    const monthRows = rows.filter((row) => row.date.slice(0, 7) === key);
    const kupot = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_KUPOT);
    const defence = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_DEFENCE);
    const other = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_OTHER);
    const total = kupot + defence + other;
    const monthLabel = rehabMonthShortLabel(key);
    const shareLine = (count: number) =>
      `${formatPct(total > 0 ? (count / total) * 100 : 0)} מתוך ${formatNumber(total)} קבלות בחודש`;
    return [
      monthLabel,
      kupot,
      buildRehabChartTooltipHtml(
        monthLabel,
        'קופות חולים',
        `${formatNumber(kupot)} קבלות`,
        payerCategoryMeaning(PAYER_CATEGORY_KUPOT),
        shareLine(kupot),
      ),
      defence,
      buildRehabChartTooltipHtml(
        monthLabel,
        'צה״ל + משרד הביטחון',
        `${formatNumber(defence)} קבלות`,
        payerCategoryMeaning(PAYER_CATEGORY_DEFENCE),
        shareLine(defence),
      ),
      other,
      buildRehabChartTooltipHtml(
        monthLabel,
        'אחר',
        `${formatNumber(other)} קבלות`,
        payerCategoryMeaning(PAYER_CATEGORY_OTHER),
        shareLine(other),
      ),
      formatAdmissionAnnotation(total),
    ];
  });
}

export function mapAdmissionsPayerRowsToDashboardViewModel(
  rows: RehabilitationAdmissionsByPayerDto[],
  year: number,
  period: RehabPeriodMode,
  selectedDepartments: string[],
  periodCaption: string,
  monthRange?: { fromDate: string; toDate: string } | null,
): RehabDashboardViewModel {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const payers = aggregateByPayer(filtered);
  const total = payers.reduce((sum, row) => sum + row.count, 0);
  const kupotCount = sumByCategory(payers, PAYER_CATEGORY_KUPOT);
  const defenceCount = sumByCategory(payers, PAYER_CATEGORY_DEFENCE);
  const otherCount = sumByCategory(payers, PAYER_CATEGORY_OTHER);
  const share = (count: number): number => (total > 0 ? (count / total) * 100 : 0);

  const tableRows: RehabTableRow[] = payers.map((payer) => ({
    id: `payer-${payer.payerName}`,
    cells: {
      payer: payer.payerName,
      admissions: formatNumber(payer.count),
      share: formatPct(share(payer.count)),
    },
  }));

  const isMonthly = period === 'monthly';
  const range = monthRange?.fromDate && monthRange?.toDate
    ? monthRange
    : { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
  const monthlyRows = isMonthly ? buildMonthlyAdmissionChartRows(filtered, range.fromDate, range.toDate) : [];
  const monthCount = monthlyRows.length;
  const chartPayers = payers.filter((payer) => !isChartExcludedPayer(payer));
  const chartColumns: (string | Record<string, unknown>)[] = isMonthly
    ? [
      'חודש',
      'קופות חולים',
      REHAB_HTML_TOOLTIP_COL,
      'צה״ל + מב״ט',
      REHAB_HTML_TOOLTIP_COL,
      'אחר',
      REHAB_HTML_TOOLTIP_COL,
      { type: 'string', role: 'annotation' },
    ]
    : ['גורם משלם', 'קבלות', REHAB_HTML_TOOLTIP_COL];
  const chartRows: (string | number)[][] = isMonthly
    ? monthlyRows
    : chartPayers.map((payer) => [
      payer.payerName,
      payer.count,
      buildRehabChartTooltipHtml(
        periodCaption,
        payer.payerName,
        `${formatNumber(payer.count)} קבלות`,
        `קבלות חדשות מ${payer.payerName}. גודל הפרוסה = נתח מכלל הקבלות בתקופה.`,
        `${formatPct(share(payer.count))} מכלל הקבלות (${formatNumber(total)})`,
      ),
    ]);

  return {
    chartHeading: 'קבלות חדשות לפי חודש — קופות / צה״ל / אחר',
    periodCaption: `${periodCaption} · נתונים ממערכת`,
    chartType: isMonthly ? 'ColumnChart' : 'PieChart',
    chartColumns,
    chartRows,
    chartNote: isMonthly
      ? 'כל עמודה = קבלות חדשות בחודש. הצבעים: כחול = קופות חולים, כתום = צה״ל+מב״ט, אפור = אחר. המספר מעל העמודה = סה״כ.'
      : 'עוגה = חלוקה לפי גורם משלם בתקופה שנבחרה.',
    chartOptions: isMonthly
      ? buildRehabStackedColumnChartOptions({
        hTitle: 'חודש',
        vTitle: 'סה״כ קבלות בחודש',
        vMin: 0,
        vFormat: '0',
      }, monthCount)
      : { legend: { position: 'right' }, backgroundColor: 'transparent', tooltip: { isHtml: true, trigger: 'both' } },
    kpis: [
      { label: isMonthly ? 'סה״כ קבלות בטווח' : 'סה״כ קבלות', value: formatNumber(total), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(share(kupotCount)), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(share(defenceCount)), accent: 'warn' },
    ],
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: isMonthly ? 'סה״כ בטווח' : 'קבלות', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
  };
}
