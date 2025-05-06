import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeTrendChartComponent } from './income-trend-chart.component';

describe('IncomeTrendChartComponent', () => {
  let component: IncomeTrendChartComponent;
  let fixture: ComponentFixture<IncomeTrendChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IncomeTrendChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IncomeTrendChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
