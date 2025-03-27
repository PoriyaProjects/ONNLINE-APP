import { Subject, from, fromEvent } from 'rxjs';
import { mergeMap, map, filter, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { EventEmitter, Directive, ElementRef, Input, Output, NgModule } from '@angular/core';

import * as ɵngcc0 from '@angular/core';
class NgxBarCodePutDirective {
    constructor(elementRef) {
        this.elementRef = elementRef;
        /**
         * Input delay
         */
        this.debounce = 0;
        /**
         * After how many characters start search
         */
        this.skipStart = 0;
        /**
         * Data cleansing event
         */
        this.onDelete = new EventEmitter();
        /**
         * Event after data entry
         */
        this.onDetected = new EventEmitter();
        /**
         * Use for unsubscribe
         */
        this.destroy$ = new Subject();
    }
    ngAfterViewInit() {
        /**
         * Often the code scanner is connected to the computer.
         * It emulates a press key, so we use keyboard events to press and release keys.
         */
        const events = ['keydown', 'keyup'];
        /**
         * Empty object for delay logic
         */
        const pressed = {};
        /**
         * Look at the
         * {@Link http://reactivex.io/documentation/operators/from.html}
         */
        from(events)
            .pipe(
        /**
         * Look at the
         * {@Link https://rxjs-dev.firebaseapp.com/api/operators/mergeMap}
         */
        mergeMap((event) => fromEvent(this.elementRef.nativeElement, event)), 
        /**
         * Prepare input data
         */
        map((event) => {
            switch (event.type) {
                case 'keydown':
                    /**
                     * Since "which" is deprecated, we use it for a temporary variable
                     * and set the processing time keydown.
                     */
                    pressed[event.which] = event.timeStamp;
                    break;
                case 'keyup':
                    /**
                     * In the delay set the difference between keydown and keyup events.
                     */
                    Object.assign(event, { duration: (event.timeStamp - pressed[event.which]) / 1000 });
                    break;
            }
            /**
             * @return {event: KeyboardEvent}
             */
            return event;
        }), filter((event) => {
            if (event.keyCode === 8 || event.code === 'Backspace' || event.which === 8) {
                /**
                 * Used to clear data.
                 */
                this.onDelete.emit({ event, value: event.target.value, type: 'delete' });
            }
            /**
             * Return data after typed in two characters.
             */
            return event.target.value.length > this.skipStart;
        }), 
        /**
         * Data entry delay is used to limit requests.
         */
        debounceTime(this.debounce), 
        /**
         * Look at the
         * {@Link http://reactivex.io/documentation/operators/distinct.html}
         */
        distinctUntilChanged())
            /**
             * Use for unsubscribe
             */
            .pipe(takeUntil(this.destroy$))
            /**
             * Subscribe to the input data and determine the delay time for our purposes.
             */
            .subscribe((event) => {
            if (event.duration > 0.02) {
                /**
                 * Keyboard input.
                 */
                this.onDetected.emit({ event, value: event.target.value, time: event.duration, type: 'keyboard' });
            }
            else if (event.duration <= 0.02) {
                /**
                 * Input from the scanner.
                 */
                this.onDetected.emit({ event, value: event.target.value, time: event.duration, type: 'scanner' });
            }
        });
    }
    /**
     * Use for unsubscribe
     */
    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
NgxBarCodePutDirective.ɵfac = function NgxBarCodePutDirective_Factory(t) { return new (t || NgxBarCodePutDirective)(ɵngcc0.ɵɵdirectiveInject(ɵngcc0.ElementRef)); };
NgxBarCodePutDirective.ɵdir = ɵngcc0.ɵɵdefineDirective({ type: NgxBarCodePutDirective, selectors: [["", "ngxBarCodePut", ""]], inputs: { debounce: "debounce", skipStart: "skipStart" }, outputs: { onDelete: "onDelete", onDetected: "onDetected" } });
NgxBarCodePutDirective.ctorParameters = () => [
    { type: ElementRef }
];
NgxBarCodePutDirective.propDecorators = {
    debounce: [{ type: Input }],
    skipStart: [{ type: Input }],
    onDelete: [{ type: Output }],
    onDetected: [{ type: Output }]
};
/*@__PURE__*/ (function () { ɵngcc0.ɵsetClassMetadata(NgxBarCodePutDirective, [{
        type: Directive,
        args: [{
                selector: '[ngxBarCodePut]'
            }]
    }], function () { return [{ type: ɵngcc0.ElementRef }]; }, { debounce: [{
            type: Input
        }], skipStart: [{
            type: Input
        }], onDelete: [{
            type: Output
        }], onDetected: [{
            type: Output
        }] }); })();

class NgxBarCodePutModule {
}
NgxBarCodePutModule.ɵmod = ɵngcc0.ɵɵdefineNgModule({ type: NgxBarCodePutModule });
NgxBarCodePutModule.ɵinj = ɵngcc0.ɵɵdefineInjector({ factory: function NgxBarCodePutModule_Factory(t) { return new (t || NgxBarCodePutModule)(); } });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && ɵngcc0.ɵɵsetNgModuleScope(NgxBarCodePutModule, { declarations: [NgxBarCodePutDirective], exports: [NgxBarCodePutDirective] }); })();
/*@__PURE__*/ (function () { ɵngcc0.ɵsetClassMetadata(NgxBarCodePutModule, [{
        type: NgModule,
        args: [{
                declarations: [NgxBarCodePutDirective],
                exports: [NgxBarCodePutDirective]
            }]
    }], null, null); })();

/*
 * Public API Surface of ngx-barcodeput
 */

/**
 * Generated bundle index. Do not edit.
 */

export { NgxBarCodePutDirective, NgxBarCodePutModule };

//# sourceMappingURL=ngx-barcodeput.js.map