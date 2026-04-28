import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TodayDashboardComponent } from './today-dashboard.component';

describe('TodayDashboardComponent', () => {
  let component: TodayDashboardComponent;
  let fixture: ComponentFixture<TodayDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TodayDashboardComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TodayDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arrivedPercent returns 0 when no appointments', () => {
    component.summary.totalAppointments = 0;
    expect(component.arrivedPercent).toBe(0);
  });

  it('arrivedPercent calculates correctly', () => {
    component.summary.totalAppointments = 10;
    component.summary.arrived = 7;
    expect(component.arrivedPercent).toBe(70);
  });

  it('applyFilters filters arrived correctly', () => {
    component.allPatients = [
      { arrived: true } as any,
      { arrived: false } as any,
    ];
    component.filterStatus = 'arrived';
    component.applyFilters();
    expect(component.filteredPatients.length).toBe(1);
    expect(component.filteredPatients[0].arrived).toBe(true);
  });
});