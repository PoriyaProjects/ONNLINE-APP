import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyLineChartComponent } from './monthly-line-chart.component';

describe('MonthlyLineChartComponent', () => {
  let component: MonthlyLineChartComponent;
  let fixture: ComponentFixture<MonthlyLineChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonthlyLineChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
