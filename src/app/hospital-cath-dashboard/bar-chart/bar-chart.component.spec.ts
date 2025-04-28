import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BarChartComponent2 } from './bar-chart.component';

describe('BarChartComponent2', () => {
  let component: BarChartComponent2;
  let fixture: ComponentFixture<BarChartComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BarChartComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BarChartComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
