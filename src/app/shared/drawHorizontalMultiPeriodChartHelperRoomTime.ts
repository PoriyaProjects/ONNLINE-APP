export interface HorizontalMultiPeriodChartOptions {
  containerId: string;
  title: string;
  data: {
    yesterdayAvg: number;
    monthAvg: number;
    yearAvg: number;
    parallelAvg: number;
    monthAgg: number;
    yearAgg: number;
    parallelAgg: number;
  };
  colors?: string[];                 // [yesterday, month, year, parallel]
  segmentColors?: { [label: string]: string };
  animationDuration?: number;
  debug?: boolean;

  // NEW: control which lines to render & in what order
  // default: ["avg","agg"]
  rows?: Array<"avg" | "agg">;
}

type WidthStrategy = (args: {
  values: number[];
  labels: string[];
  totalWidth: number;
  maxRef: number;
  measureTextWidth: (t: string, size?: number) => number;
}) => number[];

type TextStrategy = (args: {
  x: number; y: number; text: string; barWidth: number;
  fixedFontSize: number; baseFontSize: number; minFontSize: number; textPaddingX: number;
}) => SVGTextElement;

export function drawHorizontalMultiPeriodChartHelperRoomTime(opts: HorizontalMultiPeriodChartOptions): void {
  const container = document.getElementById(opts.containerId);
  if (!container) return;
  container.innerHTML = "";

  const {
    yesterdayAvg, monthAvg, yearAvg, parallelAvg,
    monthAgg, yearAgg, parallelAgg
  } = opts.data;

  const colors = opts.colors ?? ['#6ba1f8','#a974f7','#ff8c42','#00cfc1','#ff69b4','#8b4513'];
  const segmentColors = opts.segmentColors ?? {};
  const animationDuration = opts.animationDuration ?? 800;
  const debug = opts.debug ?? false;

  // --- formatting
  const formatHHMM = (sec: number) => {
    if (!sec) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  };
  const formatDays = (d: number) => `${d.toFixed(0)} ימים`;

  // --- layout
  const chartWidth = 900;
  const barHeight = 30;
  const gap = 10;
  const padding = 10;

  // --- font/layout knobs
  const fixedFontSize = 14;
  const baseFontSize = 14;
  const minFontSize = 11;
  const textPaddingX = 22;
  const textPadding = 30;
  const minSegmentPadding = 25;

  const avgValues = [yesterdayAvg, monthAvg, yearAvg, parallelAvg];
  const avgLabels = ["אתמול", "חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
  const aggValues = [monthAgg, yearAgg, parallelAgg];
  const aggLabels = ["חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];

  const maxRef = Math.max(Math.max(...avgValues, 1), Math.max(...aggValues, 1));
  const totalBarWidth = chartWidth - padding * 2;

  // --- SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "auto");
  svg.setAttribute("viewBox", `0 0 ${chartWidth} ${120}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // --- tiny helpers
  const createBar = (x: number, y: number, width: number, fill: string) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", "0");
    rect.setAttribute("height", String(barHeight));
    rect.setAttribute("rx", String(barHeight / 2));
    rect.setAttribute("ry", String(barHeight / 2));
    rect.setAttribute("fill", fill);
    // animate width
    requestAnimationFrame(() => {
      rect.setAttribute("width", String(width));
      rect.style.transition = `width ${animationDuration}ms ease-out`;
    });
    return rect;
  };

  // cache a 2D context once
  const textCtx = document.createElement("canvas").getContext("2d");
  const measureTextWidth = (text: string, fontSize = 12): number => {
    if (!textCtx) return 80;
    textCtx.font = `${fontSize}px Open Sans`;
    return textCtx.measureText(text).width;
  };

  const createTextAuto: TextStrategy = ({ x, y, text, barWidth, fixedFontSize: _ignored, baseFontSize, minFontSize, textPaddingX }) => {
    // pick a font size that fits in bar
    let size = baseFontSize;
    const maxTextWidth = Math.max(0, barWidth - 2 * textPaddingX);
    while (size > minFontSize && measureTextWidth(text, size) > maxTextWidth) size -= 1;

    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", String(x));
    txt.setAttribute("y", String(y));
    txt.setAttribute("fill", "#fff");
    txt.setAttribute("font-size", String(size));
    txt.setAttribute("font-family", "Open Sans");
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("dominant-baseline", "middle");
    txt.textContent = text;
    return txt;
  };

  const createTextFixed: TextStrategy = ({ x, y, text, fixedFontSize }) => {
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", String(x));
    txt.setAttribute("y", String(y));
    txt.setAttribute("fill", "#fff");
    txt.setAttribute("font-size", String(fixedFontSize));
    txt.setAttribute("font-family", "Open Sans");
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("dominant-baseline", "middle");
    txt.textContent = text;
    return txt;
  };

  // --- width strategies
  const widthsAvg: WidthStrategy = ({ values, labels, totalWidth, maxRef, measureTextWidth }) => {
    const raw = values.map(v => (v / maxRef) * totalWidth);
    const mins = labels.map((t, i) => {
      const textW = measureTextWidth(t, baseFontSize) + 2 * textPaddingX;
      const floor = i === 0 ? 140 : 110; // yesterday gets extra
      return Math.max(textW, floor);
    });

    const needMin = raw.map((w, i) => w < mins[i]);
    const sumFixed = mins.reduce((a, w, i) => a + (needMin[i] ? w : 0), 0);
    const remaining = Math.max(0, totalWidth - sumFixed);

    if (remaining <= 0) {
      const scale = totalWidth / (sumFixed || 1);
      return mins.map(w => w * scale);
    }

    const flexIdx = needMin.map((n, i) => (!n ? i : -1)).filter(i => i >= 0);
    const rawFlexTotal = flexIdx.reduce((acc, i) => acc + raw[i], 0) || 1;

    const widths = new Array(values.length).fill(0);
    needMin.forEach((n, i) => { if (n) widths[i] = mins[i]; });
    flexIdx.forEach(i => { widths[i] = (raw[i] / rawFlexTotal) * remaining; });

    return widths.map((w, i) => Math.max(w, mins[i]));
  };

  const widthsAgg: WidthStrategy = ({ values, labels, totalWidth, maxRef, measureTextWidth }) => {
    const minWidths = labels.map(label => measureTextWidth(label, fixedFontSize) + textPadding * 2);
    const raw = values.map(v => (v / maxRef) * totalWidth);
    let adjusted = raw.map((w, i) => Math.max(w, minWidths[i] + minSegmentPadding));
    const totalAdjusted = adjusted.reduce((a, b) => a + b, 0);
    const scale = totalAdjusted > 0 ? totalWidth / totalAdjusted : 1;
    return adjusted.map(w => w * scale);
  };

  // --- row factory
  interface RowSpec {
    id: "avg" | "agg";
    values: number[];
    labels: string[];
    textBuilder: (label: string, value: number) => string;
    widthStrategy: WidthStrategy;
    textStrategy: TextStrategy;
    colorIndexShift?: number;
  }

  const rowsSpec: Record<"avg" | "agg", RowSpec> = {
    avg: {
      id: "avg",
      values: avgValues,
      labels: avgLabels,
      textBuilder: (l, v) => `${l} - ${formatHHMM(v)}`,
      widthStrategy: widthsAvg,
      textStrategy: createTextAuto,
      colorIndexShift: 0,
    },
    agg: {
      id: "agg",
      values: aggValues,
      labels: aggLabels,
      textBuilder: (l, v) => `${l} - ${formatDays(v)}`,
      widthStrategy: widthsAgg,
      textStrategy: createTextFixed,
      colorIndexShift: 1, // keep your original offset
    }
  };

  const rowsOrder = opts.rows ?? ["avg", "agg"];

  // --- render rows in requested order
  let currentY = 40; // first row Y
  rowsOrder.forEach(rowId => {
    const row = rowsSpec[rowId];
    const labels = row.labels;
    const values = row.values;
    const texts = labels.map((l, i) => row.textBuilder(l, values[i]));
    const widths = row.widthStrategy({
      values, labels: texts, totalWidth: totalBarWidth, maxRef, measureTextWidth
    });

    if (debug) {
      console.group(`DEBUG: ${rowId.toUpperCase()} Row`);
      values.forEach((val, idx) => {
        console.log({
          index: idx,
          label: row.labels[idx],
          value: val,
          width: widths[idx],
          color: segmentColors[row.labels[idx]] || colors[((idx + (row.colorIndexShift ?? 0)) % colors.length)]
        });
      });
      console.groupEnd();
    }

    let x = padding;
    values.forEach((_, idx) => {
      const width = widths[idx];
      const label = labels[idx];
      const text = texts[idx];
      const color = segmentColors[label] || colors[((idx + (row.colorIndexShift ?? 0)) % colors.length)];

      svg.appendChild(createBar(x, currentY, width, color));
      svg.appendChild(
        row.textStrategy({
          x: x + width / 2,
          y: currentY + barHeight / 2,
          text,
          barWidth: width,
          fixedFontSize,
          baseFontSize,
          minFontSize,
          textPaddingX
        })
      );

      x += width;
    });

    currentY += barHeight + gap;
  });

  container.appendChild(svg);
}
