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
    workingDaysInfo: WorkingDaysInfo;
    gaugePlanned: number;
    gaugeTargetValue: number;
    gaugeValue: number;
    gaugeTargetStatus: '✅' | '❌';
    currentMonthValues?: PieSegment[];
    showMarker?: boolean;
    markerOptions?: MarkerOptions;
  }
  

  

export function drawOverlayDualArcChartHelperIncome({
    containerId,
    workingDaysInfo,
    gaugePlanned,
    gaugeTargetValue,
    gaugeValue,
    gaugeTargetStatus,
    currentMonthValues = [],
    showMarker = true,
    markerOptions = { radius: 14, fontSize: 10 }
  }) {
    //console.log('🎯 drawOverlayDualArcChartHelper - currentMonthValues:', currentMonthValues);
    const container = document.getElementById(containerId);
    console.log("___containerId:" + containerId);
    if (!container) return;
  
    const existing = document.getElementById('dual_arc_svg');
    if (existing) existing.remove();
  
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('id', 'dual_arc_svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
  
  
    
    
    
    
    
    const createArc = (r, strokeWidth, color, valuePercent) => {
      const fullCirc = 2 * Math.PI * r;
      const halfCirc = fullCirc / 2;
      const dashOffset = (1 - valuePercent) * halfCirc;
  
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bg.setAttribute('cx', '150');
      bg.setAttribute('cy', '150');
      bg.setAttribute('r', r.toString());
      bg.setAttribute('fill', 'none');
      bg.setAttribute('stroke', '#1a1a1a');
      bg.setAttribute('stroke-width', strokeWidth.toString());
      bg.setAttribute('stroke-dasharray', `${halfCirc} ${fullCirc}`);
      bg.setAttribute('stroke-dashoffset', '0');
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
      fg.style.transition = 'stroke-dashoffset 0.8s ease';
  
      return [bg, fg];
    };
  
    const percentWorked = Math.min(workingDaysInfo.currentWorkingDayIndex / workingDaysInfo.totalWorkingDays, 1);
    const percentPlanned = Math.min(gaugePlanned / gaugeTargetValue, 1);
    const percentActual = Math.min(gaugeValue / gaugeTargetValue, 1);
  
    const [bgInner, fgInner] = createArc(65, 20, '#6ba1f8', percentWorked);
    svg.appendChild(bgInner);
    svg.appendChild(fgInner);
  
    const statusColor = gaugeTargetStatus === '✅' ? '#00cc66' : '#cc0033';
    const [bgOuter, fgOuter] = createArc(90, 24, statusColor, percentPlanned);
    svg.appendChild(bgOuter);
    svg.appendChild(fgOuter);
  
    // MARKERS
    if (showMarker) {
      requestAnimationFrame(() => {
        const placeMarker = (value, maxValue, radius, color, showPercent = false) => {
          const clamped = Math.min(value, maxValue);
          const ratio = clamped / maxValue;
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
          text.setAttribute('font-family', 'Arial');
          //text.textContent = showPercent ? `${Math.round(ratio * 100)}%` : Math.round(value).toString();
          text.textContent = showPercent ? `${Math.round(ratio * 100)}%`  : formatNumberShort(value);
          svg.appendChild(text);
        };
  
        // Outer arc marker: actual value
        placeMarker(gaugeValue, gaugeTargetValue, 90, statusColor, false);
        // Inner arc marker: working days progress
        placeMarker(workingDaysInfo.currentWorkingDayIndex, workingDaysInfo.totalWorkingDays, 65, '#6ba1f8', true);
      });
    }
 
    





    // === PIE CHART BELOW THE ARCS ===
if (Array.isArray(currentMonthValues) && currentMonthValues.length > 0) {
    const pieGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
    const centerX = 150;
    const centerY = 270; // clearly below the arcs (original was 150)
    const pieRadius = 35;
    let startAngle = 0;
  
    const total = currentMonthValues.reduce((sum, item) => sum + item.value, 0);
  
    currentMonthValues.forEach((segment, i) => {
      const percent = segment.value / total;
      const angle = percent * 2 * Math.PI;
      const endAngle = startAngle + angle;
  
      const x1 = centerX + pieRadius * Math.cos(startAngle);
      const y1 = centerY + pieRadius * Math.sin(startAngle);
      const x2 = centerX + pieRadius * Math.cos(endAngle);
      const y2 = centerY + pieRadius * Math.sin(endAngle);
      const largeArcFlag = angle > Math.PI ? 1 : 0;
  
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${centerX},${centerY} L ${x1},${y1} A ${pieRadius},${pieRadius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`);
      path.setAttribute('fill', segment.color);
      path.setAttribute('stroke', '#fff');
      path.setAttribute('stroke-width', '1');
      pieGroup.appendChild(path);
  
      startAngle = endAngle;
    });
  
    // Optional: add central label under pie
    const pieLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    pieLabel.setAttribute('x', centerX.toString());
    pieLabel.setAttribute('y', (centerY + pieRadius + 18).toString());
    pieLabel.setAttribute('text-anchor', 'middle');
    pieLabel.setAttribute('fill', '#343a40');
    pieLabel.setAttribute('font-size', '14');
    pieLabel.setAttribute('font-family', 'Arial');
    pieLabel.textContent = 'חלוקת ניצול חודשי';
    pieGroup.appendChild(pieLabel);
  
    svg.appendChild(pieGroup);
  }
  
  


(() => {
    const cx = 150;
    const cy = 160;
    const radius = 50;
    const segments = 50;
  
    const percent = Math.max(0, Math.min(gaugeValue / gaugeTargetValue, 1));
    const sweepAngle = Math.PI * percent;
  
    // השתמש בלוגיקה האחידה לצבע
    const statusColor = gaugeTargetStatus === '✅' ? '#00cc66' : '#cc0033';
  
    // === רקע אפור (חצי עיגול מלא) ===
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
    bg.setAttribute('fill', '#1a1a1a');
    svg.appendChild(bg);
  
    // === חלק צבעוני (לפי אחוז) ===
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
    fg.setAttribute('fill', statusColor);
    svg.appendChild(fg);
  
    // === טקסט באמצע ===
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx.toString());
    label.setAttribute('y', (cy - 38).toString());
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '16');
    //label.setAttribute('font-weight', 'bold');
    label.setAttribute('font-family', 'Arial');
  
    const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan1.setAttribute('x', cx.toString());
    tspan1.setAttribute('dy', '1em');
    tspan1.textContent = `${Math.round(percent * 100)}%`;
  
    const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan2.setAttribute('x', cx.toString());
    tspan2.setAttribute('dy', '1.2em');
    tspan2.textContent = `מהמתוכנן`;
  
    label.appendChild(tspan1);
    label.appendChild(tspan2);
    svg.appendChild(label);
  })();

  
    container.appendChild(svg);


    
  
    // === LEGEND ===
    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.bottom = '30px';
    legend.style.left = '50%';
    legend.style.transform = 'translateX(-50%)';
    legend.style.textAlign = 'center';
    legend.style.fontFamily = 'Arial, sans-serif';
    legend.style.fontSize = '14px';
    legend.style.color = '#343a40';
  
    legend.innerHTML = `
    <div style="white-space: nowrap; text-align:right; float:right; line-height:1.6em;">
      <span style="color: ${statusColor}; font-weight: bold;font-size:2.4em; vertical-align: middle; float:right;">●</span>
      <span style="float:right;padding-right:6px;">הכנסות רשומות השנה ${formatNumberShort(gaugeValue)} <br> תחזית: ${formatNumberShort(gaugePlanned)} מתוך ${formatNumberShort(gaugeTargetValue)}</span>
    </div>
    <div style="white-space: nowrap; text-align:right; float:right; line-height:1.6em;">
      <span style="color: #6ba1f8; font-weight: bold; font-size:2.4em;vertical-align: middle;">●</span> חודשים לחישוב: ${workingDaysInfo.currentWorkingDayIndex} מתוך ${workingDaysInfo.totalWorkingDays} (${Math.round((workingDaysInfo.currentWorkingDayIndex / workingDaysInfo.totalWorkingDays) * 100)}%)
    </div>
  `;
  
    container.appendChild(legend);






   
      
  }