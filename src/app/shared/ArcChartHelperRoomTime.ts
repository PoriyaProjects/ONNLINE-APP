import { formatNumberShort } from "./number-utils";

export interface PieSegment {
  label: string;
  value: number;
  color: string;
}

export interface ArcChartOptions {
  containerId: string;
  /** value for yesterday, in seconds (or raw number if isTime=false) */
  yesterdayValue?: number;
  /** if you still want time formatting (HH:MM) for seconds */
  isTime?: boolean;
  /** optional: for hooking tooltip to an external table (by id prefix) */
  tooltipTableIdPrefix?: string;
  /** optional: id suffix used to locate the table (kept for compatibility) */
  tooltipPeriod?: string; // default '1-Yesterday'
  /** optional: chart title */
  title?: string;
  /** optional: color of the filled semi */
  arcColor?: string;
}

export function drawOverlayArcChartHelperRoomTime({
  containerId,
  yesterdayValue = 0,
  isTime = false,
  tooltipTableIdPrefix,
  tooltipPeriod = '1-Yesterday',
  title = '',
  arcColor = '#e57373'
}: ArcChartOptions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  /** === SVG Base === */
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 300 240');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';

  /** === Tooltip === */
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '4px';
  tooltip.style.background = '#fff';
  tooltip.style.color = '#000';
  tooltip.style.border = '1px solid #ccc';
  tooltip.style.borderRadius = '4px';
  tooltip.style.pointerEvents = 'auto';
  tooltip.style.display = 'none';
  tooltip.style.zIndex = '9999';
  tooltip.style.maxWidth = '400px';
  tooltip.style.maxHeight = '300px';
  tooltip.style.overflow = 'auto';
  tooltip.style.cursor = 'pointer';
  container.append(tooltip);

  let sourceTable: HTMLElement | null = null;
  if (tooltipTableIdPrefix) {
    const tableId = `${tooltipTableIdPrefix}${tooltipPeriod}`;
    sourceTable = document.getElementById(tableId);
  }

  const showTooltip = (content: string) => {
    const header = '<div style="margin-bottom:8px; font-size:12px; color:#555; text-align:center;">לחץ לפרטים</div>';
    tooltip.innerHTML = header + content;
    tooltip.style.display = 'block';
  };
  const moveTooltip = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    tooltip.style.left = `${e.clientX - rect.left + 10}px`;
    tooltip.style.top = `${e.clientY - rect.top + 10}px`;
  };
  const hideTooltip = () => (tooltip.style.display = 'none');
  const scrollToTable = () => {
    if (sourceTable) {
      const rect = sourceTable.getBoundingClientRect();
      const offset = window.pageYOffset + rect.top - 120;
      window.scrollTo({ top: offset, behavior: 'smooth' });
      sourceTable.classList.add('flash-highlight');
      setTimeout(() => sourceTable.classList.remove('flash-highlight'), 2000);
    }
  };

  /** === Title === */
  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.textAlign = 'center';
    titleDiv.style.fontFamily = 'Open Sans, sans-serif';
    titleDiv.style.fontSize = '16px';
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.marginTop = '18px';
    titleDiv.style.marginBottom = '16px';
    titleDiv.textContent = title;
    container.appendChild(titleDiv);
  }

  /** === Value formatting === */
  const formatToHHMM = (totalSeconds: number): string => {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  const formatValue = (val: number) => (isTime ? formatToHHMM(val) : formatNumberShort(val));

  /** === Semi-circle (Yesterday only) === */
  (function drawYesterdaySemi() {
    const cx = 150;
    const cy = 186;
    const radius = 120;
    const segments = 50;
    const maxRef = 60; // minutes cap for color/plus sign

    const totalSeconds = yesterdayValue;
    const totalMinutes = totalSeconds / 60;
    const percent = Math.min(totalMinutes / maxRef, 1);
    const semiColor = totalMinutes > maxRef ? '#cc0033' : arcColor;

    const tooltipText = `<b>אובדן אתמול:</b> ${formatValue(totalSeconds)}`;

    // Background path (full semi)
    const bgPath = [`M ${cx} ${cy}`];
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (Math.PI * i) / segments;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      bgPath.push(`${i === 0 ? 'L' : ''} ${x} ${y}`);
    }
    bgPath.push('Z');

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bg.setAttribute('d', bgPath.join(' '));
    bg.setAttribute('fill', '#b9f6ca');
    addHoverEffects(bg, tooltipText);
    svg.appendChild(bg);

    // Foreground path (portion of the semi)
    const fgPath = [`M ${cx} ${cy}`];
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (percent * Math.PI * i) / segments;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      fgPath.push(`${i === 0 ? 'L' : ''} ${x} ${y}`);
    }
    fgPath.push('Z');

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fg.setAttribute('d', fgPath.join(' '));
    fg.setAttribute('fill', semiColor);
    addHoverEffects(fg, tooltipText);
    svg.appendChild(fg);

    // Value label
    const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valueLabel.setAttribute('x', cx.toString());
    valueLabel.setAttribute('y', (cy - 28).toString());
    valueLabel.setAttribute('text-anchor', 'middle');
    valueLabel.setAttribute('fill', semiColor === '#cc0033' ? '#ffffff' : '#222');
    valueLabel.setAttribute('font-size', '16');
    valueLabel.setAttribute('font-family', 'Open Sans');
    valueLabel.textContent = formatValue(totalSeconds);
    svg.appendChild(valueLabel);

    // Bottom label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx.toString());
    label.setAttribute('y', (cy - 10).toString());
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#222');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-family', 'Open Sans');
    label.textContent = 'אתמול';
    svg.appendChild(label);

    // "+" sign if exceeds cap
    if (totalMinutes > maxRef) {
      const plusSign = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      plusSign.setAttribute('x', (cx + 20).toString());
      plusSign.setAttribute('y', (cy - 32).toString());
      plusSign.setAttribute('text-anchor', 'middle');
      plusSign.setAttribute('fill', '#ffffff');
      plusSign.setAttribute('font-size', '16');
      plusSign.setAttribute('font-family', 'Open Sans');
      plusSign.textContent = '+';
      svg.appendChild(plusSign);
    }
  })();

  /** === Hover helper (kept minimal) === */
  function addHoverEffects(element: SVGElement, tooltipContent: string) {
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
    element.addEventListener('mouseenter', () => {
      showTooltip(tooltipContent);
      element.style.opacity = '0.7';
      element.style.filter = 'drop-shadow(0 0 5px rgba(0,0,0,0.5))';
      element.style.transition = 'all 0.2s ease';
    });
    element.addEventListener('mousemove', moveTooltip);
    element.addEventListener('mouseleave', () => {
      hideTooltip();
      element.style.opacity = '1';
      element.style.filter = 'none';
    });
    element.addEventListener('click', scrollToTable);
  }

  container.appendChild(svg);
}
