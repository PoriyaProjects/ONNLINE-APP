import { formatNumberShort } from "./number-utils";

export interface WorkingDaysInfo {
    totalWorkingDays: number;
    currentWorkingDayIndex: number;
  }
  
  export interface PieSegment {
    label: string;
    value: number;
    color: string;
  }
  
  export interface MarkerOptions {
    radius: number;
    fontSize: number;
  }
  

  

  export interface DualArcChartOptions {
    containerId: string;
    workingDaysInfo: { totalWorkingDays: number; currentWorkingDayIndex: number };
    gaugePlanned: number;
    gaugeTargetValue: number;
    gaugeValue: number;
    gaugeTargetStatus: '✅' | '❌';
    currentMonthValues?: { label: string; value: number; color: string }[];
    showMarker?: boolean;
    markerOptions?: { radius: number; fontSize: number };
    title?: string;
    arcColor?: string;
    isTime?: boolean;
    yesterdayValue?: number; //  yesterday value
    //tooltipTableId?: string | HTMLElement;
    tooltipTableIdPrefix?: string; // e.g., "tableMorningDelay_", "tableEndDay_", "tableSetupTime_"
    tooltipPeriod?: string; // e.g., "1-Yesterday"
}

export function drawOverlayDualArcChartHelperRoomTime({
  containerId,
  yesterdayValue = 0,
  workingDaysInfo,
  gaugePlanned,
  gaugeTargetValue,
  gaugeValue,
  gaugeTargetStatus,
  currentMonthValues = [],
  showMarker = true,
  markerOptions = { radius: 14, fontSize: 10 },
  title = '',
  arcColor = '#6ba1f8',
  //tooltipTableId,
   tooltipTableIdPrefix,
    tooltipPeriod = '1-Yesterday',
  isTime = false
}: DualArcChartOptions) {

  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 300 300');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';

  // === Tooltip container ===
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '1px';
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

    // === Resolve full table ID dynamically ===
    let sourceTable: HTMLElement | null = null;
    if (tooltipTableIdPrefix) {
        const tableId = `${tooltipTableIdPrefix}${tooltipPeriod}`;
        sourceTable = document.getElementById(tableId);
    }

    const showTooltip = () => {
        tooltip.innerHTML = sourceTable ? sourceTable.outerHTML : '<b>Data not available</b>';
        tooltip.style.display = 'block';
    };
    const moveTooltip = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 10}px`;
        tooltip.style.top = `${e.clientY - rect.top + 10}px`;
    };
    const hideTooltip = () => (tooltip.style.display = 'none');
    // const scrollToTable = () => {
    //     if (sourceTable) sourceTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // };
  //   const scrollToTable = () => {
  //     if (sourceTable) {
  //         const rect = sourceTable.getBoundingClientRect();
  //         const offset = window.pageYOffset + rect.top - 120; // scroll position - 60px
  //         window.scrollTo({
  //             top: offset,
  //             behavior: 'smooth'
  //         });
  //     }
  // };

  const scrollToTable = () => {
    if (sourceTable) {
        const rect = sourceTable.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 120; // scroll position - 60px
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });

        // Add flash class
        sourceTable.classList.add('flash-highlight');

        // Remove class after animation completes
        setTimeout(() => {
            sourceTable.classList.remove('flash-highlight');
        }, 2000); // duration: 0.6s * 3 flashes + buffer
    }
};



  // === Title ===
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

  const formatToHHMM = (totalSeconds: number): string => {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  const formatValue = (val: number) => isTime ? formatToHHMM(val) : formatNumberShort(val);

  // === Arc helper
  const createArc = (r: number, strokeWidth: number, color: string, valuePercent: number) => {
    const fullCirc = 2 * Math.PI * r;
    const halfCirc = fullCirc / 2;
    const dashOffset = (1 - valuePercent) * halfCirc;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', '150');
    bg.setAttribute('cy', '150');
    bg.setAttribute('r', r.toString());
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', '#666666');
    bg.setAttribute('stroke-width', strokeWidth.toString());
    bg.setAttribute('stroke-dasharray', `${halfCirc} ${fullCirc}`);
    bg.setAttribute('transform', 'rotate(-180 150 150)');
    bg.setAttribute('stroke-linecap', 'round');

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('cx', '150');
    fg.setAttribute('cy', '150');
    fg.setAttribute('r', r.toString());
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke', color);
    fg.setAttribute('stroke-width', strokeWidth.toString());
    fg.setAttribute('stroke-dasharray', `${halfCirc} ${fullCirc}`);
    fg.setAttribute('stroke-dashoffset', dashOffset.toString());
    fg.setAttribute('transform', 'rotate(-180 150 150)');
    fg.setAttribute('stroke-linecap', 'round');

    return [bg, fg];
  };

  // === Percentages
  const percentWorked = Math.min(workingDaysInfo.currentWorkingDayIndex / workingDaysInfo.totalWorkingDays, 1);
  const percentPlanned = Math.min(gaugePlanned / gaugeTargetValue, 1);
  const markerStatusColor = gaugeTargetStatus === '✅' ? '#00cc66' : '#cc0033';

  // === Semi-circle for yesterday (bottom-centered)
  (() => {
    const cx = 150;
    const cy = 156;
    const radius = 50;
    const segments = 50;

    const percent = Math.min(yesterdayValue / (gaugeTargetValue || 1), 1);
    const sweepAngle = Math.PI * percent;
    const semiColor = '#ffaa00'; // distinct yesterday color

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
    bg.setAttribute('fill', '#666666');
    bg.style.pointerEvents = 'auto';
        // Tooltip + scroll for background
        bg.addEventListener('mouseenter', showTooltip);
        bg.addEventListener('mousemove', moveTooltip);
        bg.addEventListener('mouseleave', hideTooltip);
        bg.addEventListener('click', scrollToTable);
        svg.appendChild(bg);

    

    const fgPath = [`M ${cx} ${cy}`];
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (sweepAngle * i) / segments;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      fgPath.push(`${i === 0 ? 'L' : ''} ${x} ${y}`);
    }
    fgPath.push('Z');

    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fg.setAttribute('d', fgPath.join(' '));
    fg.setAttribute('fill', semiColor);
    fg.style.pointerEvents = 'auto'; // Enable hover
    //svg.appendChild(fg);

    
     // Tooltip events
    // Tooltip + scroll for foreground
    fg.addEventListener('mouseenter', showTooltip);
    fg.addEventListener('mousemove', moveTooltip);
    fg.addEventListener('mouseleave', hideTooltip);
    fg.addEventListener('click', scrollToTable);
    svg.appendChild(fg);


    // Value label inside
    const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valueLabel.setAttribute('x', cx.toString());
    valueLabel.setAttribute('y', (cy - 28).toString());
    valueLabel.setAttribute('text-anchor', 'middle');
    valueLabel.setAttribute('fill', '#fff');
    valueLabel.setAttribute('font-size', '16');
    valueLabel.setAttribute('font-family', 'Open Sans');
    valueLabel.textContent = formatValue(yesterdayValue);
    svg.appendChild(valueLabel);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx.toString());
    label.setAttribute('y', (cy - 10).toString());
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-family', 'Open Sans');
    label.textContent = 'אתמול';
    svg.appendChild(label);
  })();

  // === Inner arc (currentMonth / currentYear)
  const [bgInner, fgInner] = createArc(65, 20, arcColor, percentWorked);
  svg.appendChild(bgInner);
  svg.appendChild(fgInner);

  // === Outer arc (currentYear / parallels)
  const [bgOuter, fgOuter] = createArc(90, 24, arcColor, percentPlanned);
  svg.appendChild(bgOuter);
  svg.appendChild(fgOuter);

  // === MARKERS
  if (showMarker) {
    requestAnimationFrame(() => {
      const placeMarker = (value: number, maxValue: number, radius: number, color: string, showPercent = false) => {
        const clamped = Math.min(value, maxValue);
        const ratio = maxValue > 0 ? clamped / maxValue : 0;
        const angleDeg = 180 - (ratio * 180);
        const angleRad = angleDeg * (Math.PI / 180);
        const cx = 150 + radius * Math.cos(angleRad);
        const cy = 150 - radius * Math.sin(angleRad);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx.toFixed(1));
        circle.setAttribute('cy', cy.toFixed(1));
        circle.setAttribute('r', markerOptions.radius.toString());
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx.toFixed(1));
        text.setAttribute('y', (cy + 4).toFixed(1));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', markerOptions.fontSize.toString());
        text.setAttribute('font-family', 'Open Sans');
        text.textContent = showPercent ? `${Math.round(ratio * 100)}%` : formatValue(value);
        svg.appendChild(text);
      };

      placeMarker(gaugeValue, gaugeTargetValue, 90, markerStatusColor, false);
      placeMarker(workingDaysInfo.currentWorkingDayIndex, workingDaysInfo.totalWorkingDays, 65, '#6ba1f8', true);
    });
  }

  // === LEGEND ===
  const legend = document.createElement('div');
  legend.style.position = 'absolute';
  legend.style.bottom = '20px';
  legend.style.left = '50%';
  legend.style.transform = 'translateX(-50%)';
  legend.style.textAlign = 'center';
  legend.style.fontFamily = 'Open Sans, sans-serif';
  legend.style.fontSize = '14px';
  legend.style.color = '#343a40';

  legend.innerHTML = `
    <div style="white-space: nowrap; text-align:right; float:right; line-height:1.6em;">
        <span style="color: ${markerStatusColor}; font-weight: bold;font-size:2.4em; vertical-align: middle; float:right;">●</span>
        <span style="float:right;padding-right:6px;">
            מתחילת השנה על מול תקופה מקבילה: ${formatValue(gaugeValue)} <br>
            תקופה קודמת: ${formatValue(gaugeTargetValue)} 
        </span>
    </div>
    <div style="white-space: nowrap; text-align:right; float:right; line-height:1.6em;">
        <span style="color: #6ba1f8; font-weight: bold; font-size:2.4em;vertical-align: middle;">●</span>
        החודש על מול השנה: ${formatValue(workingDaysInfo.currentWorkingDayIndex)} על מול ${formatValue(workingDaysInfo.totalWorkingDays)} 
        (${Math.round((workingDaysInfo.currentWorkingDayIndex / workingDaysInfo.totalWorkingDays) * 100)}%)
    </div>
  `;
  container.appendChild(legend);

  container.appendChild(svg);
}



  