/**
 * HTML tooltips for Google Charts — aligned with surgeries-dashborad patchGoogleChartHtmlTooltips.
 */

export type IncomeChartTooltipHost = {
    isDark: boolean;
    graphPrimaryView: "income" | "payer";
    formatNumber(n: number): string;
};

export type IncomeChartTooltipPatchCtx = {
    isPctChart?: boolean;
    multiYearValueSuffix?: string;
    multiYearShowTotal?: boolean;
    wingTooltipSubtitle?: string;
    wingTotalCaption?: string;
};

function escapeHtml(text: string): string {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getCategoryHeader(columns: any[]): string | null {
    const c0 = columns[0];
    if (typeof c0 === "string") {
        return c0;
    }
    if (c0 && typeof c0 === "object" && c0.label != null) {
        return String(c0.label);
    }
    return null;
}

function tooltipNumericMagnitude(v: any): number | null {
    if (v == null || v === "") {
        return null;
    }
    if (typeof v === "object" && v !== null && "v" in v) {
        const n = Number((v as any).v);
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function formatIncomeTooltipValue(
    host: IncomeChartTooltipHost,
    v: any,
): string {
    const n = tooltipNumericMagnitude(v);
    if (n == null) {
        return "—";
    }
    if (n === 0) {
        return "0 ₪";
    }
    return `${n.toFixed(1)}M ₪`;
}

function isWingStyleMultiYear(
    columns: any[],
    numericSeries: { colIndex: number; label: string }[],
): boolean {
    const h = getCategoryHeader(columns);
    if (!h || h === "שנה") {
        return false;
    }
    return (
        numericSeries.length > 0 &&
        numericSeries.every((s) => /^\d{4}$/.test(String(s.label).trim()))
    );
}

function buildMultiYearCategoryTooltipHtml(
    host: IncomeChartTooltipHost,
    category: string,
    dataRow: any[],
    numericSeries: { colIndex: number; label: string }[],
    valueSuffixPlain: string,
    showTotalRow: boolean,
    copy?: { subtitle?: string; totalCaption?: string },
): string {
    const currentYear = new Date().getFullYear();
    const muted = host.isDark ? "#94a3b8" : "#64748b";
    const border = host.isDark ? "#475569" : "#e2e8f0";
    const lineColor = host.isDark ? "#e5e7eb" : "#0f172a";
    const suffixEsc = valueSuffixPlain.trim()
        ? ` ${escapeHtml(valueSuffixPlain.trim())}`
        : "";
    const subtitle =
        copy?.subtitle != null && String(copy.subtitle).trim() !== ""
            ? escapeHtml(String(copy.subtitle).trim())
            : "סדר: מהחדשה (למעלה) לישנה (למטה)";
    const totalCaption =
        copy?.totalCaption != null && String(copy.totalCaption).trim() !== ""
            ? escapeHtml(String(copy.totalCaption).trim())
            : "סה״כ הכנסות בכל השנים בשורה זו";

    const entries = numericSeries
        .map((s) => ({
            year: parseInt(String(s.label).trim(), 10),
            value: dataRow[s.colIndex],
        }))
        .filter((e) => !isNaN(e.year));
    entries.sort((a, b) => b.year - a.year);

    let rowSum = 0;
    for (const e of entries) {
        const mag = tooltipNumericMagnitude(e.value);
        if (mag != null) {
            rowSum += mag;
        }
    }

    const title = escapeHtml(category);
    const yearBlocks = entries
        .map((e) => {
            const isCurrent = e.year === currentYear;
            const badge = isCurrent
                ? `<span style="font-size:11px;font-weight:600;color:${muted}"> (שנת נוכחית)</span>`
                : "";
            return `<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:baseline;gap:14px;font-size:13px;color:${lineColor}">
                    <span>שנה <b>${e.year}</b>${badge}</span>
                    <span style="white-space:nowrap"><b>${formatIncomeTooltipValue(host, e.value)}</b>${suffixEsc}</span>
                </div>`;
        })
        .join("");

    const wrap = [
        "direction:rtl",
        "text-align:right",
        "padding:10px 12px",
        "min-width:200px",
        "max-width:320px",
        `color:${lineColor}`,
    ].join(";");

    const totalBlock =
        showTotalRow && entries.length > 0
            ? `<div style="font-size:12px;margin-bottom:8px">
                ${totalCaption}: <b>${formatIncomeTooltipValue(host, rowSum)}</b>${suffixEsc}
            </div>`
            : "";

    return `<div style="${wrap}">
            <div style="font-size:15px;font-weight:800;margin-bottom:2px">${title}</div>
            <div style="font-size:11px;color:${muted};padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${border}">
                ${subtitle}
            </div>
            ${totalBlock}
            ${yearBlocks}
        </div>`;
}

export function patchIncomeGoogleChartHtmlTooltips(
    host: IncomeChartTooltipHost,
    columnsIn: any[] | null | undefined,
    dataIn: any[] | null | undefined,
    chartOptionsIn: any,
    ctx: IncomeChartTooltipPatchCtx = {},
): { columns: any[]; data: any[]; options: any } {
    const baseOpts =
        chartOptionsIn && typeof chartOptionsIn === "object"
            ? chartOptionsIn
            : {};
    if (baseOpts.tooltip === "none" || baseOpts.tooltip?.trigger === "none") {
        return {
            columns: Array.isArray(columnsIn)
                ? [...columnsIn]
                : columnsIn || [],
            data: Array.isArray(dataIn)
                ? dataIn.map((r) => (Array.isArray(r) ? [...r] : r))
                : dataIn || [],
            options: { ...baseOpts },
        };
    }
    if (!columnsIn?.length || !dataIn?.length) {
        return {
            columns: columnsIn || [],
            data: dataIn || [],
            options: { ...baseOpts },
        };
    }

    const columns = [...columnsIn];
    const rows = Array.isArray(dataIn) ? [...dataIn] : [];
    const tooltipCol = {
        type: "string",
        role: "tooltip",
        p: { html: true },
    };

    const numericSeries: { colIndex: number; label: string }[] = [];
    for (let i = 1; i < columns.length; i++) {
        const c = columns[i] as any;
        const isNumberCol =
            (typeof c === "object" && c?.type === "number") || c === "number";
        const isRole = typeof c === "object" && !!c?.role;
        if (isNumberCol && !isRole) {
            numericSeries.push({
                colIndex: i,
                label:
                    typeof c === "object" && c?.label
                        ? String(c.label)
                        : `Series ${i}`,
            });
        }
    }
    if (numericSeries.length === 0) {
        return {
            columns: columnsIn,
            data: dataIn || [],
            options: { ...baseOpts },
        };
    }

    const useWingMultiYear = isWingStyleMultiYear(columns, numericSeries);
    const tooltipInsertions: { insertPos: number; valueColIdx: number }[] = [];
    for (const s of numericSeries) {
        const idx = s.colIndex;
        let insertPos = idx + 1;
        if (
            insertPos < columns.length &&
            typeof columns[insertPos] === "object" &&
            (columns[insertPos] as any).role === "annotation"
        ) {
            insertPos++;
        }
        const next = columns[insertPos] as any;
        if (!(typeof next === "object" && next?.role === "tooltip")) {
            tooltipInsertions.push({ insertPos, valueColIdx: idx });
        }
    }
    if (tooltipInsertions.length === 0) {
        return {
            columns: columnsIn,
            data: dataIn || [],
            options: { ...baseOpts },
        };
    }

    const labelByColIndex = new Map<number, string>();
    for (const s of numericSeries) {
        labelByColIndex.set(s.colIndex, s.label);
    }

    tooltipInsertions
        .sort((a, b) => b.insertPos - a.insertPos)
        .forEach(({ insertPos }) => columns.splice(insertPos, 0, tooltipCol));

    const style = [
        "direction:rtl",
        "text-align:right",
        "padding:8px 10px",
        "font-weight:700",
        "font-size:13px",
    ].join(";");
    const subStyle = [
        "margin-top:4px",
        "font-weight:800",
        "font-size:12px",
        `color:${host.isDark ? "#e5e7eb" : "#0f172a"}`,
    ].join(";");

    const suffixPlain =
        ctx.multiYearValueSuffix !== undefined &&
        ctx.multiYearValueSuffix !== null
            ? String(ctx.multiYearValueSuffix).trim()
            : "";
    const showTotal = ctx.multiYearShowTotal !== false;
    const wingCopy = {
        subtitle: ctx.wingTooltipSubtitle,
        totalCaption: ctx.wingTotalCaption,
    };

    const dataOut = rows.map((r: any[]) => {
        if (!Array.isArray(r)) {
            return r;
        }
        const nextRow = [...r];
        const category = String(nextRow[0] ?? "");
        const combinedHtml = useWingMultiYear
            ? buildMultiYearCategoryTooltipHtml(
                  host,
                  category,
                  nextRow,
                  numericSeries,
                  suffixPlain,
                  showTotal,
                  wingCopy,
              )
            : null;

        tooltipInsertions
            .sort((a, b) => b.insertPos - a.insertPos)
            .forEach(({ insertPos, valueColIdx }) => {
                const seriesLabel = labelByColIndex.get(valueColIdx) ?? "ערך";
                const value = nextRow[valueColIdx];
                const html =
                    combinedHtml ??
                    `<div style="${style}"><div><b>${escapeHtml(category)}</b></div><div style="${subStyle}">${escapeHtml(seriesLabel)}: ${formatIncomeTooltipValue(host, value)}</div></div>`;
                nextRow.splice(insertPos, 0, html);
            });
        return nextRow;
    });

    return {
        columns,
        data: dataOut,
        options: {
            ...baseOpts,
            focusTarget: "datum",
            tooltip: {
                ...(baseOpts.tooltip || {}),
                isHtml: true,
                trigger: "focus",
                showColorCode: !useWingMultiYear,
            },
        },
    };
}

export function getIncomeChartTooltipContext(
    host: IncomeChartTooltipHost,
): IncomeChartTooltipPatchCtx {
    const isPayer = host.graphPrimaryView === "payer";
    return {
        isPctChart: false,
        multiYearValueSuffix: "",
        multiYearShowTotal: true,
        wingTooltipSubtitle: isPayer
            ? "הכנסות לפי שנה בגורם משלם"
            : "הכנסות לפי שנה במחלקה",
        wingTotalCaption: isPayer
            ? "סה״כ הכנסות בכל השנים בגורם משלם זה"
            : "סה״כ הכנסות בכל השנים במחלקה זו",
    };
}

/** Same palette as surgeries-dashborad yearPalette */
export const INCOME_DASHBOARD_YEAR_CHART_COLORS = [
    "#2563eb",
    "#0ea5e9",
    "#22c55e",
    "#fbbf24",
    "#a855f7",
];
