import {
  MONTH_LABELS_HE,
  RehabDashboardViewModel,
  RehabPeriodMode,
  RehabTableRow,
} from '../models/rehabilitation-dashboard.models';
import { buildRehabStackedColumnChartOptions, getDashboardYearMonthCount } from '../utils/rehabilitation-chart.utils';
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

function aggregateByPayer(rows: RehabilitationAdmissionsByPayerDto[]): PayerAggregate[] {
  const map = new Map<string, PayerAggregate>();
  rows.forEach((row) => {
    const payerName = normalizePayerName(row.payerName);
    const existing = map.get(payerName);
    if (existing) {
      existing.count += row.admissionsCount;
    } else {
      map.set(payerName, {
        payerName,
        payerCategory: row.payerCategory,
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
): RehabStatusBlock {
  const filtered = filterByDepartments(rows, selectedDepartments);
  const payers = aggregateByPayer(filtered);
  const total = payers.reduce((sum, row) => sum + row.count, 0);
  const kupotCount = sumByCategory(payers, PAYER_CATEGORY_KUPOT);
  const defenceCount = sumByCategory(payers, PAYER_CATEGORY_DEFENCE);
  const otherCount = sumByCategory(payers, PAYER_CATEGORY_OTHER);
  const quantityLabel = isDaily ? 'קבלות היום' : 'קבלות (30 ימים)';

  const share = (count: number): number => (total > 0 ? (count / total) * 100 : 0);

  const unassignedCount = payers
    .filter((payer) => isUnassignedPayerName(payer.payerName))
    .reduce((sum, payer) => sum + payer.count, 0);
  const chartPayers = payers.filter((payer) => !isUnassignedPayerName(payer.payerName));
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

  return {
    code: '1.4',
    title: 'קבלות – לפי קופות / צה״ל + משרד הביטחון / אחר',
    icon: 'account_balance',
    help: 'פילוח קבלות חדשות לפי גורם משלם (מקור: Chameleon). ריק מסווג כ״אחר״.',
    kpis: [
      { label: isDaily ? 'קבלות היום' : 'קבלות (30 ימים)', value: formatNumber(total), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(share(kupotCount)), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(share(defenceCount)), accent: 'warn' },
    ],
    indicators,
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: isDaily ? 'קבלות היום' : '30 ימים', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
    chartType: 'PieChart',
    chartColumns: ['גורם משלם', 'קבלות'],
    chartRows: chartPayers.map((payer) => [payer.payerName, payer.count]),
    chartNote: unassignedCount > 0
      ? `${REHAB_UNASSIGNED_PAYER_LABEL}: ${formatPct(unassignedSharePct)}`
      : undefined,
  };
}

function sumAdmissionsByCategory(
  rows: RehabilitationAdmissionsByPayerDto[],
  category: string,
): number {
  return rows
    .filter((row) => row.payerCategory === category)
    .reduce((sum, row) => sum + row.admissionsCount, 0);
}

function formatAdmissionAnnotation(total: number): string {
  return total > 0 ? `${formatNumber(total)} קבלות` : '0 קבלות';
}

function buildMonthlyAdmissionChartRows(
  rows: RehabilitationAdmissionsByPayerDto[],
  year: number,
): (string | number)[][] {
  const lastMonth = getDashboardYearMonthCount(year);
  return MONTH_LABELS_HE.slice(1, lastMonth + 1).map((label, index) => {
    const monthNumber = index + 1;
    const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === monthNumber);
    const kupot = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_KUPOT);
    const defence = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_DEFENCE);
    const other = sumAdmissionsByCategory(monthRows, PAYER_CATEGORY_OTHER);
    const total = kupot + defence + other;
    return [
      label,
      kupot,
      defence,
      other,
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
  const monthCount = isMonthly ? getDashboardYearMonthCount(year) : 0;
  const chartColumns: (string | Record<string, unknown>)[] = isMonthly
    ? [
      'חודש',
      'קופות חולים',
      'צה״ל + מב״ט',
      'אחר',
      { type: 'string', role: 'annotation' },
    ]
    : ['גורם משלם', 'קבלות'];
  const chartPayers = payers.filter((payer) => !isUnassignedPayerName(payer.payerName));
  const chartRows: (string | number)[][] = isMonthly
    ? buildMonthlyAdmissionChartRows(filtered, year)
    : chartPayers.map((payer) => [payer.payerName, payer.count]);

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
      : { legend: { position: 'right' }, backgroundColor: 'transparent' },
    kpis: [
      { label: isMonthly ? 'סה״כ קבלות בשנה' : 'סה״כ קבלות', value: formatNumber(total), accent: 'primary' },
      { label: 'קופות חולים', value: formatPct(share(kupotCount)), accent: 'success' },
      { label: 'צה״ל + משרד הביטחון', value: formatPct(share(defenceCount)), accent: 'warn' },
    ],
    tableColumns: [
      { key: 'payer', label: 'גורם משלם' },
      { key: 'admissions', label: isMonthly ? 'סה״כ בשנה' : 'קבלות', align: 'center' },
      { key: 'share', label: 'נתח', align: 'center' },
    ],
    tableRows,
  };
}
