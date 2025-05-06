import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialLineChartComponent } from './financial-line-chart.component';

describe('FinancialLineChartComponent', () => {
  let component: FinancialLineChartComponent;
  let fixture: ComponentFixture<FinancialLineChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FinancialLineChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FinancialLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
