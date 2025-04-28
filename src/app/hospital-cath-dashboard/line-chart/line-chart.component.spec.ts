import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LineChartComponent2 } from './line-chart.component';

describe('LineChartComponent2', () => {
  let component: LineChartComponent2;
  let fixture: ComponentFixture<LineChartComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LineChartComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LineChartComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
