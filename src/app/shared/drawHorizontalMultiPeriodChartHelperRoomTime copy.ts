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
  
  export function drawHorizontalMultiPeriodChartHelperRoomTime(
    opts: HorizontalMultiPeriodChartOptions
  ): void {
    const container = document.getElementById(opts.containerId);
    if (!container) return;
    container.innerHTML = "";
  
    const {
      yesterdayAvg,
      monthAvg,
      yearAvg,
      parallelAvg,
      monthAgg,
      yearAgg,
      parallelAgg,
    } = opts.data;
  
    const colors = opts.colors || ["#f86b6b", "#6ba1f8", "#5ed175", "#fcd74e"];
  
    const formatHHMM = (sec: number) => {
      if (!sec) return "0:00";
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}:${m.toString().padStart(2, "0")}`;
    };
    const formatDays = (d: number) => `${d.toFixed(0)} ימים`;
  
    const chartWidth = 1000; // virtual space (scales to 100%)
    const barHeight = 40;
    const gap = 50;
    const padding = 80;
  
    const avgValues = [yesterdayAvg, monthAvg, yearAvg, parallelAvg];
    const avgLabels = ["אתמול", "חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
    const aggValues = [monthAgg, yearAgg, parallelAgg];
    const aggLabels = ["חודש נוכחי", "שנה נוכחית", "תקופה קודמת"];
  
    // Shared max scaling so rows align visually
    const maxAvg = Math.max(...avgValues, 1);
    const maxAgg = Math.max(...aggValues, 1);
    const maxRef = Math.max(maxAvg, maxAgg);
  
    const chartHeight = 250;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  
    const createBar = (x: number, y: number, width: number, fill: string) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x.toString());
      rect.setAttribute("y", y.toString());
      rect.setAttribute("width", width.toString());
      rect.setAttribute("height", barHeight.toString());
      rect.setAttribute("rx", (barHeight / 2).toString());
      rect.setAttribute("ry", (barHeight / 2).toString());
      rect.setAttribute("fill", fill);
      return rect;
    };
  
    const createText = (x: number, y: number, text: string, bold = false) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x.toString());
      t.setAttribute("y", y.toString());
      t.setAttribute("fill", "#000");
      t.setAttribute("font-size", "36");
      t.setAttribute("font-family", "Open Sans");
      t.setAttribute("text-anchor", "middle");
      if (bold) t.setAttribute("font-weight", "bold");
      t.textContent = text;
      return t;
    };
  
    const measureTextWidth = (text: string, fontSize = 36): number => {
      const temp = document.createElement("canvas");
      const ctx = temp.getContext("2d");
      if (!ctx) return 80;
      ctx.font = `${fontSize}px Open Sans`;
      return ctx.measureText(text).width + 50;
    };
  
    // === Title ===
    svg.appendChild(createText(chartWidth / 2, 50, opts.title, true));
  
    // === Debug logs ===
    console.group(`HorizontalMultiPeriodChart: ${opts.title}`);
    console.log("AVG Values (sec):", avgValues, "MaxRef:", maxRef);
    console.log("AGG Values (days):", aggValues, "MaxRef:", maxRef);
  
    // === Average Row ===
    let currentX = padding;
    const avgY = 100;
    const totalBarWidth = chartWidth - padding * 2;
    avgValues.forEach((val, idx) => {
      const labelText = `${avgLabels[idx]}: ${formatHHMM(val)}`;
      const proportionalWidth = (val / maxRef) * totalBarWidth;
      const minWidth = measureTextWidth(labelText);
      const width = Math.max(proportionalWidth, minWidth);
      console.log(
        `AVG[${avgLabels[idx]}]: val=${val}, proportional=${proportionalWidth}, finalWidth=${width}`
      );
      svg.appendChild(createBar(currentX, avgY, width, colors[idx]));
      svg.appendChild(
        createText(currentX + width / 2, avgY + barHeight / 1.6, labelText)
      );
      currentX += width;
    });
  
    // === Aggregated Row ===
    currentX = padding;
    const aggY = avgY + barHeight + gap;
    const aggColors = colors.slice(1);
    aggValues.forEach((val, idx) => {
      const labelText = `${aggLabels[idx]}: ${formatDays(val)}`;
      const proportionalWidth = (val / maxRef) * totalBarWidth;
      const minWidth = measureTextWidth(labelText);
      const width = Math.max(proportionalWidth, minWidth);
      console.log(
        `AGG[${aggLabels[idx]}]: val=${val}, proportional=${proportionalWidth}, finalWidth=${width}`
      );
      svg.appendChild(
        createBar(currentX, aggY, width, aggColors[idx + 1] || colors[idx + 1])
      );
      svg.appendChild(
        createText(currentX + width / 2, aggY + barHeight / 1.6, labelText)
      );
      currentX += width;
    });
  
    console.groupEnd();
  
    container.appendChild(svg);
  }
  