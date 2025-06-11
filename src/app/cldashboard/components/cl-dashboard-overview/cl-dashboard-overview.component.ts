import { Component, OnInit } from '@angular/core';
import { OperationalChartService } from '../../services/operational-chart.service';
import { ChartLoaderService } from '../../utils/google-charts-loader';
import { formatDateForApi } from '../../utils/api-utils';
import { DepartmentService } from '../../services/department.service';
import { map, switchMap, tap, catchError, timeout, retryWhen, scan, delay, startWith } from 'rxjs/operators';
import { throwError, of, Observable, Subject } from 'rxjs';
import { defer, combineLatest } from 'rxjs';
import { Department } from '../../models/department.model';
import { NgSelectModule } from '@ng-select/ng-select';

export interface RevenueDataPoint {
    label: string;
    value: number;
    deptGroupId: number;
    deptGroupName: string;
}

@Component({
    selector: 'app-cl-dashboard-overview',
    templateUrl: './cl-dashboard-overview.component.html'
})
export class ClDashboardOverviewComponent implements OnInit {
    isLoadingDepartments = false;
    departmentsLoadError = false;
    departments: Department[] = [];
    periods: { id: number; name: string }[] = [];

    filters = {
        param: '1',
        startDate: '2024-01-01',
        endDate: '2025-05-31',
        granularity: 'month'
    };

    rawChartData: RevenueDataPoint[] = [];
    rawChartDataFull: RevenueDataPoint[] = [];
    selectedDeptGroupId: number = 0;

    isLoading = false;

    // triggers
    private chartReloadTrigger$ = new Subject<void>();

    globalChartControls = {
        showTrendline: true,
        showAnnotations: true,
        showLegend: true,
        shortFormat: true,
        showPercentageAnnotations: false,
        showHtmlTooltip: true,
        isDarkMode: false,
        isStacked: false,
        isRtl: false,
        currency: '₪',
        locale: 'he'
    };

    granularityOptions = [
        { label: 'Monthly', value: 'month' },
        { label: 'Quarterly', value: 'quarter' },
        { label: 'Yearly', value: 'year' }
    ];

    constructor(
        private deptService: DepartmentService,
        private ops: OperationalChartService,
        private chartLoader: ChartLoaderService
    ) {}

    ngOnInit() {
        this.loadDepartments$().pipe(
            switchMap(() => this.chartLoader.ready$),
            tap(() => this.setupChartReactiveLoad()),
            tap(() => this.triggerChartReload()) // initial load!
        ).subscribe();

        this.deptService.getTimeTypes().subscribe(periodList => {
            this.periods = periodList;
            if (!this.filters.param && periodList.length > 0) {
                this.filters.param = periodList[0].id.toString();
            }
        });

        const savedGroupId = localStorage.getItem('storage.SelectedDeptGroupId');
        if (savedGroupId) {
            this.selectedDeptGroupId = parseInt(savedGroupId, 10);
        }
    }

    loadDepartments$(): Observable<Department[]> {
        this.isLoadingDepartments = true;
        this.departmentsLoadError = false;

        return this.deptService.getDepartments().pipe(
            timeout(10000),
            map((list: any) => {
                if (typeof list === 'string' && list.includes('<?xml')) {
                   // console.warn('Invalid department response (XML) → forcing retry');
                    throw new Error('Invalid department response (XML)');
                }

                if (Array.isArray(list) && list.length === 0) {
                   // console.warn('Empty department list received → forcing retry');
                    throw new Error('Empty department list');
                }

                return list as Department[];
            }),
            this.retryWithBackoff(5, 2000),
            tap((list: Department[]) => {
                this.departments = list.sort((a, b) => a.name.localeCompare(b.name));
                this.isLoadingDepartments = false;
               // console.log('Departments loaded:', this.departments);
            }),
            catchError(err => {
                console.error('Failed to load departments after retries:', err);
                this.departmentsLoadError = true;
                this.departments = [];
                this.isLoadingDepartments = false;
                return of([] as Department[]);
            })
        );
    }

    // setupChartReactiveLoad() {
    //     this.chartReloadTrigger$.pipe(
    //         startWith(void 0), // trigger first load
    //         switchMap(() => {
    //             this.isLoading = true;

    //             const { startDate, endDate, granularity } = this.filters;
    //             const apiStart = formatDateForApi(startDate);
    //             const apiEnd = formatDateForApi(endDate);
    //             const deptGroupIdParam = this.selectedDeptGroupId === 0 ? '' : this.selectedDeptGroupId.toString();

    //            // console.log('=== loadChartData ===');
    //            // console.log('DeptGroupId:', deptGroupIdParam);
    //            // console.log('Start:', apiStart, 'End:', apiEnd, 'Granularity:', granularity);

