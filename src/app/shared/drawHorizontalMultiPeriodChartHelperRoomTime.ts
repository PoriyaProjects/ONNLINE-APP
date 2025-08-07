export interface HorizontalMultiPeriodChartOptions {
    containerId: string;
    title: string; // kept for compatibility, but not used
    data: {
        yesterdayAvg: number;
        monthAvg: number;
        yearAvg: number;
        parallelAvg: number;
        monthAgg: number;
        yearAgg: number;
        parallelAgg: number;
    };
    colors?: string[]; // [yesterday, month, year, parallel]
    segmentColors?: { [label: string]: string }; // new: specific colors per segment
    animationDuration?: number;
    debug?: boolean; // new: enable/disable console logs
}

export function drawHorizontalMultiPeriodChartHelperRoomTime(opts: HorizontalMultiPeriodChartOptions): void {
    const container = document.getElementById(opts.containerId);
    if (!container) return;
    container.innerHTML = "";

    const { yesterdayAvg, monthAvg, yearAvg, parallelAvg, monthAgg, yearAgg, parallelAgg } = opts.data;
    const colors = opts.colors || [
        '#6ba1f8', // blue
        '#a974f7', // purple
        '#ff8c42', // orange
        '#00cfc1', // teal
        '#ff69b4', // pink
        '#8b4513', // brown
    ];
    const segmentColors = opts.segmentColors || {};
    const animationDuration = opts.animationDuration ?? 800;
    const debug = opts.debug ?? false;

    const formatHHMM = (sec: number) => {
        if (!sec) return "0:00";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}:${m.toString().padStart(2, "0")}`;
    };
    const formatDays = (d: number) => `${d.toFixed(0)} ימים`;

    const chartWidth = 900,
        barHeight = 30,
        gap = 10,
        padding = 10,
        textPadding = 30,
        minSegmentPadding = 25,
        fixedFontSize = 14;

    const avgValues = [yesterdayAvg, monthAvg, yearAvg, parallelAvg];
    const avgLabels = ["אתמול", "חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
    const aggValues = [monthAgg, yearAgg, parallelAgg];
    const aggLabels = ["חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
    const maxRef = Math.max(Math.max(...avgValues, 1), Math.max(...aggValues, 1));

    const chartHeight = 120;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const createBar = (x: number, y: number, width: number, fill: string) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x.toString());
        rect.setAttribute("y", y.toString());
        rect.setAttribute("width", "0");
        rect.setAttribute("height", barHeight.toString());
        rect.setAttribute("rx", (barHeight / 2).toString());
        rect.setAttribute("ry", (barHeight / 2).toString());
        rect.setAttribute("fill", fill);
        setTimeout(() => { 
            rect.setAttribute("width", width.toString()); 
            rect.style.transition = `width ${animationDuration}ms ease-out`; 
        }, 0);
        return rect;
    };

    const measureTextWidth = (text: string, fontSize = 12): number => {
        const temp = document.createElement("canvas");
        const ctx = temp.getContext("2d");
        if (!ctx) return 80;
        ctx.font = `${fontSize}px Open Sans`;
        return ctx.measureText(text).width + textPadding * 2;
    };

    function calculateSegmentWidths(values: number[], labels: string[], totalWidth: number): number[] {
        const minWidths = labels.map(label => measureTextWidth(label, fixedFontSize) + minSegmentPadding);
        const rawWidths = values.map(v => (v / maxRef) * totalWidth);
        let adjustedWidths = rawWidths.map((w, i) => Math.max(w, minWidths[i]));
        const totalAdjusted = adjustedWidths.reduce((a, b) => a + b, 0);
        const scale = totalAdjusted > 0 ? totalWidth / totalAdjusted : 1;
        return adjustedWidths.map(w => w * scale);
    }

    const createText = (x: number, y: number, text: string, barWidth: number) => {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", x.toString());
        txt.setAttribute("y", y.toString());
        txt.setAttribute("fill", "#fff");
        txt.setAttribute("font-size", fixedFontSize.toString());
        txt.setAttribute("font-family", "Open Sans");
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("dominant-baseline", "middle");
        txt.textContent = text;
        return txt;
    };

    const totalBarWidth = chartWidth - padding * 2;
    const avgY = 40;
    const avgTexts = avgLabels.map((l, i) => `${l} - ${formatHHMM(avgValues[i])}`);
    const avgWidths = calculateSegmentWidths(avgValues, avgTexts, totalBarWidth);

    if (debug) {
        console.group("DEBUG: Average Row");
        avgValues.forEach((val, idx) => {
            console.log({
                index: idx,
                label: avgLabels[idx],
                value: val,
                width: avgWidths[idx],
                color: segmentColors[avgLabels[idx]] || colors[idx % colors.length]
            });
        });
        console.groupEnd();
    }

    // Average Row
    let currentX = padding;
    avgValues.forEach((val, idx) => {
        const text = avgTexts[idx];
        const width = avgWidths[idx];
        const color = segmentColors[avgLabels[idx]] || colors[idx % colors.length];
        svg.appendChild(createBar(currentX, avgY, width, color));
        svg.appendChild(createText(currentX + width / 2, avgY + barHeight / 2, text, width));
        currentX += width;
    });

    // Aggregated Row
    const aggY = avgY + barHeight + gap;
    const aggTexts = aggLabels.map((l, i) => `${l} - ${formatDays(aggValues[i])}`);
    const aggWidths = calculateSegmentWidths(aggValues, aggTexts, totalBarWidth);

    if (debug) {
        console.group("DEBUG: Aggregated Row");
        aggValues.forEach((val, idx) => {
            console.log({
                index: idx,
                label: aggLabels[idx],
                value: val,
                width: aggWidths[idx],
                color: segmentColors[aggLabels[idx]] || colors[(idx + 1) % colors.length]
            });
        });
        console.groupEnd();
    }

    currentX = padding;
    aggValues.forEach((val, idx) => {
        const text = aggTexts[idx];
        const width = aggWidths[idx];
        const color = segmentColors[aggLabels[idx]] || colors[(idx + 1) % colors.length];
        svg.appendChild(createBar(currentX, aggY, width, color));
        svg.appendChild(createText(currentX + width / 2, aggY + barHeight / 2, text, width));
        currentX += width;
    });

    if (debug) {
        console.log("Total calculated bar width (avg):", avgWidths.reduce((a, b) => a + b, 0));
        console.log("Total calculated bar width (agg):", aggWidths.reduce((a, b) => a + b, 0));
    }

    container.appendChild(svg);
}
