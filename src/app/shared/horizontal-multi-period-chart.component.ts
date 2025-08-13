import {
    Component, Input, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
    OnChanges, SimpleChanges, AfterViewInit, HostListener
  } from '@angular/core';
  
  export interface HmpcDataPoint { label: string; value: number; color?: string; tooltip?: string; }
  export interface HmpcRow { category: string; periods: HmpcDataPoint[]; }
  
  type LegendMode = 'auto' | 'hidden';
  type ColorMode  = 'label' | 'thresholds';
  
  @Component({
    selector: 'horizontal-multi-period-chart',
    template: `
      <div class="hmpc">
        <div class="legend" *ngIf="legendMode!=='hidden' && legendItems.length">
          <div class="legend-item" *ngFor="let it of legendItems">
            <span class="swatch" [style.background]="it.color"></span>
            <span class="legend-text">{{ it.label }}</span>
          </div>
        </div>
        <div class="plot"></div>
        <div class="empty" *ngIf="!rows?.length">אין נתונים להצגה</div>
      </div>
    `,
    styles: [`
      :host { display:flex; justify-content:center; width:100%; }
      .hmpc { width:100%; }
      .legend { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:8px; }
      .legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#424242; }
      .swatch { width:14px; height:14px; border-radius:3px; border:1px solid rgba(0,0,0,.12); display:inline-block; }
      .plot { width: 80vw; margin: 0 auto; min-height:320px; position:relative; }
      .empty { color:#9e9e9e; font-size:12px; padding:6px 2px; }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export class HorizontalMultiPeriodChartComponent implements OnChanges, AfterViewInit {
    @Input() rows: HmpcRow[] = [];
  
    // layout
    @Input() categoryWidth = 220;   // minimum label column (px) – auto-expands to fit widest label
    @Input() barHeight = 18;
    @Input() rowGap = 10;
    @Input() paddingX = 10;
  
    // labels / values
    @Input() showValueLabels = true;
    @Input() valueFormat: (v:number, periodLabel?:string)=>string = (v) => String(v);
  
    // legend
    @Input() legendMode: LegendMode = 'auto';
  
    // coloring
    @Input() colorMode: ColorMode = 'label';
    @Input() palette: Record<string,string> = {
      'AvgDay':   '#1e88e5',
      'Q':        '#3949ab',
      'SLA Δ':    '#e53935',
      '0–7':      '#43a047',
      '8–14':     '#7cb342',
      '15–30':    '#fdd835',
      '>30':      '#e53935'
    };
    @Input() thresholds: Array<{ upTo?: number; color: string }> = [
      { upTo: 14, color: '#43a047' }, { upTo: 30, color: '#fdd835' }, { color: '#e53935' }
    ];
  
    @Input() maxValue?: number;
  
    private initialized = false;
  
    constructor(private el: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) {}
  
    ngAfterViewInit(): void { this.initialized = true; requestAnimationFrame(() => this.render()); }
    ngOnChanges(_: SimpleChanges): void { if (this.initialized) this.render(); }
    @HostListener('window:resize') onResize() { if (this.initialized) this.render(); }
  
    get legendItems(): Array<{label: string; color: string}> {
      if (!this.rows?.length) return [];
      const labels = new Map<string,string>();
      for (const r of this.rows) for (const p of r.periods) {
        const color = this.resolveColor(p);
        if (!labels.has(p.label)) labels.set(p.label, color);
      }
      return Array.from(labels.entries()).map(([label, color]) => ({ label, color }));
    }
  
    private render(): void {
        const host = this.el.nativeElement.querySelector('.plot') as HTMLElement;
        if (!host) return;
        host.innerHTML = '';
        if (!this.rows?.length) { this.cdr.markForCheck(); return; }
      
        const width  = Math.floor(window.innerWidth * 0.8);
        const rowH   = this.barHeight + this.rowGap;
        const height = (this.rows.length * rowH) + 30;
      
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg   = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        host.appendChild(svg);
      
        // --- separate layers (groups): bars below, labels above ---
        const barsG   = document.createElementNS(svgNS, 'g');  // background layer
        const labelsG = document.createElementNS(svgNS, 'g');  // foreground layer
        svg.appendChild(barsG);   // appended first -> behind
        svg.appendChild(labelsG); // appended last  -> in front
      
        // 1) measure widest label
        const measured = this.measureMaxLabelWidth(svg);
        const catW     = Math.max(this.categoryWidth, measured + 12);
      
        // 2) bars width & domain
        const barsW = Math.max(100, width - catW - this.paddingX * 2);
        const max   = this.computeMaxValue();
      
        let y = 20;
      
        for (const row of this.rows) {
          // --- draw bars in barsG (behind) ---
          const startX = this.paddingX + catW; // labels on left; bars grow to right
          let x = startX;
      
          for (const p of row.periods) {
            const val   = Math.max(0, Number(p.value) || 0);
            const w     = Math.max(2, Math.round((val / (max || 1)) * barsW));
            const color = this.resolveColor(p);
      
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(y));
            rect.setAttribute('width', String(w));
            rect.setAttribute('height', String(this.barHeight));
            rect.setAttribute('fill', color);
            rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
            if (p.tooltip) rect.setAttribute('title', p.tooltip);
            barsG.appendChild(rect);
      
            // centered numeric label (still in bars layer is fine; put in front if you prefer)
            if (this.showValueLabels && w >= 22) {
              const txt = document.createElementNS(svgNS, 'text');
              txt.textContent = this.valueFormat(val, p.label);
              txt.setAttribute('font-size', '11');
              txt.setAttribute('dominant-baseline', 'central');
              txt.setAttribute('direction', 'ltr');
              txt.setAttribute('style', 'unicode-bidi:plaintext; pointer-events:none;');
              txt.setAttribute('fill', this.textColorFor(color));
              txt.setAttribute('x', String(x + w / 2));
              txt.setAttribute('y', String(y + this.barHeight / 2));
              txt.setAttribute('text-anchor', 'middle');
              barsG.appendChild(txt);
            }
      
            x += (w + 4);
          }
      
          // --- draw category label in labelsG (front) ---
          const cat = document.createElementNS(svgNS, 'text');
          cat.textContent = row.category;
          cat.setAttribute('font-size', '12');
          cat.setAttribute('font-family', 'Arial, sans-serif');
          cat.setAttribute('dominant-baseline', 'hanging');
          cat.setAttribute('direction', 'rtl');
          cat.setAttribute('style', 'unicode-bidi:bidi-override; pointer-events:none;');
      
          const labelX = this.paddingX + catW - 2; // right edge of label column
          cat.setAttribute('x', String(labelX));
          cat.setAttribute('text-anchor', 'end'); // right-align within label column
          cat.setAttribute('y', String(y));
          labelsG.appendChild(cat);
      
          y += rowH;
        }
      
        this.cdr.markForCheck();
      }
      
  
    // measure max pixel width of labels in the current font
    private measureMaxLabelWidth(svg: SVGSVGElement): number {
      if (!this.rows?.length) return 0;
      const svgNS = 'http://www.w3.org/2000/svg';
      let max = 0;
      // Create once, reuse for speed
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('font-size', '12');
      t.setAttribute('font-family', 'Arial, sans-serif');
      t.setAttribute('visibility', 'hidden');
      t.setAttribute('direction', 'rtl');
      t.setAttribute('style', 'unicode-bidi:bidi-override;');
      svg.appendChild(t);
      for (const r of this.rows) {
        t.textContent = r.category || '';
        const w = t.getBBox().width;
        if (w > max) max = w;
      }
      svg.removeChild(t);
      return Math.ceil(max);
    }
  
    private computeMaxValue(): number {
      if (typeof this.maxValue === 'number' && this.maxValue > 0) return this.maxValue;
      let max = 1;
      for (const r of this.rows) for (const p of r.periods) {
        max = Math.max(max, Math.max(0, Number(p.value) || 0));
      }
      return max;
    }
  
    private resolveColor(p: HmpcDataPoint): string {
      if (p.color) return p.color;
      if (this.colorMode === 'label') return this.palette[p.label] || '#90caf9';
      const v = Math.max(0, Number(p.value) || 0);
      for (const t of this.thresholds) {
        if (typeof t.upTo === 'number') { if (v <= t.upTo) return t.color; }
        else return t.color;
      }
      return '#90caf9';
    }
  
    private textColorFor(bg: string): string {
      const c = this.hexToRgb(bg) || { r: 144, g: 202, b: 249 };
      const L = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
      return L < 0.6 ? '#fff' : '#212121';
    }
  
    private hexToRgb(hex: string): {r:number; g:number; b:number} | null {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
      if (!m) return null;
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
    }
  }
  