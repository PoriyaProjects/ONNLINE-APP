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
    animationDuration?: number;
  }
  
  export function drawHorizontalMultiPeriodChartHelperRoomTime(opts: HorizontalMultiPeriodChartOptions): void {
    const container = document.getElementById(opts.containerId);
    if (!container) return;
    container.innerHTML = "";
  
    const { yesterdayAvg, monthAvg, yearAvg, parallelAvg, monthAgg, yearAgg, parallelAgg } = opts.data;
    const colors = opts.colors || ['#f86b6b', '#6ba1f8', '#5ed175', '#fcd74e'];
    const animationDuration = opts.animationDuration ?? 800;
  
    const formatHHMM = (sec: number) => {
      if (!sec) return "0:00";
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}:${m.toString().padStart(2, "0")}`;
    };
    const formatDays = (d: number) => `${d.toFixed(0)} ימים`;
  
    const chartWidth = 1000, barHeight = 60, gap = 80, padding = 80, textPadding = 20;
    const avgValues = [yesterdayAvg, monthAvg, yearAvg, parallelAvg];
    const avgLabels = ["אתמול", "חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
    const aggValues = [monthAgg, yearAgg, parallelAgg];
    const aggLabels = ["חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
    const maxRef = Math.max(Math.max(...avgValues, 1), Math.max(...aggValues, 1));
  
    const chartHeight = 350;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  
    // Tooltip
    const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tooltip.setAttribute("fill", "#000");
    tooltip.setAttribute("font-size", "26");
    tooltip.setAttribute("font-family", "Open Sans");
    tooltip.setAttribute("text-anchor", "middle");
    tooltip.setAttribute("visibility", "hidden");
    tooltip.setAttribute("font-weight", "bold");
    svg.appendChild(tooltip);
  
    const showTooltip = (text: string, x: number, y: number) => {
      tooltip.setAttribute("x", x.toString());
      tooltip.setAttribute("y", (y - 10).toString());
      tooltip.textContent = text;
      tooltip.setAttribute("visibility", "visible");
    };
    const hideTooltip = () => tooltip.setAttribute("visibility", "hidden");
  
    const createBar = (x: number, y: number, width: number, fill: string, tooltipText: string) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x.toString());
      rect.setAttribute("y", y.toString());
      rect.setAttribute("width", "0");
      rect.setAttribute("height", barHeight.toString());
      rect.setAttribute("rx", (barHeight / 2).toString());
      rect.setAttribute("ry", (barHeight / 2).toString());
      rect.setAttribute("fill", fill);
      setTimeout(() => { rect.setAttribute("width", width.toString()); rect.style.transition = `width ${animationDuration}ms ease-out`; }, 0);
      rect.addEventListener("mouseenter", () => showTooltip(tooltipText, x + width / 2, y - 10));
      rect.addEventListener("mouseleave", hideTooltip);
      return rect;
    };
  
    const createText = (x: number, y: number, text: string, barWidth: number, bold = false) => {
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", x.toString());
      txt.setAttribute("y", y.toString());
      txt.setAttribute("fill", "#000");
      txt.setAttribute("font-size", Math.min(32, barWidth / 6).toString());
      txt.setAttribute("font-family", "Open Sans");
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "middle");
      if (bold) txt.setAttribute("font-weight", "bold");
      txt.textContent = text;
      return txt;
    };
  
    const measureTextWidth = (text: string, fontSize = 32): number => {
      const temp = document.createElement("canvas");
      const ctx = temp.getContext("2d");
      if (!ctx) return 80;
      ctx.font = `${fontSize}px Open Sans`;
      return ctx.measureText(text).width + textPadding * 2;
    };
  
    function calculateSegmentWidths(values: number[], labels: string[], totalWidth: number): number[] {
      const rawWidths = values.map(v => (v / maxRef) * totalWidth);
      const minWidths = labels.map(label => measureTextWidth(label));
      let finalWidths = rawWidths.map((w, i) => Math.max(w, minWidths[i]));
      const totalCurrent = finalWidths.reduce((a, b) => a + b, 0);
      const scale = totalCurrent > 0 ? totalWidth / totalCurrent : 1;
      return finalWidths.map(w => w * scale);
    }
  
    // Title
    svg.appendChild(createText(chartWidth / 2, 40, opts.title, chartWidth, true));
  
    const totalBarWidth = chartWidth - padding * 2;
    const avgY = 120;
    const avgWidths = calculateSegmentWidths(
      avgValues,
      avgLabels.map((l, i) => `${l}: ${formatHHMM(avgValues[i])}`),
      totalBarWidth
    );
  
    // Average Row
    let currentX = padding;
    avgValues.forEach((val, idx) => {
      const text = `${avgLabels[idx]} - ${formatHHMM(val)}`;
      const width = avgWidths[idx];
      svg.appendChild(createBar(currentX, avgY, width, colors[idx], text));
      svg.appendChild(createText(currentX + width / 2, avgY + barHeight / 2, text, width));
      currentX += width;
    });
  
    // Aggregated Row
    const aggY = avgY + barHeight + gap;
    const aggColors = colors.slice(1);
    const aggWidths = calculateSegmentWidths(
      aggValues,
      aggLabels.map((l, i) => `${l}: ${formatDays(aggValues[i])}`),
      totalBarWidth
    );
  
    currentX = padding;
    aggValues.forEach((val, idx) => {
      const text = `${aggLabels[idx]} - ${formatDays(val)}`;
      const width = aggWidths[idx];
      svg.appendChild(createBar(currentX, aggY, width, aggColors[idx + 1] || colors[idx + 1], text));
      svg.appendChild(createText(currentX + width / 2, aggY + barHeight / 2, text, width));
      currentX += width;
    });
  
    container.appendChild(svg);
  }
  