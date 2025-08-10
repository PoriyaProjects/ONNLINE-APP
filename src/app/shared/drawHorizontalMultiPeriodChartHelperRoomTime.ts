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
  
    // --- measurement helpers
    const measureTextWidth = (text: string, fontSize = 12): number => {
      const temp = document.createElement("canvas");
      const ctx = temp.getContext("2d");
      if (!ctx) return 80;
      ctx.font = `${fontSize}px Open Sans`;
      return ctx.measureText(text).width;
    };
  
    // =========================
    // FIRST LINE (AVG) CHANGES
    // =========================
  
    // Auto-fit font (only for first line)
    const minFontSize = 11;
    const baseFontSize = 14;
    const textPaddingX = 22;
  
    const pickFontSizeForWidth = (text: string, barWidth: number): number => {
      let size = baseFontSize;
      const maxTextWidth = Math.max(0, barWidth - 2 * textPaddingX);
      while (size > minFontSize && measureTextWidth(text, size) > maxTextWidth) size -= 1;
      return size;
    };
  
    const createTextAuto = (x: number, y: number, text: string, barWidth: number) => {
      const fontSize = pickFontSizeForWidth(text, barWidth);
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", x.toString());
      txt.setAttribute("y", y.toString());
      txt.setAttribute("fill", "#fff");
      txt.setAttribute("font-size", fontSize.toString());
      txt.setAttribute("font-family", "Open Sans");
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "middle");
      txt.textContent = text;
      return txt;
    };
  
    // Widths that RESPECT hard mins (and give extra min to "Yesterday"). Used ONLY for first line.
    function calculateSegmentWidthsAvg(values: number[], texts: string[], totalWidth: number): number[] {
      const raw = values.map(v => (v / maxRef) * totalWidth);
  
      // hard mins based on text + cushion; yesterday gets extra
      const mins = texts.map((t, i) => {
        const textW = measureTextWidth(t, baseFontSize) + 2 * textPaddingX;
        const floor = i === 0 ? 140 : 110; // yesterday a bit wider
        return Math.max(textW, floor);
      });
  
      // lock segments that need their min, distribute remaining to others proportionally
      const needMin = raw.map((w, i) => w < mins[i]);
      const sumFixed = mins.reduce((a, w, i) => a + (needMin[i] ? w : 0), 0);
      const remaining = Math.max(0, totalWidth - sumFixed);
  
      // if no room, scale mins down proportionally (edge case)
      if (remaining <= 0) {
        const scale = totalWidth / sumFixed || 1;
        return mins.map(w => w * scale);
      }
  
      const flexIndices = needMin.map((n, i) => (!n ? i : -1)).filter(i => i >= 0);
      const rawFlexTotal = flexIndices.reduce((acc, i) => acc + raw[i], 0) || 1;
  
      const widths = new Array(values.length).fill(0);
      // set fixed mins
      needMin.forEach((n, i) => { if (n) widths[i] = mins[i]; });
      // distribute remaining across flexible segments
      flexIndices.forEach(i => { widths[i] = (raw[i] / rawFlexTotal) * remaining; });
  
      // final guard: never below min
      return widths.map((w, i) => Math.max(w, mins[i]));
    }
  
    // =========================
    // SECOND LINE (AGG) — AS IS
    // =========================
  
    const createTextFixed = (x: number, y: number, text: string) => {
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", x.toString());
      txt.setAttribute("y", y.toString());
      txt.setAttribute("fill", "#fff");
      txt.setAttribute("font-size", fixedFontSize.toString()); // keep fixed
      txt.setAttribute("font-family", "Open Sans");
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "middle");
      txt.textContent = text;
      return txt;
    };
  
    // original width logic for second line
    const minSegmentPadding = 25;
    function calculateSegmentWidthsAgg(values: number[], labels: string[], totalWidth: number): number[] {
      const minWidths = labels.map(label => measureTextWidth(label, fixedFontSize) + textPadding * 2);
      const rawWidths = values.map(v => (v / maxRef) * totalWidth);
      let adjusted = rawWidths.map((w, i) => Math.max(w, minWidths[i] + minSegmentPadding));
      const totalAdjusted = adjusted.reduce((a, b) => a + b, 0);
      const scale = totalAdjusted > 0 ? totalWidth / totalAdjusted : 1;
      return adjusted.map(w => w * scale);
    }
  
    const totalBarWidth = chartWidth - padding * 2;
  
    // --- Average Row (top) — uses new min/auto-fit
    const avgY = 40;
    const avgTexts = avgLabels.map((l, i) => `${l} - ${formatHHMM(avgValues[i])}`);
    const avgWidths = calculateSegmentWidthsAvg(avgValues, avgTexts, totalBarWidth);
  
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
  
    let currentX = padding;
    avgValues.forEach((val, idx) => {
      const text = avgTexts[idx];
      const width = avgWidths[idx];
      const color = segmentColors[avgLabels[idx]] || colors[idx % colors.length];
      svg.appendChild(createBar(currentX, avgY, width, color));
      svg.appendChild(createTextAuto(currentX + width / 2, avgY + barHeight / 2, text, width));
      currentX += width;
    });
  
    // --- Aggregated Row (bottom) — unchanged behavior
    const aggY = avgY + barHeight + gap;
    const aggTexts = aggLabels.map((l, i) => `${l} - ${formatDays(aggValues[i])}`);
    const aggWidths = calculateSegmentWidthsAgg(aggValues, aggTexts, totalBarWidth);
  
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
      svg.appendChild(createTextFixed(currentX + width / 2, aggY + barHeight / 2, text));
      currentX += width;
    });
  
    if (debug) {
      console.log("Total calculated bar width (avg):", avgWidths.reduce((a, b) => a + b, 0));
      console.log("Total calculated bar width (agg):", aggWidths.reduce((a, b) => a + b, 0));
    }
  
    container.appendChild(svg);
  }
  
