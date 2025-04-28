import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PieChartComponent2 } from './pie-chart.component';

describe('PieChartComponent2', () => {
  let component: PieChartComponent2;
  let fixture: ComponentFixture<PieChartComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PieChartComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PieChartComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