    //             return this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, deptGroupIdParam, granularity).pipe(
    //                 timeout(80000),
    //                 retryWhen(errors =>
    //                     errors.pipe(
    //                         scan((retryCount, err) => {
    //                             if (retryCount >= 10) throw err;
    //                            // console.warn(`Retrying chart load - Attempt #${retryCount + 1}`);
    //                             return retryCount + 1;
    //                         }, 0),
    //                         delay(2000)
    //                     )
    //                 )
    //             );
    //         })
    //     ).subscribe({
    //         next: (cleaned: RevenueDataPoint[]) => {
    //             this.rawChartData = cleaned;
    //            // console.log('[ClDashboardOverview] rawChartData:', this.rawChartData);

    //             localStorage.setItem('storage.SelectedDeptGroupId', this.selectedDeptGroupId.toString());
    //             this.isLoading = false;
    //         },
    //         error: (err) => {
    //             console.error('Failed to load chart data:', err);
    //             this.rawChartData = [];
    //             this.isLoading = false;
    //         }
    //     });
    // }

    setupChartReactiveLoad() {
        this.chartReloadTrigger$.pipe(
            startWith(void 0), // trigger first load
            switchMap(() => {
                this.isLoading = true;
    
                const { startDate, endDate, granularity } = this.filters;
                const apiStart = formatDateForApi(startDate);
                const apiEnd = formatDateForApi(endDate);
                const deptGroupIdParam = this.selectedDeptGroupId === 0 ? '' : this.selectedDeptGroupId.toString();
    
               // console.log('=== loadChartData ===');
               // console.log('DeptGroupId:', deptGroupIdParam);
               // console.log('Start:', apiStart, 'End:', apiEnd, 'Granularity:', granularity);
    
                // Normal chart data (filtered)
                const normalData$ = this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, deptGroupIdParam, granularity).pipe(
                    timeout(80000),
                    retryWhen(errors =>
                        errors.pipe(
                            scan((retryCount, err) => {
                                if (retryCount >= 10) throw err;
                               // console.warn(`Retrying chart load - Attempt #${retryCount + 1}`);
                                return retryCount + 1;
                            }, 0),
                            delay(2000)
                        )
                    )
                );
    
                // Full data (for CompareMonths)
                const fullData$ = this.ops.fetchTotalRevenueDataOnce(apiStart, apiEnd, '', 'month').pipe(
                    timeout(80000),
                    retryWhen(errors =>
                        errors.pipe(
                            scan((retryCount, err) => {
                                if (retryCount >= 10) throw err;
                               // console.warn(`Retrying FULL chart load - Attempt #${retryCount + 1}`);
                                return retryCount + 1;
                            }, 0),
                            delay(2000)
                        )
                    )
                );
    
                // Combine both, using defer() for Angular 9 compatibility
                return defer(() => combineLatest([normalData$, fullData$]));
            })
        ).subscribe({
            next: ([cleaned, full]) => {
                this.rawChartData = cleaned;
                this.rawChartDataFull = full;
    
               // console.log('[ClDashboardOverview] rawChartData:', this.rawChartData);
               // console.log('[ClDashboardOverview] rawChartDataFull:', this.rawChartDataFull);
    
                localStorage.setItem('storage.SelectedDeptGroupId', this.selectedDeptGroupId.toString());
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load chart data:', err);
                this.rawChartData = [];
                this.rawChartDataFull = [];
                this.isLoading = false;
            }
        });
    }
    
    triggerChartReload() {
        this.chartReloadTrigger$.next();
    }

    onGlobalControlChange() {
        this.triggerChartReload();
    }

    onDeptGroupChange(groupId: number) {
        this.selectedDeptGroupId = groupId;
        localStorage.setItem('storage.SelectedDeptGroupId', this.selectedDeptGroupId.toString());
        this.triggerChartReload();
       // console.log('Dept group changed → reload triggered');
    }

    onPeriodChange(id: string) {
        this.filters.param = id;
        this.triggerChartReload();
    }

    updateFilters(updated: any) {
        this.filters = { ...this.filters, ...updated };
        this.triggerChartReload();
    }

    getAvailableDeptGroups() {
        const uniqueGroups = Array.from(
            new Map(
                this.rawChartData
                    .filter(item => item.deptGroupId > 0)
                    .map(item => [item.deptGroupId, item.deptGroupName])
            ).entries()
        ).map(([id, name]) => ({ id, name }));

        return uniqueGroups.sort((a, b) => a.name.localeCompare(b.name));
    }

    private retryWithBackoff(maxRetry: number, delayMs: number) {
        return retryWhen(errors =>
            errors.pipe(
                scan((retryCount, err) => {
                    if (retryCount >= maxRetry) {
                        throw err;
                    }
                   // console.warn(`Retrying getDepartments() - Attempt #${retryCount + 1}`);
                    return retryCount + 1;
                }, 0),
                delay(delayMs)
            )
        );
    }
}
