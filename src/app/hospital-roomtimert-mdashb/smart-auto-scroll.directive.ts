// smart-auto-scroll.directive.ts
import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';

@Directive({ selector: '[smartAutoScroll]' })
export class SmartAutoScrollDirective implements AfterViewInit, OnDestroy {
  @Input() behavior: ScrollBehavior = 'smooth';          
  @Input() blockActive: ScrollLogicalPosition = 'center';
  @Input() blockPlanned: ScrollLogicalPosition = 'start';
  @Input() runOnce = false;                              

  private mo?: MutationObserver;
  private lastTarget?: Element;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    const tick = () => this.tryScroll();
    setTimeout(tick); // after first paint
    this.mo = new MutationObserver(tick);
    this.mo.observe(this.host.nativeElement, { childList: true, subtree: true, attributes: true });
  }
  ngOnDestroy() { this.mo?.disconnect(); }

  private tryScroll() {
    const root = this.host.nativeElement;

    // 1) first active "InProgress"
    const active = root.querySelector<HTMLElement>('.surgery-row[data-status="InProgress"]');
    if (active) return this.scrollTo(active, this.blockActive);

    // 2) else first planned
    const planned = root.querySelector<HTMLElement>('.surgery-row[data-planned="true"]');
    if (planned) return this.scrollTo(planned, this.blockPlanned);

    // 3) else bottom
    root.scrollTo({ top: root.scrollHeight, behavior: this.behavior });
    this.lastTarget = undefined;
  }

  private scrollTo(target: HTMLElement, block: ScrollLogicalPosition) {
    if (this.lastTarget === target && this.runOnce) return;
    target.scrollIntoView({ behavior: this.behavior, block, inline: 'nearest' });
    this.lastTarget = target;
  }
}
